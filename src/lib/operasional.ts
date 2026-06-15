import { supabase } from '@/integrations/supabase/client';

export interface OperationalCategory {
  id: string;
  name: string;
  type: 'pemasukan' | 'pengeluaran';
  isPreset: boolean;
  createdAt: string;
}

export interface OperationalTransaction {
  id: string;
  type: 'pemasukan' | 'pengeluaran';
  category: 'cash' | 'transfer';
  amount: number;
  description: string;
  date: string;
  createdAt: string;
  categoryId: string | null;
  categoryName?: string;
  receiptUrl: string | null;
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
    .select('*, operational_categories(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    type: r.type as 'pemasukan' | 'pengeluaran',
    category: r.category as 'cash' | 'transfer',
    amount: Number(r.amount),
    description: r.description || '',
    date: r.date,
    createdAt: r.created_at,
    categoryId: (r as any).category_id || null,
    categoryName: (r as any).operational_categories?.name || null,
    receiptUrl: (r as any).receipt_url || null,
  }));
}

export async function addOperationalTransaction(tx: Omit<OperationalTransaction, 'id' | 'createdAt' | 'categoryName'>): Promise<void> {
  const { error } = await supabase.from('operational_transactions').insert({
    type: tx.type,
    category: tx.category,
    amount: tx.amount,
    description: tx.description,
    date: tx.date,
    category_id: tx.categoryId,
    receipt_url: tx.receiptUrl,
  });
  if (error) throw error;
}
// Categories CRUD
export async function getOperationalCategories(): Promise<OperationalCategory[]> {
  const { data, error } = await supabase
    .from('operational_categories')
    .select('*')
    .order('type')
    .order('name');
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    type: r.type as 'pemasukan' | 'pengeluaran',
    isPreset: r.is_preset,
    createdAt: r.created_at,
  }));
}

export async function addOperationalCategory(cat: { name: string; type: 'pemasukan' | 'pengeluaran' }): Promise<OperationalCategory> {
  const { data, error } = await supabase.from('operational_categories').insert({
    name: cat.name,
    type: cat.type,
    is_preset: false,
  }).select().single();
  if (error) throw error;
  return { id: data.id, name: data.name, type: data.type as 'pemasukan' | 'pengeluaran', isPreset: data.is_preset, createdAt: data.created_at };
}

export async function deleteOperationalCategory(id: string): Promise<void> {
  const { error } = await supabase.from('operational_categories').delete().eq('id', id);
  if (error) throw error;
}

// Receipt upload
export async function uploadReceipt(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('receipts').upload(fileName, file);
  if (error) throw error;
  const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
  return data.publicUrl;
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
  return cashIn - cashOut - deposited;
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
