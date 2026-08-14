-- =====================================================
-- GS MAILER - Complete Database Schema
-- Supabase PostgreSQL
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS (Supabase Auth handles this)
-- =====================================================
-- Users are automatically created in auth.users table
-- We'll link to it with a foreign key

-- =====================================================
-- CONTACTS (Leads)
-- =====================================================
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    lead_id TEXT NOT NULL,
    first_name TEXT,
    company TEXT,
    email TEXT NOT NULL,
    subject TEXT,
    website TEXT,
    campaign TEXT,
    status TEXT DEFAULT 'New',
    sent_on TIMESTAMP,
    error TEXT,
    lead_status TEXT DEFAULT 'New',
    notes TEXT,
    last_contact TIMESTAMP,
    website_clicked BOOLEAN DEFAULT FALSE,
    click_time TIMESTAMP,
    ab_version TEXT,
    ab_click TEXT,
    last_email_date TIMESTAMP,
    followup_stage INTEGER DEFAULT 0,
    
    -- Bounce tracking
    bounce_status BOOLEAN DEFAULT FALSE,
    bounce_type TEXT,
    bounce_date TIMESTAMP,
    bounce_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    bounce_processed BOOLEAN DEFAULT FALSE,
    
    -- Reply tracking
    reply_status TEXT,
    reply_date TIMESTAMP,
    reply_content TEXT,
    
    -- Lead scoring
    lead_score INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_campaign ON contacts(campaign);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_lead_status ON contacts(lead_status);
CREATE INDEX idx_contacts_bounce_status ON contacts(bounce_status);
CREATE INDEX idx_contacts_reply_status ON contacts(reply_status);
CREATE INDEX idx_contacts_created_at ON contacts(created_at);

-- =====================================================
-- CAMPAIGNS
-- =====================================================
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    subject_a TEXT NOT NULL,
    subject_b TEXT,
    template_a TEXT NOT NULL,
    template_b TEXT,
    followup1 TEXT,
    followup2 TEXT,
    followup3 TEXT,
    landing_page TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    sender_name TEXT,
    job_title TEXT,
    
    -- Settings
    daily_limit INTEGER DEFAULT 20,
    wait_time INTEGER DEFAULT 3000,
    
    -- Stats
    total_sent INTEGER DEFAULT 0,
    total_opens INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_bounces INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_enabled ON campaigns(enabled);

-- =====================================================
-- TEMPLATES
-- =====================================================
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    subject TEXT,
    html_content TEXT NOT NULL,
    is_followup BOOLEAN DEFAULT FALSE,
    followup_stage INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_templates_user_id ON templates(user_id);

-- =====================================================
-- ATTACHMENTS
-- =====================================================
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    description TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attachments_user_id ON attachments(user_id);

-- =====================================================
-- CAMPAIGN_ATTACHMENTS (Many-to-Many)
-- =====================================================
CREATE TABLE campaign_attachments (
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    attachment_id UUID REFERENCES attachments(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 1,
    attach BOOLEAN DEFAULT TRUE,
    
    PRIMARY KEY (campaign_id, attachment_id)
);

-- =====================================================
-- EMAIL_EVENTS
-- =====================================================
CREATE TABLE email_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL, -- 'sent', 'opened', 'clicked', 'bounced', 'replied'
    email TEXT NOT NULL,
    subject TEXT,
    ab_version TEXT,
    followup_stage INTEGER,
    
    -- Track if this was a follow-up
    is_followup BOOLEAN DEFAULT FALSE,
    
    -- Additional data
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_events_user_id ON email_events(user_id);
CREATE INDEX idx_email_events_contact_id ON email_events(contact_id);
CREATE INDEX idx_email_events_campaign_id ON email_events(campaign_id);
CREATE INDEX idx_email_events_event_type ON email_events(event_type);
CREATE INDEX idx_email_events_created_at ON email_events(created_at);

-- =====================================================
-- TRACKING_EVENTS (Click tracking)
-- =====================================================
CREATE TABLE tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    
    lead_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    ab_version TEXT,
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tracking_events_user_id ON tracking_events(user_id);
CREATE INDEX idx_tracking_events_lead_id ON tracking_events(lead_id);
CREATE INDEX idx_tracking_events_campaign_name ON tracking_events(campaign_name);
CREATE INDEX idx_tracking_events_created_at ON tracking_events(created_at);

-- =====================================================
-- BOUNCE_LOGS
-- =====================================================
CREATE TABLE bounce_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    bounce_type TEXT, -- 'Permanent', 'Temporary'
    bounce_reason TEXT,
    raw_message TEXT,
    
    processed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bounce_logs_user_id ON bounce_logs(user_id);
CREATE INDEX idx_bounce_logs_email ON bounce_logs(email);
CREATE INDEX idx_bounce_logs_processed ON bounce_logs(processed);

-- =====================================================
-- REPLY_LOGS
-- =====================================================
CREATE TABLE reply_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    intent TEXT, -- 'Interested', 'Not Interested', 'Unsubscribe', 'Other'
    
    processed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reply_logs_user_id ON reply_logs(user_id);
CREATE INDEX idx_reply_logs_email ON reply_logs(email);
CREATE INDEX idx_reply_logs_processed ON reply_logs(processed);

-- =====================================================
-- FOLLOWUP_LOGS
-- =====================================================
CREATE TABLE followup_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    
    lead_id TEXT NOT NULL,
    email TEXT NOT NULL,
    campaign_name TEXT,
    followup_stage INTEGER NOT NULL,
    result TEXT, -- 'Sent', 'Failed', 'Skipped'
    
    sent_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_followup_logs_user_id ON followup_logs(user_id);
CREATE INDEX idx_followup_logs_lead_id ON followup_logs(lead_id);

-- =====================================================
-- SETTINGS
-- =====================================================
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    key TEXT NOT NULL,
    value TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_settings_user_id ON settings(user_id);
CREATE UNIQUE INDEX idx_settings_user_key ON settings(user_id, key);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounce_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reply_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY "Users can view their own contacts" ON contacts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contacts" ON contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contacts" ON contacts
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contacts" ON contacts
    FOR DELETE USING (auth.uid() = user_id);

-- Campaigns
CREATE POLICY "Users can view their own campaigns" ON campaigns
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own campaigns" ON campaigns
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaigns" ON campaigns
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaigns" ON campaigns
    FOR DELETE USING (auth.uid() = user_id);

-- Templates
CREATE POLICY "Users can view their own templates" ON templates
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own templates" ON templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own templates" ON templates
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own templates" ON templates
    FOR DELETE USING (auth.uid() = user_id);

-- Attachments
CREATE POLICY "Users can view their own attachments" ON attachments
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own attachments" ON attachments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own attachments" ON attachments
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own attachments" ON attachments
    FOR DELETE USING (auth.uid() = user_id);

-- Campaign Attachments (inherit from campaign/attachment)
CREATE POLICY "Users can view their own campaign_attachments" ON campaign_attachments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM campaigns WHERE id = campaign_id AND user_id = auth.uid())
    );
CREATE POLICY "Users can insert their own campaign_attachments" ON campaign_attachments
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM campaigns WHERE id = campaign_id AND user_id = auth.uid())
    );
CREATE POLICY "Users can delete their own campaign_attachments" ON campaign_attachments
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM campaigns WHERE id = campaign_id AND user_id = auth.uid())
    );

-- Email Events
CREATE POLICY "Users can view their own email_events" ON email_events
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own email_events" ON email_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tracking Events
CREATE POLICY "Users can view their own tracking_events" ON tracking_events
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tracking_events" ON tracking_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bounce Logs
CREATE POLICY "Users can view their own bounce_logs" ON bounce_logs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bounce_logs" ON bounce_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reply Logs
CREATE POLICY "Users can view their own reply_logs" ON reply_logs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reply_logs" ON reply_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Followup Logs
CREATE POLICY "Users can view their own followup_logs" ON followup_logs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own followup_logs" ON followup_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Settings
CREATE POLICY "Users can view their own settings" ON settings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON settings
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own settings" ON settings
    FOR DELETE USING (auth.uid() = user_id);
