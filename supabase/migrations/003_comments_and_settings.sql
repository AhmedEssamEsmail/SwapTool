-- Create comments table for leave and swap request discussions
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('leave', 'swap')),
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings table for application configuration
CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_request ON comments(request_id, request_type);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Insert default WFM auto-approve setting (disabled by default)
INSERT INTO settings (key, value) 
VALUES ('wfm_auto_approve', 'false')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security on comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Comments policies
-- Anyone can view comments on requests they're involved with
CREATE POLICY "Users can view comments on their requests" ON comments
    FOR SELECT
    USING (
        -- User is the commenter
        auth.uid() = user_id
        OR
        -- User is involved in a leave request
        (request_type = 'leave' AND EXISTS (
            SELECT 1 FROM leave_requests lr 
            WHERE lr.id = comments.request_id 
            AND lr.user_id = auth.uid()
        ))
        OR
        -- User is involved in a swap request
        (request_type = 'swap' AND EXISTS (
            SELECT 1 FROM swap_requests sr 
            WHERE sr.id = comments.request_id 
            AND (sr.requester_id = auth.uid() OR sr.target_user_id = auth.uid())
        ))
        OR
        -- User is TL or WFM (managers can see all)
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('tl', 'wfm')
        )
    );

-- Users can insert comments on requests they're involved with
CREATE POLICY "Users can add comments" ON comments
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND (
            -- Leave request commenter is requester, TL, or WFM
            (request_type = 'leave' AND (
                EXISTS (
                    SELECT 1 FROM leave_requests lr 
                    WHERE lr.id = request_id 
                    AND lr.user_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role IN ('tl', 'wfm')
                )
            ))
            OR
            -- Swap request commenter is requester, target, TL, or WFM
            (request_type = 'swap' AND (
                EXISTS (
                    SELECT 1 FROM swap_requests sr 
                    WHERE sr.id = request_id 
                    AND (sr.requester_id = auth.uid() OR sr.target_user_id = auth.uid())
                )
                OR EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role IN ('tl', 'wfm')
                )
            ))
        )
    );

-- Settings policies - only WFM can manage settings
CREATE POLICY "Anyone can view settings" ON settings
    FOR SELECT
    USING (true);

CREATE POLICY "Only WFM can update settings" ON settings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'wfm'
        )
    );

CREATE POLICY "Only WFM can insert settings" ON settings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'wfm'
        )
    );
