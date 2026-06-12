-- Migration: Support multiple attachments per query reply
-- Adds junction table query_reply_attachments
-- query_replies.attachment_id (single FK) is kept untouched for backward compat

CREATE TABLE IF NOT EXISTS query_reply_attachments (
  reply_id INT NOT NULL REFERENCES query_replies(id) ON DELETE CASCADE,
  attachment_id INT NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
  PRIMARY KEY (reply_id, attachment_id)
);
CREATE INDEX IF NOT EXISTS idx_qra_reply_id ON query_reply_attachments(reply_id);
