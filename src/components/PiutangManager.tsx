import { useState, useEffect, useMemo } from 'react';
import { Piutang, Store } from '@/types';
import { getPiutangs, getStores, addPiutang, deletePiutang, addPayment, sendWhatsAppReminder, getStoreById, refreshPiutangStatuses } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, MessageSquare, CreditCard, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { PaymentCategory } from '@/types';

const formatRupiahInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
};

const parseRupiahInput = (value: string): number => {
  return Number(value.replace(/\D/g, '')) || 0;
};

export default function PiutangManager({ onUpdate }: { onUpdate: () => void }) {
  const [piutangs, setPiutangs] = useState<Piutang[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeMap, setStoreMap] = useState<Map<string, Store>>(new Map());
  const [openNew, setOpenNew] = useState(false);
  const [openPayment, setOpenPayment] = useState<string | null>(null);
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStore, setFilterStore] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('due_asc');
  const { toast } = useToast();

  const [newForm, setNewForm] = useState({ storeId: '', amount: '', dueDate: '', description: '' });
  const [payForm, setPayForm] = useState({ amount: '', category: 'transfer' as PaymentCategory, date: '', notes: '' });

  const refresh = async () => {
    const [p, s] = await Promise.all([refreshPiutangStatuses(), getStores()]);
    setPiutangs(p);
    setStores(s);
    const map = new Map<string, Store>();
    s.forEach(st => map.set(st.id, st));
    setStoreMap(map);
    onUpdate();
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const list = piutangs.filter(p => {
      const store = storeMap.get(p.storeId);
      const matchSearch = !search || p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || store?.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchStore = filterStore === 'all' || p.storeId === filterStore;
      const matchDateFrom = !filterDateFrom || p.dueDate >= filterDateFrom;
      const matchDateTo = !filterDateTo || p.dueDate <= filterDateTo;
      return matchSearch && matchStatus && matchStore && matchDateFrom && matchDateTo;
    });

    return list.sort((a, b) => {
      switch (sortBy) {
        case 'due_asc': return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'due_desc': return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        case 'amount_desc': return b.remainingAmount - a.remainingAmount;
        case 'amount_asc': return a.remainingAmount - b.remainingAmount;
        default: return 0;
      }
    });
  }, [piutangs, search, filterStatus, filterStore, filterDateFrom, filterDateTo, storeMap, sortBy]);

  const hasActiveFilters = filterStatus !== 'all' || filterStore !== 'all' || filterDateFrom || filterDateTo;
  const resetFilters = () => { setFilterStatus('all'); setFilterStore('all'); setFilterDateFrom(''); setFilterDateTo(''); setSearch(''); setSortBy('due_asc'); };

  const handleAddPiutang = async () => {
    const amount = parseRupiahInput(newForm.amount);
    if (!newForm.storeId || !amount || !newForm.dueDate) {
      toast({ title: 'Error', description: 'Semua field wajib diisi', variant: 'destructive' });
      return;
    }
    await addPiutang({ storeId: newForm.storeId, amount, dueDate: newForm.dueDate, description: newForm.description });
    toast({ title: 'Berhasil', description: 'Piutang baru ditambahkan' });
    setOpenNew(false);
    setNewForm({ storeId: '', amount: '', dueDate: '', description: '' });
    await refresh();
  };

  const handleAddPayment = async (piutangId: string) => {
    const amount = parseRupiahInput(payForm.amount);
    if (!amount || !payForm.date) {
      toast({ title: 'Error', description: 'Jumlah dan tanggal wajib diisi', variant: 'destructive' });
      return;
    }
    await addPayment(piutangId, { amount, category: payForm.category, date: payForm.date, notes: payForm.notes });
    toast({ title: 'Berhasil', description: 'Pembayaran dicatat' });
    setOpenPayment(null);
    setPayForm({ amount: '', category: 'transfer', date: '', notes: '' });
    await refresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus piutang ini?')) {
      await deletePiutang(id);
      toast({ title: 'Berhasil', description: 'Piutang dihapus' });
      await refresh();
    }
  };

  const handleSendWA = (piutang: Piutang) => {
    const store = storeMap.get(piutang.storeId);
    if (!store) { toast({ title: 'Error', description: 'Data toko tidak ditemukan', variant: 'destructive' }); return; }
    sendWhatsAppReminder(piutang, store);
  };

  const formatCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const getDueDays = (dueDate: string) => differenceInDays(new Date(dueDate), new Date());
  const getDueLabel = (days: number) => {
    if (days < 0) return { label: `Lewat ${Math.abs(days)} hari`, color: 'bg-destructive/10 text-destructive' };
    if (days === 0) return { label: 'Jatuh tempo hari ini', color: 'bg-warning/10 text-warning' };
    if (days <= 7) return { label: `${days} hari lagi`, color: 'bg-warning/10 text-warning' };
    if (days <= 14) return { label: `${days} hari lagi`, color: 'bg-info/10 text-info' };
    return { label: `${days} hari lagi`, color: 'bg-success/10 text-success' };
  };
  const getAging = (createdAt: string) => differenceInDays(new Date(), new Date(createdAt));

  const statusLabel = (s: string) => s === 'lunas' ? 'Lunas' : s === 'jatuh_tempo' ? 'Jatuh Tempo' : 'Belum Lunas';
  const statusVariant = (s: string): 'default' | 'destructive' | 'secondary' => s === 'lunas' ? 'default' : s === 'jatuh_tempo' ? 'destructive' : 'secondary';
  const paymentCategoryLabel = (c: string) => c === 'transfer' ? 'Transfer' : c === 'cash' ? 'Cash' : 'Retur';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Daftar Piutang</h2>
          <p className="text-muted-foreground">Kelola dan pantau semua piutang</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Tambah Piutang</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Piutang Baru</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Toko</Label>
                <Select value={newForm.storeId} onValueChange={v => setNewForm({...newForm, storeId: v})}>
                  <SelectTrigger><SelectValue placeholder="Pilih toko" /></SelectTrigger>
                  <SelectContent>
                    {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name} - {s.ownerName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jumlah (Rp)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                  <Input className="pl-10" value={newForm.amount} onChange={e => setNewForm({...newForm, amount: formatRupiahInput(e.target.value)})} placeholder="10.320.000" />
                </div>
              </div>
              <div><Label>Tanggal Jatuh Tempo</Label><Input type="date" value={newForm.dueDate} onChange={e => setNewForm({...newForm, dueDate: e.target.value})} /></div>
              <div><Label>Keterangan</Label><Textarea value={newForm.description} onChange={e => setNewForm({...newForm, description: e.target.value})} placeholder="Keterangan tambahan..." /></div>
              <Button onClick={handleAddPiutang} className="w-full">Simpan Piutang</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari invoice atau toko..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="belum_lunas">Belum Lunas</SelectItem>
              <SelectItem value="jatuh_tempo">Jatuh Tempo</SelectItem>
              <SelectItem value="lunas">Lunas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStore} onValueChange={setFilterStore}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Semua Toko" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Toko</SelectItem>
              {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Jatuh tempo:</span>
            <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-[150px]" />
            <span className="text-muted-foreground text-sm">s/d</span>
            <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-[150px]" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_asc">Jatuh Tempo Terdekat</SelectItem>
              <SelectItem value="due_desc">Jatuh Tempo Terjauh</SelectItem>
              <SelectItem value="amount_desc">Sisa Terbesar</SelectItem>
              <SelectItem value="amount_asc">Sisa Terkecil</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>Reset Filter</Button>
          )}
          <span className="text-sm text-muted-foreground ml-auto">{filtered.length} dari {piutangs.length} piutang</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Belum ada data piutang</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const store = storeMap.get(p.storeId);
            return (
              <Card key={p.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground">{p.invoiceNumber}</span>
                        <Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>
                        {p.status !== 'lunas' && (() => {
                          const days = getDueDays(p.dueDate);
                          const { label, color } = getDueLabel(days);
                          return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${color}`}>⏱ {label}</span>;
                        })()}
                      </div>
                      <p className="text-sm text-muted-foreground">{store?.name || '-'} • {store?.ownerName || '-'}</p>
                      <p className="text-xs text-muted-foreground">Jatuh tempo: {format(new Date(p.dueDate), 'dd MMM yyyy', { locale: idLocale })}</p>
                      {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{formatCurrency(p.remainingAmount)}</p>
                        {p.remainingAmount !== p.amount && (
                          <p className="text-xs text-muted-foreground">dari {formatCurrency(p.amount)}</p>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        {p.status !== 'lunas' && (
                          <>
                            <Dialog open={openPayment === p.id} onOpenChange={o => { setOpenPayment(o ? p.id : null); if (!o) setPayForm({ amount: '', category: 'transfer', date: '', notes: '' }); }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 text-xs"><CreditCard className="h-3.5 w-3.5" /> Bayar</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Catat Pembayaran</DialogTitle></DialogHeader>
                                <p className="text-sm text-muted-foreground">Sisa: {formatCurrency(p.remainingAmount)}</p>
                                <div className="space-y-4 pt-2">
                                  <div>
                                    <Label>Jumlah (Rp)</Label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                                      <Input className="pl-10" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: formatRupiahInput(e.target.value)})} placeholder="1.000.000" />
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Metode</Label>
                                    <Select value={payForm.category} onValueChange={v => setPayForm({...payForm, category: v as PaymentCategory})}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="transfer">Transfer</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="retur">Retur</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div><Label>Tanggal Pembayaran</Label><Input type="date" value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} /></div>
                                  <div><Label>Keterangan</Label><Textarea value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} placeholder="Keterangan..." /></div>
                                  <Button onClick={() => handleAddPayment(p.id)} className="w-full">Simpan Pembayaran</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleSendWA(p)}>
                              <MessageSquare className="h-3.5 w-3.5" /> WA
                            </Button>
                          </>
                        )}
                        <Dialog open={openDetail === p.id} onOpenChange={o => setOpenDetail(o ? p.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-xs">Detail</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader><DialogTitle>Detail Piutang</DialogTitle></DialogHeader>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-muted-foreground">Invoice</span><span className="font-medium text-foreground">{p.invoiceNumber}</span>
                                <span className="text-muted-foreground">Toko</span><span className="font-medium text-foreground">{store?.name}</span>
                                <span className="text-muted-foreground">Total</span><span className="font-medium text-foreground">{formatCurrency(p.amount)}</span>
                                <span className="text-muted-foreground">Sisa</span><span className="font-bold text-foreground">{formatCurrency(p.remainingAmount)}</span>
                                <span className="text-muted-foreground">Jatuh Tempo</span><span className="font-medium text-foreground">{format(new Date(p.dueDate), 'dd MMM yyyy', { locale: idLocale })}</span>
                                <span className="text-muted-foreground">Umur Piutang</span><span className="font-medium text-foreground">{getAging(p.createdAt)} hari</span>
                              </div>
                              {p.payments.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-foreground mb-2">Riwayat Pembayaran</h4>
                                  <div className="space-y-2">
                                    {p.payments.map(pay => (
                                      <div key={pay.id} className="rounded-lg border border-border/50 p-2.5 text-sm">
                                        <div className="flex justify-between">
                                          <span className="font-medium text-foreground">{formatCurrency(pay.amount)}</span>
                                          <Badge variant="outline" className="text-xs">{paymentCategoryLabel(pay.category)}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{format(new Date(pay.date), 'dd MMM yyyy', { locale: idLocale })}</p>
                                        {pay.notes && <p className="text-xs text-muted-foreground mt-1">{pay.notes}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
