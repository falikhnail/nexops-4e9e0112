CREATE TABLE public.attendance_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  team_name TEXT NOT NULL DEFAULT '',
  sopir_id UUID NOT NULL,
  kenek_id UUID,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_pairs_date ON public.attendance_pairs(date);

ALTER TABLE public.attendance_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_attendance_pairs" ON public.attendance_pairs
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);