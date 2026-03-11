-- add_user_profile_columns.sql
-- run this script against the MySQL database to add new fields used by settings API

ALTER TABLE users
  ADD COLUMN avatar VARCHAR(1024) NULL,
  ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'Member',
  ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'UTC';
