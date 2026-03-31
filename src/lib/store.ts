import { supabase } from '@/integrations/supabase/client';
import { Store, Piutang, Payment, PaymentCategory } from '@/types';

function generateInvoiceNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `INV-${date}-${seq}`;
}

// Helper to map DB row to app types
function mapStore(row: any): Store {
  return {
    id: row.id,
    name: row.name,
    ownerName: row.owner_name,
    whatsappNumber: row.whatsapp_number,
    address: row.address || '',
    createdAt: row.created_at,
  };
}

function mapPayment(row: any): Payment {
  return {
    id: row.id,
    piutangId: row.piutang_id,
    amount: Number(row.amount),
    category: row.category as PaymentCategory,
    date: row.date,
    notes: row.notes || '',
    createdAt: row.created_at,
  };
}

function mapPiutang(row: any, payments: Payment[]): Piutang {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    storeId: row.store_id,
    amount: Number(row.amount),
    remainingAmount: Number(row.remaining_amount),
    dueDate: row.due_date,
    description: row.description || '',
    status: row.status as Piutang['status'],
    payments,
    createdAt: row.created_at,
  };
}

// Store CRUD
export async function getStores(): Promise<Store[]> {
  const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapStore);
}

export async function getStoreById(id: string): Promise<Store | undefined> {
  const { data, error } = await supabase.from('stores').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapStore(data) : undefined;
}

export async function addStore(store: Omit<Store, 'id' | 'createdAt'>): Promise<Store> {
  const { data, error } = await supabase.from('stores').insert({
    name: store.name,
    owner_name: store.ownerName,
    whatsapp_number: store.whatsappNumber,
    address: store.address,
  }).select().single();
  if (error) throw error;
  return mapStore(data);
}

export async function updateStore(id: string, updates: Partial<Store>): Promise<void> {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.ownerName !== undefined) dbUpdates.owner_name = updates.ownerName;
  if (updates.whatsappNumber !== undefined) dbUpdates.whatsapp_number = updates.whatsappNumber;
  if (updates.address !== undefined) dbUpdates.address = updates.address;
  const { error } = await supabase.from('stores').update(dbUpdates).eq('id', id);
  if (error) throw error;
}

export async function deleteStore(id: string): Promise<void> {
  const { error } = await supabase.from('stores').delete().eq('id', id);
  if (error) throw error;
}

// Piutang CRUD
export async function getPiutangs(): Promise<Piutang[]> {
  const { data: piutangRows, error: pError } = await supabase.from('piutangs').select('*').order('created_at', { ascending: false });
  if (pError) throw pError;
  if (!piutangRows || piutangRows.length === 0) return [];

  const { data: paymentRows, error: payError } = await supabase.from('payments').select('*').order('created_at', { ascending: true });
  if (payError) throw payError;

  const paymentsByPiutang = new Map<string, Payment[]>();
  (paymentRows || []).forEach(row => {
    const payment = mapPayment(row);
    const list = paymentsByPiutang.get(payment.piutangId) || [];
    list.push(payment);
    paymentsByPiutang.set(payment.piutangId, list);
  });

  return piutangRows.map(row => mapPiutang(row, paymentsByPiutang.get(row.id) || []));
}

export async function addPiutang(data: { storeId: string; amount: number; dueDate: string; description: string }): Promise<Piutang> {
  const status = new Date(data.dueDate) < new Date() ? 'jatuh_tempo' : 'belum_lunas';
  const { data: row, error } = await supabase.from('piutangs').insert({
    invoice_number: generateInvoiceNumber(),
    store_id: data.storeId,
    amount: data.amount,
    remaining_amount: data.amount,
    due_date: data.dueDate,
    description: data.description,
    status,
  }).select().single();
  if (error) throw error;
  return mapPiutang(row, []);
}

export async function deletePiutang(id: string): Promise<void> {
  const { error } = await supabase.from('piutangs').delete().eq('id', id);
  if (error) throw error;
}

export async function addPayment(piutangId: string, payment: { amount: number; category: PaymentCategory; date: string; notes: string }): Promise<Payment> {
  // Insert payment
  const { data: payRow, error: payError } = await supabase.from('payments').insert({
    piutang_id: piutangId,
    amount: payment.amount,
    category: payment.category,
    date: payment.date,
    notes: payment.notes,
  }).select().single();
  if (payError) throw payError;

  // Update remaining amount on piutang
  const { data: piutang, error: getError } = await supabase.from('piutangs').select('remaining_amount').eq('id', piutangId).single();
  if (getError) throw getError;

  const newRemaining = Math.max(0, Number(piutang.remaining_amount) - payment.amount);
  const newStatus = newRemaining <= 0 ? 'lunas' : 'belum_lunas';

  const { error: updateError } = await supabase.from('piutangs').update({
    remaining_amount: newRemaining,
    status: newStatus,
  }).eq('id', piutangId);
  if (updateError) throw updateError;

  return mapPayment(payRow);
}

export async function refreshPiutangStatuses(): Promise<Piutang[]> {
  const piutangs = await getPiutangs();
  const now = new Date();

  for (const p of piutangs) {
    if (p.status !== 'lunas' && new Date(p.dueDate) < now && p.status !== 'jatuh_tempo') {
      await supabase.from('piutangs').update({ status: 'jatuh_tempo' }).eq('id', p.id);
      p.status = 'jatuh_tempo';
    }
  }

  return piutangs;
}

// WhatsApp
export function generateWhatsAppMessage(piutang: Piutang, store: Store): string {
  const formatCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  return `Kepada Yth. ${store.name} - ${store.ownerName}

Dengan hormat,

Bersama ini kami sampaikan pengingat pembayaran piutang dengan rincian sebagai berikut:

Nomor Transaksi: ${piutang.invoiceNumber}
Jumlah Terutang: ${formatCurrency(piutang.remainingAmount)}
Tanggal Jatuh Tempo: ${formatDate(piutang.dueDate)}

Pembayaran dapat dilakukan melalui transfer ke rekening berikut:
- BRI: 592501013144533
- BCA: 0982222221
- BNI: 5557773731
Atas nama: ANDRI EKA SETIAWAN

Kami mohon pembayaran dapat segera dilakukan sebelum tanggal jatuh tempo.

Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.

Hormat kami,
CV. Manunggal Karya`;
}

export function sendWhatsAppReminder(piutang: Piutang, store: Store) {
  const message = generateWhatsAppMessage(piutang, store);
  const phone = store.whatsappNumber.replace(/[^0-9]/g, '');
  const waPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
  const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
