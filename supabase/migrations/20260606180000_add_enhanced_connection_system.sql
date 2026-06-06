-- Enhanced 3-Level Connection System for Yesp Leaders
-- Level 1: Follow (no approval needed)
-- Level 2: Connect (requires approval with reason)
-- Level 3: Collaborate (special business relationship)

-- Add follows table for Level 1 (Follow)
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create indexes for follows
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON public.follows(created_at DESC);

-- Enable RLS on follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for follows
CREATE POLICY "Anyone can view follows"
  ON public.follows
  FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON public.follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows
  FOR DELETE
  USING (auth.uid() = follower_id);

-- Update connections table for Level 2 (Connect) with reasons and types
ALTER TABLE public.connections
ADD COLUMN IF NOT EXISTS connection_reason TEXT,
ADD COLUMN IF NOT EXISTS connection_type TEXT CHECK (connection_type IN ('partnership', 'networking', 'hiring', 'investment', 'mentorship', 'business_opportunity')),
ADD COLUMN IF NOT EXISTS message TEXT;

-- Add collaboration table for Level 3 (Collaborate)
CREATE TABLE IF NOT EXISTS public.collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  collaboration_type TEXT NOT NULL CHECK (collaboration_type IN ('business_partner', 'mentor', 'investor', 'client', 'team_member', 'co_founder', 'advisor', 'consultant')),
  description TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id)
);

-- Create indexes for collaborations
CREATE INDEX IF NOT EXISTS idx_collaborations_connection ON public.collaborations(connection_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_type ON public.collaborations(collaboration_type);

-- Enable RLS on collaborations
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaborations
CREATE POLICY "Users can view their collaborations"
  ON public.collaborations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.connections
      WHERE connections.id = collaborations.connection_id
        AND (connections.requester_id = auth.uid() OR connections.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can create collaborations for their connections"
  ON public.collaborations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.connections
      WHERE connections.id = connection_id
        AND connections.status = 'accepted'
        AND (connections.requester_id = auth.uid() OR connections.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their collaborations"
  ON public.collaborations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.connections
      WHERE connections.id = connection_id
        AND (connections.requester_id = auth.uid() OR connections.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their collaborations"
  ON public.collaborations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.connections
      WHERE connections.id = connection_id
        AND (connections.requester_id = auth.uid() OR connections.receiver_id = auth.uid())
    )
  );

-- Function to get follower count
CREATE OR REPLACE FUNCTION get_follower_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.follows
    WHERE following_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get following count
CREATE OR REPLACE FUNCTION get_following_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.follows
    WHERE follower_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is following another user
CREATE OR REPLACE FUNCTION is_following(follower UUID, following UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.follows
    WHERE follower_id = follower AND following_id = following
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get collaboration details for a connection
CREATE OR REPLACE FUNCTION get_collaboration(conn_id UUID)
RETURNS TABLE(
  collaboration_id UUID,
  collaboration_type TEXT,
  description TEXT,
  started_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT id, collaborations.collaboration_type, collaborations.description, collaborations.started_at
  FROM public.collaborations
  WHERE connection_id = conn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add email engagement tracking
CREATE TABLE IF NOT EXISTS public.email_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  engagement_score INTEGER DEFAULT 0,
  metadata JSONB
);

-- Create indexes for email engagement
CREATE INDEX IF NOT EXISTS idx_email_engagement_user ON public.email_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_email_engagement_type ON public.email_engagement(email_type);
CREATE INDEX IF NOT EXISTS idx_email_engagement_sent_at ON public.email_engagement(sent_at DESC);

-- Enable RLS on email engagement
ALTER TABLE public.email_engagement ENABLE ROW LEVEL SECURITY;

-- RLS Policy for email engagement
CREATE POLICY "Users can view their own email engagement"
  ON public.email_engagement
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to calculate user engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Open Email = +1
  SELECT score + COUNT(*)::INTEGER
  INTO score
  FROM public.email_engagement
  WHERE email_engagement.user_id = calculate_engagement_score.user_id
    AND opened_at IS NOT NULL
    AND sent_at > NOW() - INTERVAL '30 days';

  -- Click Link = +3
  SELECT score + (COUNT(*) * 3)::INTEGER
  INTO score
  FROM public.email_engagement
  WHERE email_engagement.user_id = calculate_engagement_score.user_id
    AND clicked_at IS NOT NULL
    AND sent_at > NOW() - INTERVAL '30 days';

  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add last_active_at to profiles for re-engagement tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS email_engagement_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Create indexes for activity tracking
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_engagement_score ON public.profiles(email_engagement_score DESC);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborations TO authenticated;
GRANT SELECT, INSERT ON public.email_engagement TO authenticated;
GRANT EXECUTE ON FUNCTION get_follower_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_following_count TO authenticated;
GRANT EXECUTE ON FUNCTION is_following TO authenticated;
GRANT EXECUTE ON FUNCTION get_collaboration TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_engagement_score TO authenticated;

-- Add comments
COMMENT ON TABLE public.follows IS 'Level 1: Follow - No approval needed, see updates from leaders';
COMMENT ON TABLE public.connections IS 'Level 2: Connect - Requires approval with reason and type';
COMMENT ON TABLE public.collaborations IS 'Level 3: Collaborate - Special business relationship status';
COMMENT ON TABLE public.email_engagement IS 'Email engagement tracking for re-engagement campaigns';
