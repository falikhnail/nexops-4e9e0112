ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS wage_sopir numeric NOT NULL DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS wage_kenek numeric NOT NULL DEFAULT 0;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'sopir';

-- Migrate existing daily_wage as wage_sopir default for current employees that have 0
UPDATE public.employees SET wage_sopir = daily_wage WHERE wage_sopir = 0 AND daily_wage > 0;