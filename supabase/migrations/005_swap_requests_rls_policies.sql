-- Migration: 005_swap_requests_rls_policies.sql
-- Fix RLS policies for swap_requests table to allow:
-- 1. Requester to update their own requests
-- 2. Target user to update requests where they are the target (to accept/decline)
-- 3. WFM and TL roles to update any swap request (for approvals)

-- First, drop any existing policies on swap_requests to avoid conflicts
DROP POLICY IF EXISTS "Users can view swap requests they're involved in" ON swap_requests;
DROP POLICY IF EXISTS "Users can create swap requests" ON swap_requests;
DROP POLICY IF EXISTS "Users can update swap requests they're involved in" ON swap_requests;
DROP POLICY IF EXISTS "Managers can view all swap requests" ON swap_requests;
DROP POLICY IF EXISTS "Managers can update all swap requests" ON swap_requests;

-- SELECT policy: Users can view swap requests they're involved in, managers can see all
CREATE POLICY "Users can view swap requests they're involved in" ON swap_requests
FOR SELECT USING (
  auth.uid() = requester_id 
  OR auth.uid() = target_user_id
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('wfm', 'tl'))
);

-- INSERT policy: Any authenticated user can create a swap request
CREATE POLICY "Users can create swap requests" ON swap_requests
FOR INSERT WITH CHECK (
  auth.uid() = requester_id
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('wfm', 'tl'))
);

-- UPDATE policy: Users involved in the request or managers can update
-- This allows:
-- - Requester to cancel/modify their request
-- - Target user to accept/decline the request
-- - TL/WFM to approve/reject the request
CREATE POLICY "Users can update swap requests they're involved in" ON swap_requests
FOR UPDATE USING (
  auth.uid() = requester_id 
  OR auth.uid() = target_user_id
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('wfm', 'tl'))
);

-- DELETE policy: Only the requester can delete their own request (if needed)
CREATE POLICY "Users can delete their own swap requests" ON swap_requests
FOR DELETE USING (
  auth.uid() = requester_id
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('wfm', 'tl'))
);
