-- Add class and subject support for notes (filters + upload form)
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS class_level TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT;

-- Helpful indexes for filtering
CREATE INDEX IF NOT EXISTS notes_class_level_idx ON public.notes (class_level);
CREATE INDEX IF NOT EXISTS notes_subject_idx ON public.notes (subject);
