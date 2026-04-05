
-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL, -- INSERT, UPDATE, DELETE
  old_data jsonb,
  new_data jsonb,
  description text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow read/insert for authenticated users
CREATE POLICY "auth_all_activity_logs" ON public.activity_logs
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Function to log activity
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _desc text;
  _action text;
  _record_id uuid;
BEGIN
  _action := TG_OP;

  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id;
  ELSE
    _record_id := NEW.id;
  END IF;

  -- Build human-readable description
  CASE TG_TABLE_NAME
    WHEN 'stores' THEN
      IF TG_OP = 'INSERT' THEN _desc := 'Menambahkan toko: ' || NEW.name;
      ELSIF TG_OP = 'UPDATE' THEN _desc := 'Mengupdate toko: ' || NEW.name;
      ELSE _desc := 'Menghapus toko: ' || OLD.name;
      END IF;
    WHEN 'piutangs' THEN
      IF TG_OP = 'INSERT' THEN _desc := 'Menambahkan piutang ' || NEW.invoice_number || ' senilai Rp ' || trim(to_char(NEW.amount, '999,999,999,999'));
      ELSIF TG_OP = 'UPDATE' THEN _desc := 'Mengupdate piutang ' || NEW.invoice_number;
      ELSE _desc := 'Menghapus piutang ' || OLD.invoice_number;
      END IF;
    WHEN 'payments' THEN
      IF TG_OP = 'INSERT' THEN _desc := 'Menambahkan pembayaran senilai Rp ' || trim(to_char(NEW.amount, '999,999,999,999'));
      ELSIF TG_OP = 'DELETE' THEN _desc := 'Menghapus pembayaran senilai Rp ' || trim(to_char(OLD.amount, '999,999,999,999'));
      ELSE _desc := 'Mengupdate pembayaran';
      END IF;
    WHEN 'operational_transactions' THEN
      IF TG_OP = 'INSERT' THEN _desc := 'Menambahkan transaksi operasional (' || NEW.type || ') senilai Rp ' || trim(to_char(NEW.amount, '999,999,999,999'));
      ELSIF TG_OP = 'DELETE' THEN _desc := 'Menghapus transaksi operasional senilai Rp ' || trim(to_char(OLD.amount, '999,999,999,999'));
      ELSE _desc := 'Mengupdate transaksi operasional';
      END IF;
    WHEN 'operational_categories' THEN
      IF TG_OP = 'INSERT' THEN _desc := 'Menambahkan kategori operasional: ' || NEW.name;
      ELSIF TG_OP = 'DELETE' THEN _desc := 'Menghapus kategori operasional: ' || OLD.name;
      ELSE _desc := 'Mengupdate kategori operasional: ' || NEW.name;
      END IF;
    WHEN 'cash_drawer_deposits' THEN
      IF TG_OP = 'INSERT' THEN _desc := 'Menyetor kas laci senilai Rp ' || trim(to_char(NEW.amount, '999,999,999,999'));
      ELSIF TG_OP = 'DELETE' THEN _desc := 'Menghapus setoran kas laci';
      ELSE _desc := 'Mengupdate setoran kas laci';
      END IF;
    ELSE
      _desc := TG_OP || ' on ' || TG_TABLE_NAME;
  END CASE;

  INSERT INTO public.activity_logs (table_name, record_id, action, old_data, new_data, description)
  VALUES (
    TG_TABLE_NAME,
    _record_id,
    _action,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    _desc
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Attach triggers to all tables
CREATE TRIGGER trg_log_stores AFTER INSERT OR UPDATE OR DELETE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER trg_log_piutangs AFTER INSERT OR UPDATE OR DELETE ON public.piutangs FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER trg_log_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER trg_log_operational_transactions AFTER INSERT OR UPDATE OR DELETE ON public.operational_transactions FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER trg_log_operational_categories AFTER INSERT OR UPDATE OR DELETE ON public.operational_categories FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER trg_log_cash_drawer_deposits AFTER INSERT OR UPDATE OR DELETE ON public.cash_drawer_deposits FOR EACH ROW EXECUTE FUNCTION public.log_activity();
