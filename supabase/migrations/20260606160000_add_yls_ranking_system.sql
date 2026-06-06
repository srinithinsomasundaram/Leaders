-- Add YLS (Yesp Leaders Score) ranking system
-- This implements business-value based ranking instead of vanity metrics

-- Add trust score and related fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
ADD COLUMN IF NOT EXISTS spam_reports INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS successful_connections INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_completion_score INTEGER DEFAULT 0 CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100),
ADD COLUMN IF NOT EXISTS is_new_founder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS founder_posts_count INTEGER DEFAULT 0;

-- Add YLS scoring fields to posts
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS yls_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS business_relevance_score INTEGER DEFAULT 0 CHECK (business_relevance_score >= 0 AND business_relevance_score <= 10),
ADD COLUMN IF NOT EXISTS completion_rate NUMERIC DEFAULT 0 CHECK (completion_rate >= 0 AND completion_rate <= 100),
ADD COLUMN IF NOT EXISTS spam_score INTEGER DEFAULT 0 CHECK (spam_score >= 0 AND spam_score <= 10),
ADD COLUMN IF NOT EXISTS profile_views_generated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_opportunity BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS opportunity_type TEXT,
ADD COLUMN IF NOT EXISTS ai_detected_topics TEXT[],
ADD COLUMN IF NOT EXISTS comment_quality_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_yls_calculation TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_yls_score ON public.posts(yls_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_business_relevance ON public.posts(business_relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_opportunity ON public.posts(is_opportunity) WHERE is_opportunity = true;
CREATE INDEX IF NOT EXISTS idx_profiles_trust_score ON public.profiles(trust_score DESC);

-- Create comment quality tracking
CREATE TABLE IF NOT EXISTS public.comment_quality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  quality_score INTEGER DEFAULT 1 CHECK (quality_score >= 1 AND quality_score <= 5),
  is_high_value BOOLEAN DEFAULT false,
  word_count INTEGER DEFAULT 0,
  has_question BOOLEAN DEFAULT false,
  has_experience BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comment_quality_comment ON public.comment_quality(comment_id);

-- Enable RLS
ALTER TABLE public.comment_quality ENABLE ROW LEVEL SECURITY;

-- RLS Policy for comment quality
CREATE POLICY "Anyone can view comment quality"
  ON public.comment_quality
  FOR SELECT
  USING (true);

CREATE POLICY "System can manage comment quality"
  ON public.comment_quality
  FOR ALL
  USING (true);

-- Function to calculate YLS score
CREATE OR REPLACE FUNCTION calculate_yls_score(post_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  post_record RECORD;
  author_trust NUMERIC;
  upvote_points NUMERIC;
  comment_points NUMERIC;
  profile_view_points NUMERIC;
  business_points NUMERIC;
  author_reputation_points NUMERIC;
  completion_points NUMERIC;
  spam_penalty NUMERIC;
  freshness_boost NUMERIC;
  founder_boost NUMERIC;
  opportunity_boost NUMERIC;
  total_score NUMERIC;
  post_age_hours NUMERIC;
BEGIN
  -- Get post data with author info
  SELECT
    p.*,
    pr.trust_score,
    pr.is_new_founder,
    pr.founder_posts_count
  INTO post_record
  FROM public.posts p
  JOIN public.profiles pr ON p.user_id = pr.id
  WHERE p.id = post_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate base components
  upvote_points := post_record.upvote_count * 3;
  comment_points := post_record.comment_count * 5;
  profile_view_points := COALESCE(post_record.profile_views_generated, 0) * 2;
  business_points := COALESCE(post_record.business_relevance_score, 0) * 10;
  author_reputation_points := COALESCE(post_record.trust_score, 50) / 100.0 * 8;
  completion_points := COALESCE(post_record.completion_rate, 0) / 100.0 * 5;
  spam_penalty := COALESCE(post_record.spam_score, 0) * 20;

  -- Calculate post age in hours
  post_age_hours := EXTRACT(EPOCH FROM (NOW() - post_record.created_at)) / 3600;

  -- Freshness boost
  IF post_age_hours <= 24 THEN
    freshness_boost := (upvote_points + comment_points) * 0.5;
  ELSIF post_age_hours <= 72 THEN
    freshness_boost := 0;
  ELSE
    -- Decay after 72 hours, but quality content can still rank
    IF business_points >= 50 THEN
      freshness_boost := -10; -- Minimal decay for quality content
    ELSE
      freshness_boost := -20 * (post_age_hours / 168); -- Decay over a week
    END IF;
  END IF;

  -- Founder boost (first 10 posts)
  IF post_record.is_new_founder AND post_record.founder_posts_count <= 10 THEN
    founder_boost := (upvote_points + comment_points) * 0.3;
  ELSE
    founder_boost := 0;
  END IF;

  -- Opportunity boost (hiring, partnerships, leads)
  IF post_record.is_opportunity THEN
    opportunity_boost := 50;
  ELSE
    opportunity_boost := 0;
  END IF;

  -- Calculate total YLS score
  total_score :=
    upvote_points +
    comment_points +
    profile_view_points +
    business_points +
    author_reputation_points +
    completion_points +
    freshness_boost +
    founder_boost +
    opportunity_boost -
    spam_penalty;

  -- Ensure non-negative
  IF total_score < 0 THEN
    total_score := 0;
  END IF;

  -- Update the post with calculated score
  UPDATE public.posts
  SET
    yls_score = total_score,
    last_yls_calculation = NOW()
  WHERE id = post_id;

  RETURN total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update trust score
CREATE OR REPLACE FUNCTION update_user_trust_score(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_trust INTEGER;
  post_engagement NUMERIC;
  spam_reports_count INTEGER;
  account_age_days INTEGER;
  profile_complete INTEGER;
  new_trust INTEGER;
BEGIN
  -- Get current data
  SELECT
    trust_score,
    spam_reports,
    profile_completion_score,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400
  INTO
    current_trust,
    spam_reports_count,
    profile_complete,
    account_age_days
  FROM public.profiles
  WHERE id = user_id;

  IF NOT FOUND THEN
    RETURN 50;
  END IF;

  -- Calculate post engagement score
  SELECT COALESCE(AVG(upvote_count + comment_count * 2), 0)
  INTO post_engagement
  FROM public.posts
  WHERE user_id = user_id
  AND created_at > NOW() - INTERVAL '30 days';

  -- Start with current trust
  new_trust := current_trust;

  -- Increase for engagement
  IF post_engagement > 10 THEN
    new_trust := new_trust + 2;
  ELSIF post_engagement > 5 THEN
    new_trust := new_trust + 1;
  END IF;

  -- Decrease for spam
  IF spam_reports_count > 0 THEN
    new_trust := new_trust - (spam_reports_count * 10);
  END IF;

  -- Increase for complete profile
  IF profile_complete >= 80 THEN
    new_trust := new_trust + 1;
  END IF;

  -- Increase for account longevity
  IF account_age_days > 30 THEN
    new_trust := new_trust + 1;
  END IF;

  -- Clamp between 0 and 100
  IF new_trust > 100 THEN
    new_trust := 100;
  ELSIF new_trust < 0 THEN
    new_trust := 0;
  END IF;

  -- Update profile
  UPDATE public.profiles
  SET trust_score = new_trust
  WHERE id = user_id;

  RETURN new_trust;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate profile completion score
CREATE OR REPLACE FUNCTION calculate_profile_completion(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  profile_rec RECORD;
BEGIN
  SELECT * INTO profile_rec
  FROM public.profiles
  WHERE id = user_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Name: 20 points
  IF profile_rec.name IS NOT NULL AND LENGTH(profile_rec.name) > 0 THEN
    score := score + 20;
  END IF;

  -- Username: 10 points
  IF profile_rec.username IS NOT NULL AND LENGTH(profile_rec.username) > 0 THEN
    score := score + 10;
  END IF;

  -- Profession: 20 points
  IF profile_rec.profession IS NOT NULL AND LENGTH(profile_rec.profession) > 0 THEN
    score := score + 20;
  END IF;

  -- Avatar: 20 points
  IF profile_rec.avatar_url IS NOT NULL AND LENGTH(profile_rec.avatar_url) > 0 THEN
    score := score + 20;
  END IF;

  -- Account type set: 10 points
  IF profile_rec.account_type IS NOT NULL THEN
    score := score + 10;
  END IF;

  -- Has posts: 20 points
  IF EXISTS (SELECT 1 FROM public.posts WHERE user_id = profile_rec.id LIMIT 1) THEN
    score := score + 20;
  END IF;

  -- Update profile
  UPDATE public.profiles
  SET profile_completion_score = score
  WHERE id = user_id;

  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for trending posts (YLS > 100 AND trust > 60)
CREATE OR REPLACE VIEW trending_posts AS
SELECT
  p.*,
  pr.trust_score,
  pr.name as author_name,
  pr.username as author_username,
  pr.is_verified as author_verified
FROM public.posts p
JOIN public.profiles pr ON p.user_id = pr.id
WHERE p.yls_score > 100
  AND pr.trust_score > 60
  AND p.hidden = false
ORDER BY p.yls_score DESC;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_yls_score TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_trust_score TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_profile_completion TO authenticated;
GRANT SELECT ON trending_posts TO authenticated;
GRANT ALL ON public.comment_quality TO authenticated;

-- Create trigger to update YLS score on post update
CREATE OR REPLACE FUNCTION trigger_recalculate_yls()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_yls_score(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_yls_on_update
AFTER UPDATE OF upvote_count, comment_count, profile_views_generated, business_relevance_score
ON public.posts
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_yls();
