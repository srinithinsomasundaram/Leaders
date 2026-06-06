-- Add more categories for students, creators, and other relevant topics
INSERT INTO public.categories (name, slug) VALUES
  ('Students', 'students'),
  ('Creators', 'creators'),
  ('Design', 'design'),
  ('Finance', 'finance'),
  ('Leadership', 'leadership'),
  ('Growth', 'growth'),
  ('Community', 'community'),
  ('No-Code', 'no-code')
ON CONFLICT (slug) DO NOTHING;
