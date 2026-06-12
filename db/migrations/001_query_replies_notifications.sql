-- Query replies, notifications, and auto-assignment round-robin state

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('QUERY_REPLY', 'QUERY_ASSIGNED', 'QUERY_CREATED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS query_replies (
  id SERIAL PRIMARY KEY,
  query_id INT NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  author_id INT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  attachment_id INT REFERENCES attachments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_id INT REFERENCES queries(id) ON DELETE CASCADE,
  reply_id INT REFERENCES query_replies(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignment_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_assigned_user_id INT REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO assignment_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_query_replies_query_id ON query_replies(query_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
