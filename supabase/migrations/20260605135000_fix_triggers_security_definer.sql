-- Fix triggers to run as SECURITY DEFINER so they can bypass RLS on the posts table when anonymous or authenticated users insert/delete votes/comments.
CREATE OR REPLACE FUNCTION public.update_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET upvote_count = upvote_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Grant execute permissions just in case they were revoked previously
GRANT EXECUTE ON FUNCTION public.update_vote_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_comment_count() TO anon, authenticated;

-- Ensure the post-images storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Recreate policies on storage.objects for the post-images bucket
DROP POLICY IF EXISTS "Authenticated read post-images" ON storage.objects;
DROP POLICY IF EXISTS "Anon read post-images" ON storage.objects;
DROP POLICY IF EXISTS "Members upload own post-images" ON storage.objects;
DROP POLICY IF EXISTS "Members delete own post-images" ON storage.objects;

CREATE POLICY "Authenticated read post-images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'post-images');
CREATE POLICY "Anon read post-images" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'post-images');
CREATE POLICY "Members upload own post-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Members delete own post-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);
