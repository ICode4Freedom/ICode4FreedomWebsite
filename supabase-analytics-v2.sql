-- Analytics V2: Heatmaps, A/B Testing, Scroll Depth
-- Run this in Supabase SQL Editor

-- 1. Click Tracking (for Heatmaps)
CREATE TABLE IF NOT EXISTS click_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  x_percent DECIMAL(5,2) NOT NULL,  -- Click X position as % of viewport width
  y_percent DECIMAL(5,2) NOT NULL,  -- Click Y position as % of page height
  element_tag TEXT,                  -- Tag name of clicked element
  element_text TEXT,                 -- First 100 chars of element text
  viewport_width INT,
  viewport_height INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. A/B Test Definitions
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  test_name TEXT NOT NULL,
  variant_a TEXT NOT NULL,           -- Original title
  variant_b TEXT NOT NULL,           -- Test title
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_path, test_name)
);

-- 3. A/B Test Results
CREATE TABLE IF NOT EXISTS ab_test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES ab_tests(id),
  page_path TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  variant TEXT NOT NULL,             -- 'A' or 'B'
  engaged BOOLEAN DEFAULT false,     -- Did they scroll 50%+?
  time_on_page INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Scroll Depth Buckets (for visualization)
CREATE TABLE IF NOT EXISTS scroll_depth_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  date DATE NOT NULL,
  depth_0_25 INT DEFAULT 0,          -- Visitors who scrolled 0-25%
  depth_25_50 INT DEFAULT 0,         -- Visitors who scrolled 25-50%
  depth_50_75 INT DEFAULT 0,         -- Visitors who scrolled 50-75%
  depth_75_100 INT DEFAULT 0,        -- Visitors who scrolled 75-100%
  UNIQUE(page_path, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_click_events_path ON click_events(page_path);
CREATE INDEX IF NOT EXISTS idx_click_events_created ON click_events(created_at);
CREATE INDEX IF NOT EXISTS idx_ab_results_test ON ab_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_scroll_stats_path ON scroll_depth_stats(page_path);

-- RLS Policies
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scroll_depth_stats ENABLE ROW LEVEL SECURITY;

-- Public insert for tracking
CREATE POLICY "Allow public insert on click_events" ON click_events
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public insert on ab_test_results" ON ab_test_results
  FOR INSERT TO anon WITH CHECK (true);

-- Authenticated read for admin
CREATE POLICY "Allow authenticated read on click_events" ON click_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated all on ab_tests" ON ab_tests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read on ab_test_results" ON ab_test_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated all on scroll_depth_stats" ON scroll_depth_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public read for ab_tests (needed to get active tests)
CREATE POLICY "Allow public read active ab_tests" ON ab_tests
  FOR SELECT TO anon USING (is_active = true);
