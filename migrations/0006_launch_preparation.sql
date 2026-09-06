-- Approved launch policy. Public submissions still fail closed without Turnstile.
UPDATE site_settings SET value='true',updated_at=CURRENT_TIMESTAMP WHERE key='forms_enabled';
UPDATE site_settings SET value='false',updated_at=CURRENT_TIMESTAMP WHERE key='payments_enabled';
UPDATE site_settings SET value='2026-09-06-v1',updated_at=CURRENT_TIMESTAMP WHERE key='consent_version';
ALTER TABLE collaborators ADD COLUMN relationship_ended_at TEXT;
ALTER TABLE collaborators ADD COLUMN retention_hold_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE sponsorship_enquiries ADD COLUMN updated_at TEXT;
ALTER TABLE sponsorship_enquiries ADD COLUMN retention_hold_reason TEXT NOT NULL DEFAULT '';
CREATE TABLE retention_policy (category TEXT PRIMARY KEY, months INTEGER NOT NULL, trigger_description TEXT NOT NULL);
INSERT INTO retention_policy VALUES
('inactive_collaboration',24,'Last meaningful contact; review before deletion'),
('active_collaboration',24,'Relationship ended; retain during active relationship'),
('unsuccessful_sponsorship',24,'Last meaningful contact; review before deletion'),
('transactional_email',12,'Created date; provider retention must also be checked'),
('admin_audit',24,'Created date, subject to documented legal hold');
INSERT INTO site_settings(key,value) VALUES ('security_log_retention_days','90'),('legal_policy_version','2026-09-06-v1');
