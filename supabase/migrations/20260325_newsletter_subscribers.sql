-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'universal-transmissions',
  confirmed BOOLEAN DEFAULT FALSE
);

-- RLS: anyone can subscribe, service role can read
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (subscribe)
CREATE POLICY "Anyone can subscribe"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

-- Allow service role to read all
CREATE POLICY "Service role can read"
  ON newsletter_subscribers FOR SELECT
  USING (true);
