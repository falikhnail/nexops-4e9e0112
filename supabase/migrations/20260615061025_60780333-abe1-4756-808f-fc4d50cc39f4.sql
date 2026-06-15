CREATE TABLE public.operational_shortcuts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  category_id UUID REFERENCES public.operational_categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_shortcuts TO anon, authenticated;
GRANT ALL ON public.operational_shortcuts TO service_role;

ALTER TABLE public.operational_shortcuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to operational_shortcuts"
ON public.operational_shortcuts FOR ALL
USING (true) WITH CHECK (true);