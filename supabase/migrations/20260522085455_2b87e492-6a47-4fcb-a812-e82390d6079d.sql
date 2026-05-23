
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_auth" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select_auth" ON public.notes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "notes_insert_own" ON public.notes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update_own" ON public.notes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notes_delete_own" ON public.notes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6)),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('notes', 'notes', false);

CREATE POLICY "notes_storage_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'notes');
CREATE POLICY "notes_storage_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "notes_storage_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1]
  );
