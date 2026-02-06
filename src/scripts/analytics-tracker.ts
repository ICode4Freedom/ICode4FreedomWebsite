// Analytics Tracker - Client-side tracking for blog engagement
// This runs on every page to track views, scroll depth, time on page, etc.

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

interface TrackerState {
  visitorId: string;
  sessionId: string;
  startTime: number;
  maxScroll: number;
  engagementId: string | null;
  hasTrackedView: boolean;
}

class AnalyticsTracker {
  private state: TrackerState;
  private updateInterval: number | null = null;

  constructor() {
    this.state = {
      visitorId: this.getVisitorId(),
      sessionId: this.getSessionId(),
      startTime: Date.now(),
      maxScroll: 0,
      engagementId: null,
      hasTrackedView: false
    };
  }

  init() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Analytics not configured');
      return;
    }

    // Track page view
    this.trackPageView();

    // Track scroll depth
    this.setupScrollTracking();

    // Track time on page (update every 10 seconds)
    this.updateInterval = window.setInterval(() => this.updateEngagement(), 10000);

    // Track before leaving
    window.addEventListener('beforeunload', () => this.finalUpdate());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.finalUpdate();
      }
    });

    // Track share clicks
    this.setupEventTracking();
  }

  private getVisitorId(): string {
    let visitorId = localStorage.getItem('_vid');
    if (!visitorId) {
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset()
      ].join('|');
      visitorId = this.hashString(fingerprint);
      localStorage.setItem('_vid', visitorId);
    }
    return visitorId;
  }

  private getSessionId(): string {
    const SESSION_TIMEOUT = 30 * 60 * 1000;
    const now = Date.now();
    
    let sessionData = sessionStorage.getItem('_sid');
    if (sessionData) {
      try {
        const { id, lastActive } = JSON.parse(sessionData);
        if (now - lastActive < SESSION_TIMEOUT) {
          sessionStorage.setItem('_sid', JSON.stringify({ id, lastActive: now }));
          return id;
        }
      } catch {}
    }
    
    const newId = `${now}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('_sid', JSON.stringify({ id: newId, lastActive: now }));
    return newId;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private async trackPageView() {
    if (this.state.hasTrackedView) return;
    this.state.hasTrackedView = true;

    const data = {
      page_path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer || null,
      visitor_id: this.state.visitorId,
      session_id: this.state.sessionId,
      user_agent: navigator.userAgent,
      screen_width: screen.width,
      screen_height: screen.height
    };

    await this.sendToSupabase('page_views', data);

    // Create initial engagement record
    const engagementData = {
      page_path: window.location.pathname,
      visitor_id: this.state.visitorId,
      session_id: this.state.sessionId,
      time_on_page: 0,
      max_scroll_depth: 0,
      read_complete: false,
      bounced: true
    };

    const result = await this.sendToSupabase('page_engagement', engagementData, true);
    if (result?.id) {
      this.state.engagementId = result.id;
    }
  }

  private setupScrollTracking() {
    const updateScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      
      if (scrollPercent > this.state.maxScroll) {
        this.state.maxScroll = scrollPercent;
      }
    };

    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll(); // Initial check
  }

  private async updateEngagement() {
    if (!this.state.engagementId) return;

    const timeOnPage = Math.round((Date.now() - this.state.startTime) / 1000);
    const readComplete = this.state.maxScroll >= 90;
    const bounced = this.state.maxScroll < 25 && timeOnPage < 10;

    await this.updateSupabase('page_engagement', this.state.engagementId, {
      time_on_page: timeOnPage,
      max_scroll_depth: this.state.maxScroll,
      read_complete: readComplete,
      bounced: bounced,
      updated_at: new Date().toISOString()
    });
  }

  private finalUpdate() {
    if (!this.state.engagementId) return;

    const timeOnPage = Math.round((Date.now() - this.state.startTime) / 1000);
    const readComplete = this.state.maxScroll >= 90;
    const bounced = this.state.maxScroll < 25 && timeOnPage < 10;

    // Use sendBeacon for reliability on page exit
    const url = `${SUPABASE_URL}/rest/v1/page_engagement?id=eq.${this.state.engagementId}`;
    const data = JSON.stringify({
      time_on_page: timeOnPage,
      max_scroll_depth: this.state.maxScroll,
      read_complete: readComplete,
      bounced: bounced,
      updated_at: new Date().toISOString()
    });

    navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }));
  }

  private setupEventTracking() {
    // Track share button clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Share button
      if (target.id === 'share-btn' || target.closest('#share-btn')) {
        this.trackEvent('share', { platform: 'twitter' });
      }
      
      // Subscribe form submission
      if (target.closest('.subscribe-inline button[type="submit"]')) {
        this.trackEvent('subscribe', {});
      }
      
      // External links
      const link = target.closest('a') as HTMLAnchorElement;
      if (link && link.hostname !== window.location.hostname) {
        this.trackEvent('external_link', { url: link.href });
      }
    });

    // Track form submissions for subscribe
    document.querySelectorAll('.subscribe-inline').forEach(form => {
      form.addEventListener('submit', () => {
        this.trackEvent('subscribe', {});
      });
    });
  }

  async trackEvent(eventType: string, eventData: Record<string, any>) {
    const data = {
      event_type: eventType,
      page_path: window.location.pathname,
      visitor_id: this.state.visitorId,
      session_id: this.state.sessionId,
      event_data: eventData
    };

    await this.sendToSupabase('analytics_events', data);
  }

  private async sendToSupabase(table: string, data: Record<string, any>, returnData = false): Promise<any> {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': returnData ? 'return=representation' : 'return=minimal'
        },
        body: JSON.stringify(data)
      });

      if (returnData && response.ok) {
        const result = await response.json();
        return result[0];
      }
    } catch (error) {
      console.error('Analytics error:', error);
    }
    return null;
  }

  private async updateSupabase(table: string, id: string, data: Record<string, any>) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Analytics update error:', error);
    }
  }
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  const tracker = new AnalyticsTracker();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => tracker.init());
  } else {
    tracker.init();
  }
}

export { AnalyticsTracker };
