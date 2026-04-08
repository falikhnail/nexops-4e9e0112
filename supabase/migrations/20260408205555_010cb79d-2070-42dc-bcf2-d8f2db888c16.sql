
-- Tabel Karyawan
CREATE TABLE public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  position text NOT NULL DEFAULT '',
  daily_wage numeric NOT NULL DEFAULT 0,
  meal_allowance numeric NOT NULL DEFAULT 0,
  transport_allowance numeric NOT NULL DEFAULT 0,
  attendance_bonus numeric NOT NULL DEFAULT 0,
  overtime_rate numeric NOT NULL DEFAULT 0,
  join_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active',
  phone text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_employees" ON public.employees FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Tabel Absensi
CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'hadir',
  overtime_hours numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_attendance" ON public.attendance FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Tabel Penggajian
CREATE TABLE public.payroll (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  work_days integer NOT NULL DEFAULT 0,
  absent_days integer NOT NULL DEFAULT 0,
  sick_days integer NOT NULL DEFAULT 0,
  leave_days integer NOT NULL DEFAULT 0,
  total_overtime_hours numeric NOT NULL DEFAULT 0,
  base_salary numeric NOT NULL DEFAULT 0,
  meal_total numeric NOT NULL DEFAULT 0,
  overtime_total numeric NOT NULL DEFAULT 0,
  transport_total numeric NOT NULL DEFAULT 0,
  attendance_bonus numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  total_salary numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  paid_date date,
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_payroll" ON public.payroll FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Triggers for activity logging
CREATE TRIGGER log_employees_changes AFTER INSERT OR UPDATE OR DELETE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_attendance_changes AFTER INSERT OR UPDATE OR DELETE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_payroll_changes AFTER INSERT OR UPDATE OR DELETE ON public.payroll FOR EACH ROW EXECUTE FUNCTION public.log_activity();
