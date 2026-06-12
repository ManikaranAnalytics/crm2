-- Postgres schema for CRM + Trips portal

CREATE TYPE role_name AS ENUM ('ADMIN','MANAGER','KAM');

CREATE TYPE query_status AS ENUM ('OPEN','IN_PROGRESS','ESCALATED','CLOSED','REOPENED','PENDING_FROM_CLIENT');

CREATE TYPE technology AS ENUM ('SOLAR','WIND','SOLAR_WIND','SOLAR_WIND_BATTERY','SOLAR_BATTERY','WIND_BATTERY');

CREATE TYPE request_status AS ENUM ('PENDING','APPROVED','REJECTED');

CREATE TYPE owner_type AS ENUM ('QUERY','CLIENT');

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name role_name UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id),
  rank INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INT REFERENCES users(id),
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE client_pss (
	id SERIAL PRIMARY KEY,
	client_id INT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	capacity_mw NUMERIC(10,2),
	technology technology,
	state TEXT,
	transmission_type TEXT CHECK (transmission_type IN ('STU','CTU')),
	sps BOOLEAN NOT NULL DEFAULT FALSE,
	aggregation BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMPTZ DEFAULT now(),
	updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE queries (
  id SERIAL PRIMARY KEY,
  query_code TEXT UNIQUE NOT NULL,
  client_id INT REFERENCES clients(id),
  pss_id INT,
  query_raised_date TIMESTAMPTZ,
  query_entry_date TIMESTAMPTZ,
  state TEXT,
  pss_text TEXT,
  "group" TEXT,
  capacity_mw NUMERIC(10,2),
  technology technology,
  transmission_type TEXT,
  period_of_issue TEXT,
  issue TEXT NOT NULL,
  raised_by TEXT,
  raised_by_id INT REFERENCES users(id),
  responsibility_to TEXT,
  responsibility_to_id INT REFERENCES users(id),
  current_status query_status NOT NULL DEFAULT 'OPEN',
  close_request_date TIMESTAMPTZ,
  closed_date TIMESTAMPTZ,
  delay TEXT,
  expected_closure TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE query_approvals (
  id SERIAL PRIMARY KEY,
  query_id INT NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  new_status query_status NOT NULL,
  requested_by INT NOT NULL REFERENCES users(id),
  approver_id INT NOT NULL REFERENCES users(id),
  decision request_status NOT NULL DEFAULT 'PENDING',
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  decided_at TIMESTAMPTZ
);

CREATE TABLE attachments (
  id SERIAL PRIMARY KEY,
  owner_type owner_type NOT NULL,
  owner_id INT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content_type TEXT NOT NULL,
  uploaded_by INT NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE notification_type AS ENUM ('QUERY_REPLY', 'QUERY_ASSIGNED', 'QUERY_CREATED');

CREATE TABLE query_replies (
  id SERIAL PRIMARY KEY,
  query_id INT NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  author_id INT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  attachment_id INT REFERENCES attachments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE query_reply_attachments (
  reply_id INT NOT NULL REFERENCES query_replies(id) ON DELETE CASCADE,
  attachment_id INT NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
  PRIMARY KEY (reply_id, attachment_id)
);


CREATE TABLE notifications (
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

CREATE TABLE assignment_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_assigned_user_id INT REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO assignment_state (id) VALUES (1);

CREATE INDEX IF NOT EXISTS idx_attachments_owner ON attachments(owner_type, owner_id);


