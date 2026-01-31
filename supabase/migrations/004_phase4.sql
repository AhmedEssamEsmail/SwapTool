-- Phase 4: Schedule View, CSV Upload, Leave Balances, and System Comments
-- Migration: 004_phase4.sql

-- Add swap tracking columns to shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS swapped_with_user_id UUID REFERENCES users(id);
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS original_user_id UUID REFERENCES users(id);

-- Create leave_balances table
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL, -- annual, casual, sick, public_holiday, bereavement
  balance DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, leave_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leave_balances_user_id ON leave_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts(user_id);

-- Create leave_balance_history table for tracking changes
CREATE TABLE IF NOT EXISTS leave_balance_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL,
  change_amount DECIMAL(5,2) NOT NULL,
  reason VARCHAR(255) NOT NULL, -- 'monthly_accrual', 'leave_taken', 'manual_adjustment', 'leave_request_approved', 'leave_request_cancelled'
  reference_id UUID, -- Optional: reference to leave_request_id if applicable
  balance_before DECIMAL(5,2) NOT NULL,
  balance_after DECIMAL(5,2) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for history lookups
CREATE INDEX IF NOT EXISTS idx_leave_balance_history_user_id ON leave_balance_history(user_id);

-- Add is_system column to comments table to distinguish system-generated comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- Function to initialize leave balances for a new user
CREATE OR REPLACE FUNCTION initialize_user_leave_balances()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize all leave types with 0 balance
  INSERT INTO leave_balances (user_id, leave_type, balance)
  VALUES 
    (NEW.id, 'annual', 0),
    (NEW.id, 'casual', 0),
    (NEW.id, 'sick', 0),
    (NEW.id, 'public_holiday', 0),
    (NEW.id, 'bereavement', 0)
  ON CONFLICT (user_id, leave_type) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-initialize leave balances for new users
DROP TRIGGER IF EXISTS trigger_init_leave_balances ON users;
CREATE TRIGGER trigger_init_leave_balances
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_leave_balances();

-- Initialize leave balances for existing users
INSERT INTO leave_balances (user_id, leave_type, balance)
SELECT u.id, lt.leave_type, 0
FROM users u
CROSS JOIN (
  VALUES ('annual'), ('casual'), ('sick'), ('public_holiday'), ('bereavement')
) AS lt(leave_type)
ON CONFLICT (user_id, leave_type) DO NOTHING;

-- Function for monthly accrual (can be called by cron job or manually)
-- Adds +1.25 annual and +0.5 casual at the start of each month
CREATE OR REPLACE FUNCTION accrue_monthly_leave_balances()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM users LOOP
    -- Accrue annual leave (+1.25)
    UPDATE leave_balances 
    SET balance = balance + 1.25,
        updated_at = NOW()
    WHERE user_id = user_record.id AND leave_type = 'annual';
    
    -- Record in history
    INSERT INTO leave_balance_history (user_id, leave_type, change_amount, reason, balance_before, balance_after)
    SELECT 
      user_record.id, 
      'annual', 
      1.25, 
      'monthly_accrual',
      lb.balance - 1.25,
      lb.balance
    FROM leave_balances lb
    WHERE lb.user_id = user_record.id AND lb.leave_type = 'annual';
    
    -- Accrue casual leave (+0.5)
    UPDATE leave_balances 
    SET balance = balance + 0.5,
        updated_at = NOW()
    WHERE user_id = user_record.id AND leave_type = 'casual';
    
    -- Record in history
    INSERT INTO leave_balance_history (user_id, leave_type, change_amount, reason, balance_before, balance_after)
    SELECT 
      user_record.id, 
      'casual', 
      0.5, 
      'monthly_accrual',
      lb.balance - 0.5,
      lb.balance
    FROM leave_balances lb
    WHERE lb.user_id = user_record.id AND lb.leave_type = 'casual';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comment on the accrual function for documentation
COMMENT ON FUNCTION accrue_monthly_leave_balances() IS 
'Monthly leave accrual function. Should be called on the 1st of each month via cron job or pg_cron.
Adds +1.25 annual leave and +0.5 casual leave to all users.
Example cron setup with pg_cron:
  SELECT cron.schedule(''monthly-leave-accrual'', ''0 0 1 * *'', ''SELECT accrue_monthly_leave_balances()'');
Or call manually: SELECT accrue_monthly_leave_balances();';

-- Enable RLS on new tables
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balance_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for leave_balances
CREATE POLICY "Users can view own balances" ON leave_balances
  FOR SELECT USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('tl', 'wfm'))
  );

CREATE POLICY "WFM can update all balances" ON leave_balances
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'wfm')
  );

CREATE POLICY "WFM can insert balances" ON leave_balances
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'wfm')
  );

-- RLS policies for leave_balance_history
CREATE POLICY "Users can view own history" ON leave_balance_history
  FOR SELECT USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('tl', 'wfm'))
  );

CREATE POLICY "System and WFM can insert history" ON leave_balance_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'wfm')
    OR created_by IS NULL -- Allow system insertions
  );
