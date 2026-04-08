
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
  _emp_name text;
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
        IF OLD.name IS DISTINCT FROM NEW.name THEN _desc := _desc || ' | Nama: ' || OLD.name || ' → ' || NEW.name; END IF;
        IF OLD.owner_name IS DISTINCT FROM NEW.owner_name THEN _desc := _desc || ' | Pemilik: ' || OLD.owner_name || ' → ' || NEW.owner_name; END IF;
        IF OLD.whatsapp_number IS DISTINCT FROM NEW.whatsapp_number THEN _desc := _desc || ' | WA: ' || OLD.whatsapp_number || ' → ' || NEW.whatsapp_number; END IF;
        IF OLD.address IS DISTINCT FROM NEW.address THEN _desc := _desc || ' | Alamat diubah'; END IF;
      ELSE 
        _desc := 'Menghapus toko "' || OLD.name || '"';
      END IF;

    WHEN 'piutangs' THEN
      IF TG_OP = 'DELETE' THEN
        SELECT s.name INTO _store_name FROM public.stores s WHERE s.id = OLD.store_id;
        _desc := 'Menghapus piutang ' || OLD.invoice_number || ' toko "' || COALESCE(_store_name, '-') || '"';
      ELSIF TG_OP = 'INSERT' THEN
        SELECT s.name INTO _store_name FROM public.stores s WHERE s.id = NEW.store_id;
        _desc := 'Menambahkan piutang ' || NEW.invoice_number || ' untuk toko "' || COALESCE(_store_name, '-') || '" senilai Rp ' || trim(to_char(NEW.amount, '999,999,999,999'));
      ELSE
        SELECT s.name INTO _store_name FROM public.stores s WHERE s.id = NEW.store_id;
        _desc := 'Mengupdate piutang ' || NEW.invoice_number || ' toko "' || COALESCE(_store_name, '-') || '"';
        IF OLD.amount IS DISTINCT FROM NEW.amount THEN _desc := _desc || ' | Nominal: Rp ' || trim(to_char(OLD.amount, '999,999,999,999')) || ' → Rp ' || trim(to_char(NEW.amount, '999,999,999,999')); END IF;
        IF OLD.remaining_amount IS DISTINCT FROM NEW.remaining_amount THEN _desc := _desc || ' | Sisa: Rp ' || trim(to_char(OLD.remaining_amount, '999,999,999,999')) || ' → Rp ' || trim(to_char(NEW.remaining_amount, '999,999,999,999')); END IF;
        IF OLD.status IS DISTINCT FROM NEW.status THEN _desc := _desc || ' | Status: ' || OLD.status || ' → ' || NEW.status; END IF;
      END IF;

    WHEN 'payments' THEN
      IF TG_OP = 'DELETE' THEN
        SELECT p.invoice_number INTO _invoice FROM public.piutangs p WHERE p.id = OLD.piutang_id;
        _desc := 'Menghapus pembayaran Rp ' || trim(to_char(OLD.amount, '999,999,999,999')) || ' dari piutang ' || COALESCE(_invoice, '-');
      ELSIF TG_OP = 'INSERT' THEN
        SELECT p.invoice_number, s.name INTO _invoice, _store_name FROM public.piutangs p JOIN public.stores s ON s.id = p.store_id WHERE p.id = NEW.piutang_id;
        _desc := 'Menambahkan pembayaran Rp ' || trim(to_char(NEW.amount, '999,999,999,999')) || ' (' || NEW.category || ') untuk piutang ' || COALESCE(_invoice, '-') || ' toko "' || COALESCE(_store_name, '-') || '"';
      ELSE
        SELECT p.invoice_number, s.name INTO _invoice, _store_name FROM public.piutangs p JOIN public.stores s ON s.id = p.store_id WHERE p.id = NEW.piutang_id;
        _desc := 'Mengupdate pembayaran piutang ' || COALESCE(_invoice, '-');
        IF OLD.amount IS DISTINCT FROM NEW.amount THEN _desc := _desc || ' | Nominal: Rp ' || trim(to_char(OLD.amount, '999,999,999,999')) || ' → Rp ' || trim(to_char(NEW.amount, '999,999,999,999')); END IF;
      END IF;

    WHEN 'operational_transactions' THEN
      IF TG_OP = 'INSERT' THEN _desc := 'Menambahkan transaksi ' || NEW.type || ' "' || NEW.category || '" Rp ' || trim(to_char(NEW.amount, '999,999,999,999'));
      ELSIF TG_OP = 'DELETE' THEN _desc := 'Menghapus transaksi ' || OLD.type || ' "' || OLD.category || '"';
      ELSE _desc := 'Mengupdate transaksi ' || NEW.type || ' "' || NEW.category || '"';
        IF OLD.amount IS DISTINCT FROM NEW.amount THEN _desc := _desc || ' | Nominal: Rp ' || trim(to_char(OLD.amount, '999,999,999,999')) || ' → Rp ' || trim(to_char(NEW.amount, '999,999,999,999')); END IF;
      END IF;

    WHEN 'operational_categories' THEN
      IF TG_OP = 'INSERT' THEN _desc := 'Menambahkan kategori: ' || NEW.name;
      ELSIF TG_OP = 'DELETE' THEN _desc := 'Menghapus kategori: ' || OLD.name;
      ELSE _desc := 'Mengupdate kategori: ' || OLD.name || ' → ' || NEW.name;
      END IF;

    WHEN 'cash_drawer_deposits' THEN
      IF TG_OP = 'INSERT' THEN _desc := 'Menyetor kas laci Rp ' || trim(to_char(NEW.amount, '999,999,999,999'));
      ELSIF TG_OP = 'DELETE' THEN _desc := 'Menghapus setoran kas laci Rp ' || trim(to_char(OLD.amount, '999,999,999,999'));
      ELSE _desc := 'Mengupdate setoran kas laci';
        IF OLD.amount IS DISTINCT FROM NEW.amount THEN _desc := _desc || ' | Rp ' || trim(to_char(OLD.amount, '999,999,999,999')) || ' → Rp ' || trim(to_char(NEW.amount, '999,999,999,999')); END IF;
      END IF;

    WHEN 'employees' THEN
      IF TG_OP = 'INSERT' THEN _desc := 'Menambahkan karyawan "' || NEW.name || '" posisi ' || COALESCE(NEW.position, '-');
      ELSIF TG_OP = 'DELETE' THEN _desc := 'Menghapus karyawan "' || OLD.name || '"';
      ELSE _desc := 'Mengupdate karyawan "' || NEW.name || '"';
        IF OLD.name IS DISTINCT FROM NEW.name THEN _desc := _desc || ' | Nama: ' || OLD.name || ' → ' || NEW.name; END IF;
        IF OLD.daily_wage IS DISTINCT FROM NEW.daily_wage THEN _desc := _desc || ' | Gaji: Rp ' || trim(to_char(OLD.daily_wage, '999,999,999,999')) || ' → Rp ' || trim(to_char(NEW.daily_wage, '999,999,999,999')); END IF;
        IF OLD.status IS DISTINCT FROM NEW.status THEN _desc := _desc || ' | Status: ' || OLD.status || ' → ' || NEW.status; END IF;
      END IF;

    WHEN 'attendance' THEN
      SELECT e.name INTO _emp_name FROM public.employees e WHERE e.id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.employee_id ELSE NEW.employee_id END);
      IF TG_OP = 'INSERT' THEN _desc := 'Mencatat absensi "' || COALESCE(_emp_name, '-') || '" tanggal ' || to_char(NEW.date, 'DD/MM/YYYY') || ' → ' || NEW.status;
        IF NEW.overtime_hours > 0 THEN _desc := _desc || ' (lembur ' || NEW.overtime_hours || ' jam)'; END IF;
      ELSIF TG_OP = 'DELETE' THEN _desc := 'Menghapus absensi "' || COALESCE(_emp_name, '-') || '" tanggal ' || to_char(OLD.date, 'DD/MM/YYYY');
      ELSE _desc := 'Mengupdate absensi "' || COALESCE(_emp_name, '-') || '" tanggal ' || to_char(NEW.date, 'DD/MM/YYYY');
        IF OLD.status IS DISTINCT FROM NEW.status THEN _desc := _desc || ' | Status: ' || OLD.status || ' → ' || NEW.status; END IF;
        IF OLD.overtime_hours IS DISTINCT FROM NEW.overtime_hours THEN _desc := _desc || ' | Lembur: ' || OLD.overtime_hours || ' → ' || NEW.overtime_hours || ' jam'; END IF;
      END IF;

    WHEN 'payroll' THEN
      SELECT e.name INTO _emp_name FROM public.employees e WHERE e.id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.employee_id ELSE NEW.employee_id END);
      IF TG_OP = 'INSERT' THEN _desc := 'Generate gaji "' || COALESCE(_emp_name, '-') || '" periode ' || to_char(NEW.period_start, 'DD/MM') || '-' || to_char(NEW.period_end, 'DD/MM/YYYY') || ' = Rp ' || trim(to_char(NEW.total_salary, '999,999,999,999'));
      ELSIF TG_OP = 'DELETE' THEN _desc := 'Menghapus slip gaji "' || COALESCE(_emp_name, '-') || '"';
      ELSE _desc := 'Mengupdate gaji "' || COALESCE(_emp_name, '-') || '"';
        IF OLD.status IS DISTINCT FROM NEW.status THEN _desc := _desc || ' | Status: ' || OLD.status || ' → ' || NEW.status; END IF;
        IF OLD.total_salary IS DISTINCT FROM NEW.total_salary THEN _desc := _desc || ' | Total: Rp ' || trim(to_char(OLD.total_salary, '999,999,999,999')) || ' → Rp ' || trim(to_char(NEW.total_salary, '999,999,999,999')); END IF;
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
