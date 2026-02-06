import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://kfggnsmgpuakjzrhzkwp.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn('Supabase anon key not configured. Analytics will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our analytics
export interface PageView {
  page_path: string;
  page_title?: string;
  referrer?: string;
  visitor_id: string;
  session_id: string;
  user_agent?: string;
  screen_width?: number;
  screen_height?: number;
}

export interface PageEngagement {
  page_path: string;
  visitor_id: string;
  session_id: string;
  time_on_page?: number;
  max_scroll_depth?: number;
  read_complete?: boolean;
  bounced?: boolean;
}

export interface AnalyticsEvent {
  event_type: 'share' | 'subscribe' | 'click' | 'external_link';
  page_path: string;
  visitor_id: string;
  session_id: string;
  event_data?: Record<string, any>;
}

// Helper to generate visitor ID (fingerprint-based, stored in localStorage)
export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  
  let visitorId = localStorage.getItem('_vid');
  if (!visitorId) {
    // Simple fingerprint based on available data
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 10, 10);
    const canvasData = canvas.toDataURL();
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      canvasData.slice(-50)
    ].join('|');
    
    visitorId = hashString(fingerprint);
    localStorage.setItem('_vid', visitorId);
  }
  return visitorId;
}

// Helper to get/create session ID (expires after 30 min inactivity)
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const now = Date.now();
  
  let sessionData = sessionStorage.getItem('_sid');
  if (sessionData) {
    const { id, lastActive } = JSON.parse(sessionData);
    if (now - lastActive < SESSION_TIMEOUT) {
      sessionStorage.setItem('_sid', JSON.stringify({ id, lastActive: now }));
      return id;
    }
  }
  
  // Create new session
  const newId = `${now}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem('_sid', JSON.stringify({ id: newId, lastActive: now }));
  return newId;
}

// Simple hash function
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
