-- User preferences (personal settings per user)
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  -- Apparence
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  sidebar_default_open BOOLEAN NOT NULL DEFAULT false,
  items_per_page INTEGER NOT NULL DEFAULT 20 CHECK (items_per_page IN (10,20,50)),
  -- Notifications personnelles
  notif_in_app BOOLEAN NOT NULL DEFAULT true,
  notif_email_digest BOOLEAN NOT NULL DEFAULT false,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Seed preferences for all existing users
INSERT INTO user_preferences (user_id)
SELECT id FROM profiles
ON CONFLICT DO NOTHING;
