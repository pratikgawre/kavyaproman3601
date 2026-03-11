-- Run this against kavyaprodb to add difficulty column if it doesn't exist
ALTER TABLE issues
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50);

-- Verify
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'issues' AND COLUMN_NAME = 'difficulty';
