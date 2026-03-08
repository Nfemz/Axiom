-- Add updated_at column to alert_rules table (GAP-M005)
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
