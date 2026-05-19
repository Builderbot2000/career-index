-- 021_job_postings_archived_at.sql
-- Adds archived_at column to job_postings to support true auto-expire.
-- Non-null = archived (hidden from default JobBoard, surfaced only in archive view).
-- The startup retention sweep sets this for stale new/viewed postings.
-- Tracker-pipeline statuses (favorited, applied, interviewing, offer, rejected, ghosted)
-- are protected and never get archived.

ALTER TABLE job_postings ADD COLUMN archived_at TEXT;
CREATE INDEX IF NOT EXISTS idx_job_postings_archived_at ON job_postings(archived_at);
