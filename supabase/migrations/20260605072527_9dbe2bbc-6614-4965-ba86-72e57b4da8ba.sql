
CREATE POLICY "Authenticated read post-images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'post-images');
CREATE POLICY "Anon read post-images" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'post-images');
CREATE POLICY "Members upload own post-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Members delete own post-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);
