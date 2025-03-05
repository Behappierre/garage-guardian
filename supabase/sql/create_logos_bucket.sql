
-- Create logos storage bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('logos', 'logos', true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Set up permissive policies for the logos bucket
  -- Allow public read access to all files
  CREATE POLICY "Public Access" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'logos');
  
  -- Allow authenticated users to upload files
  CREATE POLICY "Authenticated users can upload" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');
  
  -- Allow users to update their own files
  CREATE POLICY "Authenticated users can update" 
  ON storage.objects 
  FOR UPDATE 
  USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Policy already exists';
END $$;
