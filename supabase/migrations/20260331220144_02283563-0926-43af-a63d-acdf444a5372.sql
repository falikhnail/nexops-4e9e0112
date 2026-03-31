-- Create stores table
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  address TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read stores" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Allow public insert stores" ON public.stores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update stores" ON public.stores FOR UPDATE USING (true);
CREATE POLICY "Allow public delete stores" ON public.stores FOR DELETE USING (true);

-- Create piutangs table
CREATE TABLE public.piutangs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  remaining_amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'belum_lunas' CHECK (status IN ('belum_lunas', 'lunas', 'jatuh_tempo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.piutangs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read piutangs" ON public.piutangs FOR SELECT USING (true);
CREATE POLICY "Allow public insert piutangs" ON public.piutangs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update piutangs" ON public.piutangs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete piutangs" ON public.piutangs FOR DELETE USING (true);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  piutang_id UUID NOT NULL REFERENCES public.piutangs(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'transfer' CHECK (category IN ('transfer', 'cash', 'retur')),
  date DATE NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow public insert payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update payments" ON public.payments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete payments" ON public.payments FOR DELETE USING (true);

-- Indexes
CREATE INDEX idx_piutangs_store_id ON public.piutangs(store_id);
CREATE INDEX idx_piutangs_status ON public.piutangs(status);
CREATE INDEX idx_payments_piutang_id ON public.payments(piutang_id);