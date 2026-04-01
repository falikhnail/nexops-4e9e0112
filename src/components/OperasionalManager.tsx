import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Landmark, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { getOperationalTransactions, addOperationalTransaction, deleteOperationalTransaction, getCashDrawerBalance, depositCashDrawer, getCashDrawerDeposits, type OperationalTransaction, type CashDrawerDeposit } from '@/lib/operasional';

const formatRupiahInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
};

const parseRupiahInput = (value: string): number => {
  return Number(value.replace(/\D/g, '')) || 0;
};

const formatCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export default function OperasionalManager({ onUpdate }: { onUpdate: () => void }) {
  const [transactions, setTransactions] = useState<OperationalTransaction[]>([]);
  const [deposits, setDeposits] = useState<CashDrawerDeposit[]>([]);
  const [cashDrawerBalance, setCashDrawerBalance] = useState(0);
  const [openNew, setOpenNew] = useState(false);
  const [openDeposit, setOpenDeposit] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const { toast } = useToast();

  const [newForm, setNewForm] = useState({
    type: 'pemasukan' as 'pemasukan' | 'pengeluaran',
    category: 'cash' as 'cash' | 'transfer',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const [depositForm, setDepositForm] = useState({
    amount: '',
    notes: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const refresh = async () => {
    const [txns, bal, deps] = await Promise.all([
      getOperationalTransactions(),
      getCashDrawerBalance(),
      getCashDrawerDeposits(),
    ]);
    setTransactions(txns);
    setCashDrawerBalance(bal);
    setDeposits(deps);
    onUpdate();
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterDateFrom && t.date < filterDateFrom) return false;
      if (filterDateTo && t.date > filterDateTo) return false;
      return true;
    });
  }, [transactions, filterType, filterDateFrom, filterDateTo]);

  const totals = useMemo(() => {
    const pemasukan = filtered.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0);
    const pengeluaran = filtered.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0);
    return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran };
  }, [filtered]);

  const handleAdd = async () => {
    const amount = parseRupiahInput(newForm.amount);
    if (!amount || !newForm.date) {
      toast({ title: 'Error', description: 'Nominal dan tanggal wajib diisi', variant: 'destructive' });
      return;
    }
    await addOperationalTransaction({
      type: newForm.type,
      category: newForm.category,
      amount,
      description: newForm.description,
      date: newForm.date,
    });
    toast({ title: 'Berhasil', description: 'Transaksi berhasil ditambahkan' });
    setNewForm({ type: 'pemasukan', category: 'cash', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
    setOpenNew(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    await deleteOperationalTransaction(id);
    toast({ title: 'Dihapus', description: 'Transaksi berhasil dihapus' });
    refresh();
  };

  const handleDeposit = async () => {
    const amount = parseRupiahInput(depositForm.amount);
    if (!amount || amount > cashDrawerBalance) {
      toast({ title: 'Error', description: amount > cashDrawerBalance ? 'Nominal melebihi saldo laci' : 'Nominal wajib diisi', variant: 'destructive' });
      return;
    }
    await depositCashDrawer({ amount, notes: depositForm.notes, date: depositForm.date });
    toast({ title: 'Berhasil', description: `${formatCurrency(amount)} telah disetorkan ke bank` });
    setDepositForm({ amount: '', notes: '', date: new Date().toISOString().slice(0, 10) });
    setOpenDeposit(false);
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pemasukan</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totals.pemasukan)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.pengeluaran)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Bersih</p>
                <p className={`text-2xl font-bold ${totals.saldo >= 0 ? 'text-primary' : 'text-red-600'}`}>{formatCurrency(totals.saldo)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Uang di Laci</p>
                <p className="text-2xl font-bold text-amber-700">{formatCurrency(cashDrawerBalance)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Landmark className="h-5 w-5 text-amber-700" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setOpenDeposit(true)}>Setor ke Bank</Button>
              <Dialog open={openDeposit} onOpenChange={setOpenDeposit}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Setor Uang Laci ke Bank</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Saldo laci saat ini: <strong>{formatCurrency(cashDrawerBalance)}</strong></p>
                    <div>
                      <Label>Nominal Setoran</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                        <Input className="pl-9" value={depositForm.amount} onChange={e => setDepositForm(p => ({ ...p, amount: formatRupiahInput(e.target.value) }))} placeholder="0" />
                      </div>
                    </div>
                    <div>
                      <Label>Tanggal</Label>
                      <Input type="date" value={depositForm.date} onChange={e => setDepositForm(p => ({ ...p, date: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Keterangan</Label>
                      <Textarea value={depositForm.notes} onChange={e => setDepositForm(p => ({ ...p, notes: e.target.value }))} placeholder="Contoh: Setor mingguan" />
                    </div>
                    <Button onClick={handleDeposit} className="w-full">Setor ke Bank</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setOpenHistory(true)}>Riwayat</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Add Button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="pemasukan">Pemasukan</SelectItem>
              <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-[150px]" placeholder="Dari" />
          <span className="text-muted-foreground text-sm">s/d</span>
          <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-[150px]" placeholder="Sampai" />
        </div>
        {(filterType !== 'all' || filterDateFrom || filterDateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterType('all'); setFilterDateFrom(''); setFilterDateTo(''); }}>
            Reset Filter
          </Button>
        )}
        <div className="ml-auto">
          <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-2" /> Tambah Transaksi</Button>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Transaksi Operasional</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Jenis Transaksi</Label>
                  <Select value={newForm.type} onValueChange={(v: 'pemasukan' | 'pengeluaran') => setNewForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pemasukan">Pemasukan</SelectItem>
                      <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Metode</Label>
                  <Select value={newForm.category} onValueChange={(v: 'cash' | 'transfer') => setNewForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nominal</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                    <Input className="pl-9" value={newForm.amount} onChange={e => setNewForm(p => ({ ...p, amount: formatRupiahInput(e.target.value) }))} placeholder="0" />
                  </div>
                </div>
                <div>
                  <Label>Tanggal</Label>
                  <Input type="date" value={newForm.date} onChange={e => setNewForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <Label>Keterangan</Label>
                  <Textarea value={newForm.description} onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))} placeholder="Deskripsi transaksi" />
                </div>
                <Button onClick={handleAdd} className="w-full">Simpan</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Belum ada transaksi operasional
            </CardContent>
          </Card>
        )}
        {filtered.map(t => (
          <Card key={t.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="py-4 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'pemasukan' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {t.type === 'pemasukan' ? <ArrowDownRight className="h-5 w-5 text-emerald-600" /> : <ArrowUpRight className="h-5 w-5 text-red-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{t.description || (t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran')}</p>
                  <Badge variant={t.category === 'cash' ? 'secondary' : 'outline'} className="text-xs shrink-0">
                    {t.category === 'cash' ? 'Cash' : 'Transfer'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'dd MMM yyyy', { locale: idLocale })}</p>
              </div>
              <p className={`font-semibold text-sm shrink-0 ${t.type === 'pemasukan' ? 'text-emerald-600' : 'text-red-600'}`}>
                {t.type === 'pemasukan' ? '+' : '-'}{formatCurrency(t.amount)}
              </p>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleDelete(t.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Deposit History Dialog */}
      <Dialog open={openHistory} onOpenChange={setOpenHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Riwayat Setoran ke Bank</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {deposits.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat setoran</p>}
            {deposits.map(d => (
              <div key={d.id} className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <p className="text-sm font-medium">{formatCurrency(d.amount)}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(d.date), 'dd MMM yyyy', { locale: idLocale })}</p>
                  {d.notes && <p className="text-xs text-muted-foreground mt-0.5">{d.notes}</p>}
                </div>
                <Badge variant="outline" className="text-xs">Disetor</Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
