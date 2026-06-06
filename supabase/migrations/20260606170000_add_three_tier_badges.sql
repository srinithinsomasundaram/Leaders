-- Add verification tier system to profiles
-- Three tiers: creator (blue), leader (gold), elite (diamond)

-- Add verification_tier column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verification_tier TEXT DEFAULT NULL CHECK (verification_tier IN ('creator', 'leader', 'elite'));

-- Update is_verified to be computed based on verification_tier
-- Keep is_verified for backward compatibility but derive it from verification_tier
-- Note: We'll update the column directly but you may want to use a view or trigger

-- Add columns for trust score and contribution tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_posts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS spam_violations_count INTEGER DEFAULT 0;

-- Update verification_requests table to include tier
ALTER TABLE public.verification_requests
ADD COLUMN IF NOT EXISTS requested_tier TEXT DEFAULT 'creator' CHECK (requested_tier IN ('creator', 'leader', 'elite')),
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS professional_email TEXT;

-- Create index for verification tier queries
CREATE INDEX IF NOT EXISTS idx_profiles_verification_tier ON public.profiles(verification_tier);

-- Function to check if user meets creator badge requirements
CREATE OR REPLACE FUNCTION check_creator_badge_eligibility(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  profile_complete BOOLEAN;
  post_count INTEGER;
  spam_count INTEGER;
BEGIN
  -- Check if profile is complete (has name, username, profession)
  SELECT
    (name IS NOT NULL AND name != '' AND
     username IS NOT NULL AND username != '' AND
     profession IS NOT NULL AND profession != '')
  INTO profile_complete
  FROM public.profiles
  WHERE id = user_id;

  -- Count quality posts (posts with upvote_count > 0 or comment_count > 0)
  SELECT COUNT(*)
  INTO post_count
  FROM public.posts
  WHERE posts.user_id = check_creator_badge_eligibility.user_id
    AND hidden = false
    AND created_at > NOW() - INTERVAL '90 days'; -- Active in last 90 days

  -- Check spam violations
  SELECT COALESCE(spam_violations_count, 0)
  INTO spam_count
  FROM public.profiles
  WHERE id = user_id;

  -- Return true if meets all requirements
  RETURN profile_complete AND post_count >= 5 AND spam_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically grant creator badge to eligible users
CREATE OR REPLACE FUNCTION auto_grant_creator_badge()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for creator badge if user doesn't have any badge yet
  IF NEW.verification_tier IS NULL THEN
    IF check_creator_badge_eligibility(NEW.id) THEN
      NEW.verification_tier = 'creator';
      NEW.is_verified = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-grant creator badge when posts are created
CREATE OR REPLACE FUNCTION check_creator_badge_on_post()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile verification if user is eligible
  UPDATE public.profiles
  SET
    verification_tier = 'creator',
    is_verified = true,
    quality_posts_count = (
      SELECT COUNT(*)
      FROM public.posts
      WHERE user_id = NEW.user_id
        AND hidden = false
    )
  WHERE id = NEW.user_id
    AND verification_tier IS NULL
    AND check_creator_badge_eligibility(NEW.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on posts table
DROP TRIGGER IF EXISTS trigger_check_creator_badge ON public.posts;
CREATE TRIGGER trigger_check_creator_badge
  AFTER INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION check_creator_badge_on_post();

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_creator_badge_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION auto_grant_creator_badge TO authenticated;
GRANT EXECUTE ON FUNCTION check_creator_badge_on_post TO authenticated;

-- Migrate existing verified users to 'leader' tier (gold badge)
UPDATE public.profiles
SET verification_tier = 'leader'
WHERE is_verified = true AND verification_tier IS NULL;

-- Update is_verified based on verification_tier
UPDATE public.profiles
SET is_verified = (verification_tier IS NOT NULL);

-- Add comment explaining the tier system
COMMENT ON COLUMN public.profiles.verification_tier IS '
Three-tier verification system:
- creator (blue badge): Active creators with quality content
- leader (gold badge): Verified business leaders and professionals
- elite (diamond badge): Top contributors and exceptional leaders
';
