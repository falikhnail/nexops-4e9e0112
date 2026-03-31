export interface Store {
  id: string;
  name: string;
  ownerName: string;
  whatsappNumber: string;
  address: string;
  createdAt: string;
}

export type PaymentCategory = 'transfer' | 'cash' | 'retur';

export interface Payment {
  id: string;
  piutangId: string;
  amount: number;
  category: PaymentCategory;
  date: string;
  notes: string;
  createdAt: string;
}

export interface Piutang {
  id: string;
  invoiceNumber: string;
  storeId: string;
  amount: number;
  remainingAmount: number;
  dueDate: string;
  description: string;
  status: 'belum_lunas' | 'lunas' | 'jatuh_tempo';
  payments: Payment[];
  createdAt: string;
}
