
-- 1. Create operational_categories table
CREATE TABLE public.operational_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pemasukan', 'pengeluaran')),
  is_preset BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_operational_categories" ON public.operational_categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Insert preset categories
INSERT INTO public.operational_categories (name, type, is_preset) VALUES
  ('Penjualan', 'pemasukan', true),
  ('Piutang Masuk', 'pemasukan', true),
  ('Pendapatan Lainnya', 'pemasukan', true),
  ('Gaji Karyawan', 'pengeluaran', true),
  ('Operasional Toko', 'pengeluaran', true),
  ('Transportasi', 'pengeluaran', true),
  ('Belanja Barang', 'pengeluaran', true),
  ('Listrik & Air', 'pengeluaran', true),
  ('Makan & Minum', 'pengeluaran', true),
  ('Pengeluaran Lainnya', 'pengeluaran', true);

-- 3. Add category_id and receipt_url to operational_transactions
ALTER TABLE public.operational_transactions
  ADD COLUMN category_id UUID REFERENCES public.operational_categories(id),
  ADD COLUMN receipt_url TEXT;

-- 4. Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- 5. Storage RLS policies for receipts bucket
CREATE POLICY "Anyone can upload receipts" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Anyone can view receipts" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'receipts');
CREATE POLICY "Anyone can delete receipts" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'receipts');
