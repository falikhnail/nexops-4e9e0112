
CREATE OR REPLACE TRIGGER trg_stores_activity AFTER INSERT OR UPDATE OR DELETE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE OR REPLACE TRIGGER trg_piutangs_activity AFTER INSERT OR UPDATE OR DELETE ON public.piutangs FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE OR REPLACE TRIGGER trg_payments_activity AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE OR REPLACE TRIGGER trg_operational_transactions_activity AFTER INSERT OR UPDATE OR DELETE ON public.operational_transactions FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE OR REPLACE TRIGGER trg_operational_categories_activity AFTER INSERT OR UPDATE OR DELETE ON public.operational_categories FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE OR REPLACE TRIGGER trg_cash_drawer_deposits_activity AFTER INSERT OR UPDATE OR DELETE ON public.cash_drawer_deposits FOR EACH ROW EXECUTE FUNCTION public.log_activity();
