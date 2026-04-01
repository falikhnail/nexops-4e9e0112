
-- Drop old public-only policies and recreate for both public and authenticated roles

-- stores
DROP POLICY IF EXISTS "Allow public delete stores" ON public.stores;
DROP POLICY IF EXISTS "Allow public insert stores" ON public.stores;
DROP POLICY IF EXISTS "Allow public read stores" ON public.stores;
DROP POLICY IF EXISTS "Allow public update stores" ON public.stores;

CREATE POLICY "Allow all select stores" ON public.stores FOR SELECT TO public, authenticated USING (true);
CREATE POLICY "Allow all insert stores" ON public.stores FOR INSERT TO public, authenticated WITH CHECK (true);
CREATE POLICY "Allow all update stores" ON public.stores FOR UPDATE TO public, authenticated USING (true);
CREATE POLICY "Allow all delete stores" ON public.stores FOR DELETE TO public, authenticated USING (true);

-- piutangs
DROP POLICY IF EXISTS "Allow public delete piutangs" ON public.piutangs;
DROP POLICY IF EXISTS "Allow public insert piutangs" ON public.piutangs;
DROP POLICY IF EXISTS "Allow public read piutangs" ON public.piutangs;
DROP POLICY IF EXISTS "Allow public update piutangs" ON public.piutangs;

CREATE POLICY "Allow all select piutangs" ON public.piutangs FOR SELECT TO public, authenticated USING (true);
CREATE POLICY "Allow all insert piutangs" ON public.piutangs FOR INSERT TO public, authenticated WITH CHECK (true);
CREATE POLICY "Allow all update piutangs" ON public.piutangs FOR UPDATE TO public, authenticated USING (true);
CREATE POLICY "Allow all delete piutangs" ON public.piutangs FOR DELETE TO public, authenticated USING (true);

-- payments
DROP POLICY IF EXISTS "Allow public delete payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public insert payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public read payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public update payments" ON public.payments;

CREATE POLICY "Allow all select payments" ON public.payments FOR SELECT TO public, authenticated USING (true);
CREATE POLICY "Allow all insert payments" ON public.payments FOR INSERT TO public, authenticated WITH CHECK (true);
CREATE POLICY "Allow all update payments" ON public.payments FOR UPDATE TO public, authenticated USING (true);
CREATE POLICY "Allow all delete payments" ON public.payments FOR DELETE TO public, authenticated USING (true);

-- operational_transactions
DROP POLICY IF EXISTS "Allow public delete operational_transactions" ON public.operational_transactions;
DROP POLICY IF EXISTS "Allow public insert operational_transactions" ON public.operational_transactions;
DROP POLICY IF EXISTS "Allow public read operational_transactions" ON public.operational_transactions;
DROP POLICY IF EXISTS "Allow public update operational_transactions" ON public.operational_transactions;

CREATE POLICY "Allow all select operational_transactions" ON public.operational_transactions FOR SELECT TO public, authenticated USING (true);
CREATE POLICY "Allow all insert operational_transactions" ON public.operational_transactions FOR INSERT TO public, authenticated WITH CHECK (true);
CREATE POLICY "Allow all update operational_transactions" ON public.operational_transactions FOR UPDATE TO public, authenticated USING (true);
CREATE POLICY "Allow all delete operational_transactions" ON public.operational_transactions FOR DELETE TO public, authenticated USING (true);

-- cash_drawer_deposits
DROP POLICY IF EXISTS "Allow public delete cash_drawer_deposits" ON public.cash_drawer_deposits;
DROP POLICY IF EXISTS "Allow public insert cash_drawer_deposits" ON public.cash_drawer_deposits;
DROP POLICY IF EXISTS "Allow public read cash_drawer_deposits" ON public.cash_drawer_deposits;
DROP POLICY IF EXISTS "Allow public update cash_drawer_deposits" ON public.cash_drawer_deposits;

CREATE POLICY "Allow all select cash_drawer_deposits" ON public.cash_drawer_deposits FOR SELECT TO public, authenticated USING (true);
CREATE POLICY "Allow all insert cash_drawer_deposits" ON public.cash_drawer_deposits FOR INSERT TO public, authenticated WITH CHECK (true);
CREATE POLICY "Allow all update cash_drawer_deposits" ON public.cash_drawer_deposits FOR UPDATE TO public, authenticated USING (true);
CREATE POLICY "Allow all delete cash_drawer_deposits" ON public.cash_drawer_deposits FOR DELETE TO public, authenticated USING (true);
