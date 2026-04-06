
CREATE OR REPLACE FUNCTION public.log_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _desc text;
  _action text;
  _record_id uuid;
  _store_name text;
  _invoice text;
BEGIN
  _action := TG_OP;

  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id;
  ELSE
    _record_id := NEW.id;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'stores' THEN
      IF TG_OP = 'INSERT' THEN 
        _desc := 'Menambahkan toko "' || NEW.name || '" (Pemilik: ' || NEW.owner_name || ')';
      ELSIF TG_OP = 'UPDATE' THEN 
        _desc := 'Mengupdate toko "' || NEW.name || '"';
        IF OLD.name IS DISTINCT FROM NEW.name THEN
          _desc := _desc || ' | Nama: ' || OLD.name || ' → ' || NEW.name;
        END IF;
        IF OLD.owner_name IS DISTINCT FROM NEW.owner_name THEN
          _desc := _desc || ' | Pemilik: ' || OLD.owner_name || ' → ' || NEW.owner_name;
        END IF;
        IF OLD.whatsapp_number IS DISTINCT FROM NEW.whatsapp_number THEN
          _desc := _desc || ' | WA: ' || OLD.whatsapp_number || ' → ' || NEW.whatsapp_number;
        END IF;
        IF OLD.address IS DISTINCT FROM NEW.address THEN
          _desc := _desc || ' | Alamat diubah';
        END IF;
      ELSE 
        _desc := 'Menghapus toko "' || OLD.name || '" (Pemilik: ' || OLD.owner_name || ')';
      END IF;

    WHEN 'piutangs' THEN
      -- Lookup store name
      IF TG_OP = 'DELETE' THEN
        SELECT s.name INTO _store_name FROM public.stores s WHERE s.id = OLD.store_id;
        _desc := 'Menghapus piutang ' || OLD.invoice_number || ' toko "' || COALESCE(_store_name, 'Unknown') || '" senilai Rp ' || trim(to_char(OLD.amount, '999,999,999,999'));
      ELSIF TG_OP = 'INSERT' THEN
        SELECT s.name INTO _store_name FROM public.stores s WHERE s.id = NEW.store_id;
        _desc := 'Menambahkan piutang ' || NEW.invoice_number || ' untuk toko "' || COALESCE(_store_name, 'Unknown') || '" senilai Rp ' || trim(to_char(NEW.amount, '999,999,999,999')) || ' (Jatuh tempo: ' || to_char(NEW.due_date, 'DD/MM/YYYY') || ')';
      ELSE
        SELECT s.name INTO _store_name FROM public.stores s WHERE s.id = NEW.store_id;
        _desc := 'Mengupdate piutang ' || NEW.invoice_number || ' toko "' || COALESCE(_store_name, 'Unknown') || '"';
        IF OLD.amount IS DISTINCT FROM NEW.amount THEN
          _desc := _desc || ' | Nominal: Rp ' || trim(to_char(OLD.amount, '999,999,999,999')) || ' → Rp ' || trim(to_char(NEW.amount, '999,999,999,999'));
        END IF;
        IF OLD.remaining_amount IS DISTINCT FROM NEW.remaining_amount THEN
          _desc := _desc || ' | Sisa: Rp ' || trim(to_char(OLD.remaining_amount, '999,999,999,999')) || ' → Rp ' || trim(to_char(NEW.remaining_amount, '999,999,999,999'));
        END IF;
        IF OLD.status IS DISTINCT FROM NEW.status THEN
          _desc := _desc || ' | Status: ' || OLD.status || ' → ' || NEW.status;
        END IF;
        IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
          _desc := _desc || ' | Jatuh tempo: ' || to_char(OLD.due_date, 'DD/MM/YYYY') || ' → ' || to_char(NEW.due_date, 'DD/MM/YYYY');
        END IF;
      END IF;

    WHEN 'payments' THEN
      -- Lookup invoice number and store
      IF TG_OP = 'DELETE' THEN
        SELECT p.invoice_number INTO _invoice FROM public.piutangs p WHERE p.id = OLD.piutang_id;
        _desc := 'Menghapus pembayaran Rp ' || trim(to_char(OLD.amount, '999,999,999,999')) || ' (' || OLD.category || ') dari piutang ' || COALESCE(_invoice, '-');
      ELSIF TG_OP = 'INSERT' THEN
        SELECT p.invoice_number, s.name INTO _invoice, _store_name 
        FROM public.piutangs p JOIN public.stores s ON s.id = p.store_id 
        WHERE p.id = NEW.piutang_id;
        _desc := 'Menambahkan pembayaran Rp ' || trim(to_char(NEW.amount, '999,999,999,999')) || ' (' || NEW.category || ') untuk piutang ' || COALESCE(_invoice, '-') || ' toko "' || COALESCE(_store_name, '-') || '"';
        IF NEW.notes IS NOT NULL AND NEW.notes <> '' THEN
          _desc := _desc || ' | Catatan: ' || NEW.notes;
        END IF;
      ELSE
        SELECT p.invoice_number, s.name INTO _invoice, _store_name 
        FROM public.piutangs p JOIN public.stores s ON s.id = p.store_id 
        WHERE p.id = NEW.piutang_id;
        _desc := 'Mengupdate pembayaran piutang ' || COALESCE(_invoice, '-') || ' toko "' || COALESCE(_store_name, '-') || '"';
        IF OLD.amount IS DISTINCT FROM NEW.amount THEN
          _desc := _desc || ' | Nominal: Rp ' || trim(to_char(OLD.amount, '999,999,999,999')) || ' → Rp ' || trim(to_char(NEW.amount, '999,999,999,999'));
        END IF;
        IF OLD.category IS DISTINCT FROM NEW.category THEN
          _desc := _desc || ' | Kategori: ' || OLD.category || ' → ' || NEW.category;
        END IF;
      END IF;

    WHEN 'operational_transactions' THEN
      IF TG_OP = 'INSERT' THEN 
        _desc := 'Menambahkan transaksi ' || NEW.type || ' kategori "' || NEW.category || '" senilai Rp ' || trim(to_char(NEW.amount, '999,999,999,999'));
        IF NEW.description IS NOT NULL AND NEW.description <> '' THEN
          _desc := _desc || ' | Keterangan: ' || NEW.description;
        END IF;
      ELSIF TG_OP = 'DELETE' THEN 
        _desc := 'Menghapus transaksi ' || OLD.type || ' kategori "' || OLD.category || '" senilai Rp ' || trim(to_char(OLD.amount, '999,999,999,999'));
      ELSE 
        _desc := 'Mengupdate transaksi ' || NEW.type || ' kategori "' || NEW.category || '"';
        IF OLD.amount IS DISTINCT FROM NEW.amount THEN
          _desc := _desc || ' | Nominal: Rp ' || trim(to_char(OLD.amount, '999,999,999,999')) || ' → Rp ' || trim(to_char(NEW.amount, '999,999,999,999'));
        END IF;
        IF OLD.category IS DISTINCT FROM NEW.category THEN
          _desc := _desc || ' | Kategori: ' || OLD.category || ' → ' || NEW.category;
        END IF;
      END IF;

    WHEN 'operational_categories' THEN
      IF TG_OP = 'INSERT' THEN _desc := 'Menambahkan kategori operasional: ' || NEW.name || ' (' || NEW.type || ')';
      ELSIF TG_OP = 'DELETE' THEN _desc := 'Menghapus kategori operasional: ' || OLD.name;
      ELSE _desc := 'Mengupdate kategori operasional: ' || OLD.name || ' → ' || NEW.name;
      END IF;

    WHEN 'cash_drawer_deposits' THEN
      IF TG_OP = 'INSERT' THEN 
        _desc := 'Menyetor kas laci senilai Rp ' || trim(to_char(NEW.amount, '999,999,999,999')) || ' tanggal ' || to_char(NEW.date, 'DD/MM/YYYY');
        IF NEW.notes IS NOT NULL AND NEW.notes <> '' THEN
          _desc := _desc || ' | Catatan: ' || NEW.notes;
        END IF;
      ELSIF TG_OP = 'DELETE' THEN 
        _desc := 'Menghapus setoran kas laci Rp ' || trim(to_char(OLD.amount, '999,999,999,999')) || ' tanggal ' || to_char(OLD.date, 'DD/MM/YYYY');
      ELSE 
        _desc := 'Mengupdate setoran kas laci';
        IF OLD.amount IS DISTINCT FROM NEW.amount THEN
          _desc := _desc || ' | Nominal: Rp ' || trim(to_char(OLD.amount, '999,999,999,999')) || ' → Rp ' || trim(to_char(NEW.amount, '999,999,999,999'));
        END IF;
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
$function$;

DROP TRIGGER IF EXISTS trg_stores_activity ON public.stores;
DROP TRIGGER IF EXISTS trg_piutangs_activity ON public.piutangs;
DROP TRIGGER IF EXISTS trg_payments_activity ON public.payments;
DROP TRIGGER IF EXISTS trg_operational_transactions_activity ON public.operational_transactions;
DROP TRIGGER IF EXISTS trg_operational_categories_activity ON public.operational_categories;
DROP TRIGGER IF EXISTS trg_cash_drawer_deposits_activity ON public.cash_drawer_deposits;

CREATE TRIGGER trg_stores_activity AFTER INSERT OR UPDATE OR DELETE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER trg_piutangs_activity AFTER INSERT OR UPDATE OR DELETE ON public.piutangs FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER trg_payments_activity AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER trg_operational_transactions_activity AFTER INSERT OR UPDATE OR DELETE ON public.operational_transactions FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER trg_operational_categories_activity AFTER INSERT OR UPDATE OR DELETE ON public.operational_categories FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER trg_cash_drawer_deposits_activity AFTER INSERT OR UPDATE OR DELETE ON public.cash_drawer_deposits FOR EACH ROW EXECUTE FUNCTION public.log_activity();
