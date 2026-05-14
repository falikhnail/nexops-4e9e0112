import { useState, useEffect, useMemo } from 'react';
import { Piutang, Store, PaymentCategory } from '@/types';
import { getStores, refreshPiutangStatuses, addPayment, sendWhatsAppReminder } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store as StoreIcon, DollarSign, AlertTriangle, CheckCircle, Clock, Search, CreditCard, MessageSquare, Wallet } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface StoreSummaryData {
  store: Store;
  piutangs: Piutang[];
  totalAmount: number;
  totalRemaining: number;
  paidPercent: number;
  lunas: number;
  jatuhTempo: number;
  belumLunas: number;
  count: number;
  maxAging: number;
}

const formatRupiahInput = (v: string) => {
  const d = v.replace(/\D/g, '');
  return d ? Number(d).toLocaleString('id-ID') : '';
};
const parseRupiahInput = (v: string) => Number(v.replace(/\D/g, '')) || 0;

export default function StoreSummary() {
  const [allPiutangs, setAllPiutangs] = useState<Piutang[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [search, setSearch] = useState('');
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [openPay, setOpenPay] = useState<string | null>(null);
  const [openGlobalPay, setOpenGlobalPay] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', category: 'transfer' as PaymentCategory, date: '', notes: '' });
  const { toast } = useToast();

  const refresh = async () => {
    const [p, s] = await Promise.all([refreshPiutangStatuses(), getStores()]);
    setAllPiutangs(p);
    setStores(s);
  };

  useEffect(() => { refresh(); }, []);

  const data = useMemo<StoreSummaryData[]>(() => {
    const now = new Date();
    return stores.map(store => {
      const sp = allPiutangs.filter(p => p.storeId === store.id);
      const totalAmount = sp.reduce((s, p) => s + p.amount, 0);
      const totalRemaining = sp.reduce((s, p) => s + p.remainingAmount, 0);
      const totalPaid = totalAmount - totalRemaining;
      const paidPercent = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;
      const oldestUnpaid = sp.filter(p => p.status !== 'lunas').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
      const maxAging = oldestUnpaid ? differenceInDays(now, new Date(oldestUnpaid.createdAt)) : 0;
      return {
        store, piutangs: sp, totalAmount, totalRemaining, paidPercent,
        lunas: sp.filter(p => p.status === 'lunas').length,
        jatuhTempo: sp.filter(p => p.status === 'jatuh_tempo').length,
        belumLunas: sp.filter(p => p.status === 'belum_lunas').length,
        count: sp.length, maxAging,
      };
    }).filter(s => s.count > 0).sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [allPiutangs, stores]);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(d =>
      d.store.name.toLowerCase().includes(q) ||
      d.store.ownerName.toLowerCase().includes(q) ||
      d.piutangs.some(p => p.invoiceNumber.toLowerCase().includes(q))
    );
  }, [data, search]);

  const formatCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const totalAll = data.reduce((s, d) => s + d.totalRemaining, 0);

  const statusLabel = (s: string) => s === 'lunas' ? 'Lunas' : s === 'jatuh_tempo' ? 'Jatuh Tempo' : 'Belum Lunas';
  const statusVariant = (s: string): 'default' | 'destructive' | 'secondary' => s === 'lunas' ? 'default' : s === 'jatuh_tempo' ? 'destructive' : 'secondary';
  const paymentCategoryLabel = (c: string) => c === 'transfer' ? 'Transfer' : c === 'cash' ? 'Cash' : 'Retur';

  const resetPayForm = () => setPayForm({ amount: '', category: 'transfer', date: '', notes: '' });

  const handlePayOne = async (piutangId: string) => {
    const amount = parseRupiahInput(payForm.amount);
    if (!amount || !payForm.date) {
      toast({ title: 'Error', description: 'Jumlah dan tanggal wajib diisi', variant: 'destructive' });
      return;
    }
    await addPayment(piutangId, { amount, category: payForm.category, date: payForm.date, notes: payForm.notes });
    toast({ title: 'Berhasil', description: 'Pembayaran dicatat' });
    setOpenPay(null);
    resetPayForm();
    await refresh();
  };

  const handleGlobalPay = async (storeId: string) => {
    let remaining = parseRupiahInput(payForm.amount);
    if (!remaining || !payForm.date) {
      toast({ title: 'Error', description: 'Jumlah dan tanggal wajib diisi', variant: 'destructive' });
      return;
    }
    // distribute to oldest unpaid first (FIFO by createdAt)
    const targets = allPiutangs
      .filter(p => p.storeId === storeId && p.status !== 'lunas')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (targets.length === 0) {
      toast({ title: 'Error', description: 'Tidak ada piutang aktif', variant: 'destructive' });
      return;
    }

    for (const p of targets) {
      if (remaining <= 0) break;
      const pay = Math.min(remaining, p.remainingAmount);
      await addPayment(p.id, { amount: pay, category: payForm.category, date: payForm.date, notes: payForm.notes || `Pembayaran global: ${p.invoiceNumber}` });
      remaining -= pay;
    }
    if (remaining > 0) {
      toast({ title: 'Catatan', description: `Sisa Rp ${remaining.toLocaleString('id-ID')} tidak teralokasi (semua piutang lunas)` });
    } else {
      toast({ title: 'Berhasil', description: 'Pembayaran global didistribusikan' });
    }
    setOpenGlobalPay(null);
    resetPayForm();
    await refresh();
  };

  const detailData = openDetail ? data.find(d => d.store.id === openDetail) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Rekap Per Toko</h2>
        <p className="text-muted-foreground">Ringkasan piutang masing-masing toko</p>
      </div>

      <Card className="border-border/50 shadow-sm bg-primary/5">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Piutang Seluruh Toko</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalAll)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cari toko, pemilik, atau nomor invoice..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <StoreIcon className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">{search ? 'Tidak ada hasil pencarian' : 'Belum ada data piutang per toko'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map(({ store, totalAmount, totalRemaining, paidPercent, lunas, jatuhTempo, belumLunas, count, maxAging }) => (
            <Card key={store.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setOpenDetail(store.id)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <StoreIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-foreground">{store.name}</p>
                      <p className="text-xs font-normal text-muted-foreground">{store.ownerName}</p>
                    </div>
                  </div>
                  {maxAging > 0 && (
                    <Badge variant={maxAging > 30 ? 'destructive' : maxAging > 14 ? 'secondary' : 'outline'} className="text-xs">
                      {maxAging} hari
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">Sisa piutang</span>
                    <span className="text-lg font-bold text-foreground">{formatCurrency(totalRemaining)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">dari total {formatCurrency(totalAmount)}</span>
                    <span className="text-xs font-medium text-muted-foreground">{paidPercent}% terbayar</span>
                  </div>
                  <Progress value={paidPercent} className="h-2" />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {belumLunas} aktif
                  </div>
                  {jatuhTempo > 0 && (
                    <div className="flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="h-3 w-3" /> {jatuhTempo} jatuh tempo
                    </div>
                  )}
                  {lunas > 0 && (
                    <div className="flex items-center gap-1 text-xs text-success">
                      <CheckCircle className="h-3 w-3" /> {lunas} lunas
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">{count} transaksi</span>
                </div>

                <Button variant="outline" size="sm" className="w-full gap-2" onClick={(e) => { e.stopPropagation(); setOpenDetail(store.id); }}>
                  Lihat Detail & Bayar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!openDetail} onOpenChange={o => { if (!o) setOpenDetail(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailData && (
            <>
              <DialogHeader>
                <DialogTitle>{detailData.store.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{detailData.store.ownerName}</p>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Card className="bg-primary/5">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Sisa Piutang</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(detailData.totalRemaining)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-success/5">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Terbayar</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(detailData.totalAmount - detailData.totalRemaining)}</p>
                  </CardContent>
                </Card>
              </div>

              {detailData.totalRemaining > 0 && (
                <Button className="w-full gap-2" onClick={() => { resetPayForm(); setOpenGlobalPay(detailData.store.id); }}>
                  <Wallet className="h-4 w-4" /> Bayar Global (distribusi otomatis)
                </Button>
              )}

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-sm">Daftar Piutang</h4>
                {detailData.piutangs.map(p => (
                  <Card key={p.id} className="border-border/50">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground text-sm">{p.invoiceNumber}</span>
                            <Badge variant={statusVariant(p.status)} className="text-xs">{statusLabel(p.status)}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">JT: {format(new Date(p.dueDate), 'dd MMM yyyy', { locale: idLocale })}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground text-sm">{formatCurrency(p.remainingAmount)}</p>
                          {p.remainingAmount !== p.amount && <p className="text-xs text-muted-foreground">dari {formatCurrency(p.amount)}</p>}
                        </div>
                      </div>
                      {p.payments.length > 0 && (
                        <div className="border-t border-border/50 pt-2 space-y-1">
                          {p.payments.map(pay => (
                            <div key={pay.id} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{format(new Date(pay.date), 'dd MMM yyyy', { locale: idLocale })} • {paymentCategoryLabel(pay.category)}</span>
                              <span className="font-medium text-foreground">{formatCurrency(pay.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {p.status !== 'lunas' && (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-1" onClick={() => { resetPayForm(); setOpenPay(p.id); }}>
                            <CreditCard className="h-3 w-3" /> Bayar
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => sendWhatsAppReminder(p, detailData.store)}>
                            <MessageSquare className="h-3 w-3" /> WA
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Single payment dialog */}
      <Dialog open={!!openPay} onOpenChange={o => { if (!o) { setOpenPay(null); resetPayForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Catat Pembayaran</DialogTitle></DialogHeader>
          {openPay && (() => {
            const p = allPiutangs.find(x => x.id === openPay);
            return p ? <p className="text-sm text-muted-foreground">{p.invoiceNumber} • Sisa: {formatCurrency(p.remainingAmount)}</p> : null;
          })()}
          <div className="space-y-4 pt-2">
            <div>
              <Label>Jumlah (Rp)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input className="pl-10" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: formatRupiahInput(e.target.value) })} placeholder="1.000.000" />
              </div>
            </div>
            <div>
              <Label>Metode</Label>
              <Select value={payForm.category} onValueChange={v => setPayForm({ ...payForm, category: v as PaymentCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="retur">Retur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tanggal</Label><Input type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} /></div>
            <div><Label>Keterangan</Label><Textarea value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} placeholder="Keterangan..." /></div>
            <Button onClick={() => openPay && handlePayOne(openPay)} className="w-full">Simpan Pembayaran</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global payment dialog */}
      <Dialog open={!!openGlobalPay} onOpenChange={o => { if (!o) { setOpenGlobalPay(null); resetPayForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bayar Global</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Pembayaran akan didistribusikan otomatis ke piutang paling lama terlebih dahulu.</p>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Jumlah Total (Rp)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input className="pl-10" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: formatRupiahInput(e.target.value) })} placeholder="5.000.000" />
              </div>
            </div>
            <div>
              <Label>Metode</Label>
              <Select value={payForm.category} onValueChange={v => setPayForm({ ...payForm, category: v as PaymentCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="retur">Retur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tanggal</Label><Input type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} /></div>
            <div><Label>Keterangan</Label><Textarea value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} placeholder="Keterangan..." /></div>
            <Button onClick={() => openGlobalPay && handleGlobalPay(openGlobalPay)} className="w-full">Distribusikan Pembayaran</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
