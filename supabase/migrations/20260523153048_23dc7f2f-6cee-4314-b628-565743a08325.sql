CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ann_select_recent" ON public.announcements FOR SELECT TO authenticated
  USING (created_at > now() - interval '1 day');
CREATE POLICY "ann_insert_admin" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
CREATE POLICY "ann_delete_admin" ON public.announcements FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));