-- Migration: 006_swap_requests_original_shift_info.sql
-- Add columns to store original shift information at the time of request creation
-- This prevents data display issues after the swap is executed

ALTER TABLE swap_requests 
ADD COLUMN IF NOT EXISTS requester_original_date date,
ADD COLUMN IF NOT EXISTS requester_original_shift_type shift_type,
ADD COLUMN IF NOT EXISTS target_original_date date,
ADD COLUMN IF NOT EXISTS target_original_shift_type shift_type;

-- Add comments for documentation
COMMENT ON COLUMN swap_requests.requester_original_date IS 'Original date of the requester shift at time of request creation';
COMMENT ON COLUMN swap_requests.requester_original_shift_type IS 'Original shift type of the requester shift at time of request creation';
COMMENT ON COLUMN swap_requests.target_original_date IS 'Original date of the target shift at time of request creation';
COMMENT ON COLUMN swap_requests.target_original_shift_type IS 'Original shift type of the target shift at time of request creation';
