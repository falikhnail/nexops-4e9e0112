import { supabase } from '@/integrations/supabase/client';

export interface OperationalTransaction {
  id: string;
  type: 'pemasukan' | 'pengeluaran';
  category: 'cash' | 'transfer';
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

export interface CashDrawerDeposit {
  id: string;
  amount: number;
  notes: string;
  date: string;
  createdAt: string;
}

export async function getOperationalTransactions(): Promise<OperationalTransaction[]> {
  const { data, error } = await supabase
    .from('operational_transactions')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    type: r.type as 'pemasukan' | 'pengeluaran',
    category: r.category as 'cash' | 'transfer',
    amount: Number(r.amount),
    description: r.description || '',
    date: r.date,
    createdAt: r.created_at,
  }));
}

export async function addOperationalTransaction(tx: Omit<OperationalTransaction, 'id' | 'createdAt'>): Promise<void> {
  const { error } = await supabase.from('operational_transactions').insert({
    type: tx.type,
    category: tx.category,
    amount: tx.amount,
    description: tx.description,
    date: tx.date,
  });
  if (error) throw error;
}

export async function deleteOperationalTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('operational_transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function getCashDrawerBalance(): Promise<number> {
  // Cash income minus cash expenses minus deposits = drawer balance
  const [txRes, depRes] = await Promise.all([
    supabase.from('operational_transactions').select('type, category, amount'),
    supabase.from('cash_drawer_deposits').select('amount'),
  ]);
  if (txRes.error) throw txRes.error;
  if (depRes.error) throw depRes.error;

  let cashIn = 0;
  let cashOut = 0;
  (txRes.data || []).forEach(r => {
    if (r.category === 'cash') {
      if (r.type === 'pemasukan') cashIn += Number(r.amount);
      else cashOut += Number(r.amount);
    }
  });

  const deposited = (depRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
  return Math.max(0, cashIn - cashOut - deposited);
}

export async function depositCashDrawer(data: { amount: number; notes: string; date: string }): Promise<void> {
  const { error } = await supabase.from('cash_drawer_deposits').insert({
    amount: data.amount,
    notes: data.notes,
    date: data.date,
  });
  if (error) throw error;
}

export async function getCashDrawerDeposits(): Promise<CashDrawerDeposit[]> {
  const { data, error } = await supabase
    .from('cash_drawer_deposits')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    amount: Number(r.amount),
    notes: r.notes || '',
    date: r.date,
    createdAt: r.created_at,
  }));
}
