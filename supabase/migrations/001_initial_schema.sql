-- Migration: Initial schema for CNY Plow Report
-- Run this in Supabase SQL Editor or via CLI

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ENUM types
CREATE TYPE road_condition AS ENUM ('clear', 'wet', 'slush', 'snow', 'ice', 'whiteout');
CREATE TYPE passability AS ENUM ('ok', 'slow', 'avoid');
CREATE TYPE county AS ENUM ('onondaga', 'oswego', 'madison', 'cayuga', 'oneida', 'cortland');
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE report_status AS ENUM ('active', 'hidden', 'deleted');
CREATE TYPE flag_reason AS ENUM ('spam', 'inaccurate', 'inappropriate', 'privacy', 'other');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    role user_role DEFAULT 'user',
    trust_score INTEGER DEFAULT 0,
    report_count INTEGER DEFAULT 0,
    accurate_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    banned_at TIMESTAMPTZ,
    ban_reason TEXT,
    
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- Reports table (main content)
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Location
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    location_name TEXT,
    county county NOT NULL,
    road_name TEXT,
    
    -- Condition
    condition road_condition NOT NULL,
    passability passability NOT NULL,
    notes TEXT,
    
    -- Photos
    photo_urls TEXT[] DEFAULT '{}',
    
    -- Engagement
    upvote_count INTEGER DEFAULT 0,
    confirmation_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    flag_count INTEGER DEFAULT 0,
    
    -- Confidence scoring
    confidence_score FLOAT DEFAULT 0.5,
    
    -- Status
    status report_status DEFAULT 'active',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_confirmed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '4 hours'),
    
    CONSTRAINT notes_length CHECK (char_length(notes) <= 500)
);

-- Upvotes
CREATE TABLE public.upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(report_id, user_id)
);

-- Confirmations
CREATE TABLE public.confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(report_id, user_id)
);

-- Comments
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 280)
);

-- Flags
CREATE TABLE public.flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason flag_reason NOT NULL,
    details TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(report_id, user_id)
);

-- Plow routes (for future official data)
CREATE TABLE public.plow_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_geometry GEOGRAPHY(LINESTRING, 4326),
    route_name TEXT,
    county county,
    municipality TEXT,
    last_plowed_at TIMESTAMPTZ,
    source TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reports_location ON public.reports USING GIST(location);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX idx_reports_county ON public.reports(county);
CREATE INDEX idx_reports_condition ON public.reports(condition);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_expires ON public.reports(expires_at) WHERE status = 'active';
CREATE INDEX idx_reports_confidence ON public.reports(confidence_score DESC);
CREATE INDEX idx_reports_feed ON public.reports(created_at DESC, county, status) WHERE status = 'active';
CREATE INDEX idx_reports_active_location ON public.reports USING GIST(location) WHERE status = 'active';

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_trust ON public.profiles(trust_score DESC);

CREATE INDEX idx_comments_report ON public.comments(report_id, created_at);
CREATE INDEX idx_flags_report ON public.flags(report_id) WHERE reviewed_at IS NULL;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles
CREATE POLICY "Profiles viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Reports
CREATE POLICY "Active reports viewable by everyone" ON public.reports
    FOR SELECT USING (status = 'active' OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert reports" ON public.reports
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        AND NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND banned_at IS NOT NULL
        )
    );

-- Upvotes
CREATE POLICY "Upvotes viewable by everyone" ON public.upvotes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own upvotes" ON public.upvotes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own upvotes" ON public.upvotes
    FOR DELETE USING (auth.uid() = user_id);

-- Confirmations
CREATE POLICY "Confirmations viewable by everyone" ON public.confirmations
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own confirmations" ON public.confirmations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comments
CREATE POLICY "Comments viewable by everyone" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Flags
CREATE POLICY "Users can insert own flags" ON public.flags
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Moderators can view all flags" ON public.flags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('moderator', 'admin')
        )
    );

-- Functions

-- Increment report count for user
CREATE OR REPLACE FUNCTION increment_report_count(user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET report_count = report_count + 1
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update counters on upvote
CREATE OR REPLACE FUNCTION update_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.reports SET upvote_count = upvote_count + 1 WHERE id = NEW.report_id;
        -- Also update reporter's trust score
        UPDATE public.profiles SET trust_score = trust_score + 1 
        WHERE id = (SELECT user_id FROM public.reports WHERE id = NEW.report_id);
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.reports SET upvote_count = upvote_count - 1 WHERE id = OLD.report_id;
        UPDATE public.profiles SET trust_score = GREATEST(0, trust_score - 1) 
        WHERE id = (SELECT user_id FROM public.reports WHERE id = OLD.report_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_upvote_change
AFTER INSERT OR DELETE ON public.upvotes
FOR EACH ROW EXECUTE FUNCTION update_upvote_count();

-- Update counters on confirmation
CREATE OR REPLACE FUNCTION update_confirmation_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.reports 
    SET 
        confirmation_count = confirmation_count + 1,
        last_confirmed_at = NOW(),
        -- Extend expiration by 1 hour on confirmation
        expires_at = GREATEST(expires_at, NOW() + INTERVAL '1 hour')
    WHERE id = NEW.report_id;
    
    -- Boost reporter's trust score more for confirmations
    UPDATE public.profiles 
    SET 
        trust_score = trust_score + 3,
        accurate_count = accurate_count + 1
    WHERE id = (SELECT user_id FROM public.reports WHERE id = NEW.report_id);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_confirmation_insert
AFTER INSERT ON public.confirmations
FOR EACH ROW EXECUTE FUNCTION update_confirmation_count();

-- Update comment count
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.reports SET comment_count = comment_count + 1 WHERE id = NEW.report_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.reports SET comment_count = comment_count - 1 WHERE id = OLD.report_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_change
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- Update flag count and auto-hide
CREATE OR REPLACE FUNCTION update_flag_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.reports 
    SET flag_count = flag_count + 1
    WHERE id = NEW.report_id;
    
    -- Auto-hide if 3+ flags
    UPDATE public.reports 
    SET status = 'hidden'
    WHERE id = NEW.report_id AND flag_count >= 3;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_flag_insert
AFTER INSERT ON public.flags
FOR EACH ROW EXECUTE FUNCTION update_flag_count();

-- Recalculate confidence score
CREATE OR REPLACE FUNCTION recalculate_confidence(report_id UUID)
RETURNS void AS $$
DECLARE
    report_record RECORD;
    user_trust INTEGER;
    age_minutes FLOAT;
    confidence FLOAT;
BEGIN
    SELECT r.*, p.trust_score INTO report_record
    FROM public.reports r
    LEFT JOIN public.profiles p ON r.user_id = p.id
    WHERE r.id = report_id;
    
    IF NOT FOUND THEN RETURN; END IF;
    
    user_trust := COALESCE(report_record.trust_score, 0);
    age_minutes := EXTRACT(EPOCH FROM (NOW() - report_record.created_at)) / 60;
    
    -- Base confidence from user trust (0.3 - 0.6)
    confidence := LEAST(0.3 + (user_trust::FLOAT / 100) * 0.3, 0.6);
    
    -- Boost from confirmations (up to 0.3)
    confidence := confidence + LEAST(report_record.confirmation_count * 0.15, 0.3);
    
    -- Small boost from upvotes (up to 0.1)
    confidence := confidence + LEAST(report_record.upvote_count * 0.02, 0.1);
    
    -- Decay over time (full decay at 4 hours)
    confidence := confidence * GREATEST(0, 1 - (age_minutes / 240));
    
    -- Clamp to 0-1
    confidence := LEAST(GREATEST(confidence, 0), 1);
    
    UPDATE public.reports SET confidence_score = confidence WHERE id = report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket for photos
-- Run this separately in Supabase dashboard or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('report-photos', 'report-photos', true);

-- Storage policies (run in Supabase dashboard)
-- CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT USING (bucket_id = 'report-photos');
-- CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'report-photos' AND auth.role() = 'authenticated');
