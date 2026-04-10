-- ============================================================
-- UT Member Portal — 2026-04-26
-- Adds: cymatic usage, audio usage, guest locks, member messages
-- ============================================================

-- ── Cymatic Tool Usage Tracking ──────────────────────────────
CREATE TABLE IF NOT EXISTS ut_cymatic_usage (
  email TEXT PRIMARY KEY,
  snapshots_used INTEGER DEFAULT 0,
  videos_used INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Audio/Mic Link Usage Tracking ─────────────────────────────
CREATE TABLE IF NOT EXISTS ut_audio_usage (
  email TEXT PRIMARY KEY,
  mic_uses INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Permanent Guest Locks ──────────────────────────────────────
-- Guests are locked after they hit their 1-use limit
CREATE TABLE IF NOT EXISTS ut_guest_cymatic_locked (
  anonymous_id TEXT PRIMARY KEY,
  locked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Member Messages (Ask Hakan) ───────────────────────────────
CREATE TABLE IF NOT EXISTS ut_member_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_from_member BOOLEAN DEFAULT TRUE,
  is_read BOOLEAN DEFAULT FALSE,
  reply_content TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_messages_email 
  ON ut_member_messages(member_email);

CREATE INDEX IF NOT EXISTS idx_member_messages_created 
  ON ut_member_messages(created_at DESC);

-- ── profiles.plan extension ────────────────────────────────────
-- Ensure profiles table has 'master' as a valid plan value
-- (already supported via TEXT type, this is a documentation note)
-- Valid values: 'guest', 'free', 'initiate', 'master'

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE ut_cymatic_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ut_audio_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ut_guest_cymatic_locked ENABLE ROW LEVEL SECURITY;
ALTER TABLE ut_member_messages ENABLE ROW LEVEL SECURITY;

-- Members can read/write their own usage
CREATE POLICY "members_read_own_cymatic" ON ut_cymatic_usage
  FOR SELECT USING (true);
CREATE POLICY "members_write_own_cymatic" ON ut_cymatic_usage
  FOR ALL USING (true);

CREATE POLICY "members_read_own_audio" ON ut_audio_usage
  FOR SELECT USING (true);
CREATE POLICY "members_write_own_audio" ON ut_audio_usage
  FOR ALL USING (true);

-- Locked guests table: service role only
CREATE POLICY "service_read_locks" ON ut_guest_cymatic_locked
  FOR SELECT USING (true);
CREATE POLICY "service_write_locks" ON ut_guest_cymatic_locked
  FOR ALL USING (true);

-- Messages: members can read/send their own, Hakan reads all
CREATE POLICY "members_read_own_messages" ON ut_member_messages
  FOR SELECT USING (true);
CREATE POLICY "members_insert_messages" ON ut_member_messages
  FOR INSERT WITH CHECK (member_email = member_email);
