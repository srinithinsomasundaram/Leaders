-- Grant execute permissions on functions invoked by RLS policies or triggers to standard user roles
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_vote_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_comment_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO anon, authenticated;
