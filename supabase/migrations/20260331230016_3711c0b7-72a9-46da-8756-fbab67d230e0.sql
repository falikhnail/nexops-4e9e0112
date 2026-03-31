
CREATE TABLE public.operational_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('pemasukan', 'pengeluaran')),
  category TEXT NOT NULL CHECK (category IN ('cash', 'transfer')),
  amount NUMERIC NOT NULL,
  description TEXT DEFAULT '',
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read operational_transactions" ON public.operational_transactions FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert operational_transactions" ON public.operational_transactions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update operational_transactions" ON public.operational_transactions FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete operational_transactions" ON public.operational_transactions FOR DELETE TO public USING (true);

CREATE TABLE public.cash_drawer_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  notes TEXT DEFAULT '',
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_drawer_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read cash_drawer_deposits" ON public.cash_drawer_deposits FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert cash_drawer_deposits" ON public.cash_drawer_deposits FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update cash_drawer_deposits" ON public.cash_drawer_deposits FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete cash_drawer_deposits" ON public.cash_drawer_deposits FOR DELETE TO public USING (true);
