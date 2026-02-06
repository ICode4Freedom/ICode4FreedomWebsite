-- Analytics Schema for ICode4Freedom Blog
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Page Views table - tracks every page view
CREATE TABLE IF NOT EXISTS page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  visitor_id TEXT NOT NULL,  -- fingerprint-based, no cookies
  session_id TEXT NOT NULL,
  user_agent TEXT,
  screen_width INT,
  screen_height INT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Page Engagement table - tracks time on page, scroll depth
CREATE TABLE IF NOT EXISTS page_engagement (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  time_on_page INT DEFAULT 0,  -- seconds
  max_scroll_depth INT DEFAULT 0,  -- percentage 0-100
  read_complete BOOLEAN DEFAULT FALSE,  -- scrolled 90%+
  bounced BOOLEAN DEFAULT TRUE,  -- left without 25% scroll
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Events table - tracks shares, subscribes, clicks
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,  -- 'share', 'subscribe', 'click', etc.
  page_path TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_data JSONB,  -- flexible additional data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Daily aggregates - for faster dashboard queries
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  page_path TEXT NOT NULL,
  views INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  avg_time_on_page INT DEFAULT 0,
  avg_scroll_depth INT DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  shares INT DEFAULT 0,
  subscribes INT DEFAULT 0,
  UNIQUE(date, page_path)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_engagement_path ON page_engagement(page_path);
CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_path ON analytics_events(page_path);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);

-- Enable Row Level Security (RLS)
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Policies: Allow anonymous inserts (for tracking), authenticated reads (for admin)
-- Insert policies (public can insert)
CREATE POLICY "Allow public insert on page_views" ON page_views
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public insert on page_engagement" ON page_engagement
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public update on page_engagement" ON page_engagement
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow public insert on analytics_events" ON analytics_events
  FOR INSERT TO anon WITH CHECK (true);

-- Read policies (only authenticated users can read)
CREATE POLICY "Allow authenticated read on page_views" ON page_views
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on page_engagement" ON page_engagement
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on analytics_events" ON analytics_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on daily_stats" ON daily_stats
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated write on daily_stats" ON daily_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Function to aggregate daily stats (run via cron or manually)
CREATE OR REPLACE FUNCTION aggregate_daily_stats(target_date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO daily_stats (date, page_path, views, unique_visitors, avg_time_on_page, avg_scroll_depth, bounce_rate, shares, subscribes)
  SELECT 
    target_date,
    pv.page_path,
    COUNT(pv.id) as views,
    COUNT(DISTINCT pv.visitor_id) as unique_visitors,
    COALESCE(AVG(pe.time_on_page), 0)::INT as avg_time_on_page,
    COALESCE(AVG(pe.max_scroll_depth), 0)::INT as avg_scroll_depth,
    COALESCE(
      (COUNT(CASE WHEN pe.bounced = true THEN 1 END)::DECIMAL / NULLIF(COUNT(pe.id), 0) * 100),
      0
    ) as bounce_rate,
    COALESCE((SELECT COUNT(*) FROM analytics_events ae WHERE ae.page_path = pv.page_path AND ae.event_type = 'share' AND DATE(ae.created_at) = target_date), 0) as shares,
    COALESCE((SELECT COUNT(*) FROM analytics_events ae WHERE ae.page_path = pv.page_path AND ae.event_type = 'subscribe' AND DATE(ae.created_at) = target_date), 0) as subscribes
  FROM page_views pv
  LEFT JOIN page_engagement pe ON pv.page_path = pe.page_path AND pv.session_id = pe.session_id
  WHERE DATE(pv.created_at) = target_date
  GROUP BY pv.page_path
  ON CONFLICT (date, page_path) 
  DO UPDATE SET
    views = EXCLUDED.views,
    unique_visitors = EXCLUDED.unique_visitors,
    avg_time_on_page = EXCLUDED.avg_time_on_page,
    avg_scroll_depth = EXCLUDED.avg_scroll_depth,
    bounce_rate = EXCLUDED.bounce_rate,
    shares = EXCLUDED.shares,
    subscribes = EXCLUDED.subscribes;
END;
$$ LANGUAGE plpgsql;
