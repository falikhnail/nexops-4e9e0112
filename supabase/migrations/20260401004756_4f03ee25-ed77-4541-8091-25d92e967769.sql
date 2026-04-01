
-- Fix RLS policies to include authenticated role
-- stores
DROP POLICY IF EXISTS "Allow all select stores" ON public.stores;
DROP POLICY IF EXISTS "Allow all insert stores" ON public.stores;
DROP POLICY IF EXISTS "Allow all update stores" ON public.stores;
DROP POLICY IF EXISTS "Allow all delete stores" ON public.stores;
CREATE POLICY "auth_all_stores" ON public.stores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- piutangs
DROP POLICY IF EXISTS "Allow all select piutangs" ON public.piutangs;
DROP POLICY IF EXISTS "Allow all insert piutangs" ON public.piutangs;
DROP POLICY IF EXISTS "Allow all update piutangs" ON public.piutangs;
DROP POLICY IF EXISTS "Allow all delete piutangs" ON public.piutangs;
CREATE POLICY "auth_all_piutangs" ON public.piutangs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- payments
DROP POLICY IF EXISTS "Allow all select payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all insert payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all update payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all delete payments" ON public.payments;
CREATE POLICY "auth_all_payments" ON public.payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- operational_transactions
DROP POLICY IF EXISTS "Allow all select operational_transactions" ON public.operational_transactions;
DROP POLICY IF EXISTS "Allow all insert operational_transactions" ON public.operational_transactions;
DROP POLICY IF EXISTS "Allow all update operational_transactions" ON public.operational_transactions;
DROP POLICY IF EXISTS "Allow all delete operational_transactions" ON public.operational_transactions;
CREATE POLICY "auth_all_operational_transactions" ON public.operational_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- cash_drawer_deposits
DROP POLICY IF EXISTS "Allow all select cash_drawer_deposits" ON public.cash_drawer_deposits;
DROP POLICY IF EXISTS "Allow all insert cash_drawer_deposits" ON public.cash_drawer_deposits;
DROP POLICY IF EXISTS "Allow all update cash_drawer_deposits" ON public.cash_drawer_deposits;
DROP POLICY IF EXISTS "Allow all delete cash_drawer_deposits" ON public.cash_drawer_deposits;
CREATE POLICY "auth_all_cash_drawer_deposits" ON public.cash_drawer_deposits FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
