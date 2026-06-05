-- Create a view to list categories ordered by their hashtag and category usage in posts
CREATE OR REPLACE VIEW public.categories_by_usage AS
SELECT 
  c.id, 
  c.name, 
  c.slug, 
  COUNT(p.id) AS post_count
FROM public.categories c
LEFT JOIN public.posts p 
  ON (c.slug = ANY(p.tags) OR p.category_id = c.id) 
  AND p.hidden = false
GROUP BY c.id, c.name, c.slug;

-- Grant select permissions on the view to public/anon/authenticated roles
GRANT SELECT ON public.categories_by_usage TO anon, authenticated;
