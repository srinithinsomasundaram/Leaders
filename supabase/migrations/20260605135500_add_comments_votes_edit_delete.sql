-- Add upvote_count to comments table
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS upvote_count INT NOT NULL DEFAULT 0;

-- Create comment_votes table
CREATE TABLE IF NOT EXISTS public.comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS and setup policies for comment_votes
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comment votes publicly viewable" ON public.comment_votes;
DROP POLICY IF EXISTS "Members create own comment votes" ON public.comment_votes;
DROP POLICY IF EXISTS "Members delete own comment votes" ON public.comment_votes;

CREATE POLICY "Comment votes publicly viewable" ON public.comment_votes FOR SELECT USING (true);
CREATE POLICY "Members create own comment votes" ON public.comment_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members delete own comment votes" ON public.comment_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Setup comment upvote trigger to run as SECURITY DEFINER (so standard users can increment count)
CREATE OR REPLACE FUNCTION public.update_comment_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments SET upvote_count = upvote_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS comment_votes_count_trigger ON public.comment_votes;
CREATE TRIGGER comment_votes_count_trigger
AFTER INSERT OR DELETE ON public.comment_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_comment_vote_count();

-- Grant execute permission on trigger function
GRANT EXECUTE ON FUNCTION public.update_comment_vote_count() TO anon, authenticated;

-- Add UPDATE policy for public.comments so owners/admins can edit them
DROP POLICY IF EXISTS "Owners update comments" ON public.comments;
CREATE POLICY "Owners update comments" ON public.comments
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
