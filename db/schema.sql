-- Social Poster Platform - Complete Database Schema
-- Run with: node db/migrate.js

-- Admins table (dashboard users)
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (Telegram users)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(100),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  language_code VARCHAR(10) DEFAULT 'en',
  is_bot BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  points INTEGER DEFAULT 0,
  referral_code VARCHAR(50) UNIQUE,
  referred_by INTEGER REFERENCES users(id),
  referral_count INTEGER DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  channel_id VARCHAR(255),
  channel_name VARCHAR(255) NOT NULL,
  channel_url VARCHAR(500),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_force_sub BOOLEAN DEFAULT false,
  post_count INTEGER DEFAULT 0,
  subscriber_count INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500),
  content TEXT NOT NULL,
  media_url VARCHAR(1000),
  media_type VARCHAR(50),
  link VARCHAR(1000),
  platforms TEXT[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  created_by INTEGER REFERENCES admins(id),
  telegram_message_id BIGINT,
  results JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  reward_type VARCHAR(50) NOT NULL,
  points_value INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  max_claims INTEGER,
  claim_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User rewards (claim history)
CREATE TABLE IF NOT EXISTS user_rewards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reward_id INTEGER REFERENCES rewards(id),
  reward_type VARCHAR(50),
  points_earned INTEGER DEFAULT 0,
  claimed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  referred_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  points_awarded INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- Daily bonuses
CREATE TABLE IF NOT EXISTS daily_bonuses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  points_awarded INTEGER DEFAULT 0,
  streak_day INTEGER DEFAULT 1,
  claimed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support tickets
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50) DEFAULT 'normal',
  assigned_to INTEGER REFERENCES admins(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket messages
CREATE TABLE IF NOT EXISTS ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL,
  sender_id INTEGER,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(500),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  category VARCHAR(100) DEFAULT 'general',
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  service VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled jobs
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  job_type VARCHAR(100) NOT NULL,
  cron_expression VARCHAR(100),
  run_at TIMESTAMPTZ,
  payload JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending',
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Force subscribe tracking
CREATE TABLE IF NOT EXISTS force_sub_checks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
  is_subscribed BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON user_rewards(user_id);

-- Default admin user (password: admin123 - CHANGE IN PRODUCTION)
-- Default admin: password is 'admin123' — change immediately in production
-- Hash generated with bcryptjs rounds=10
INSERT INTO admins (username, email, password_hash, role)
VALUES ('admin', 'admin@example.com', '$2a$10$DVPUGNzoCrVsJYtlJKqaj.fflicVQK8LJaZYoDUw0.pCWp4QuTp5q', 'superadmin')
ON CONFLICT (username) DO NOTHING;

-- Default settings
INSERT INTO settings (key, value, category, description) VALUES
  ('bot_name', 'SocialPosterBot', 'bot', 'Telegram bot display name'),
  ('bot_welcome_message', 'Welcome to Social Poster Bot! 🚀', 'bot', 'Welcome message for new users'),
  ('referral_points', '50', 'rewards', 'Points awarded per referral'),
  ('daily_bonus_points', '10', 'rewards', 'Points for daily check-in'),
  ('max_daily_streak', '30', 'rewards', 'Maximum daily streak bonus multiplier'),
  ('force_subscribe', 'false', 'bot', 'Require channel subscription'),
  ('maintenance_mode', 'false', 'system', 'Enable maintenance mode'),
  ('max_post_length', '4096', 'posting', 'Maximum post character length'),
  ('allow_media_uploads', 'true', 'posting', 'Allow media file uploads'),
  ('rate_limit_per_minute', '60', 'security', 'API rate limit per minute')
ON CONFLICT (key) DO NOTHING;
