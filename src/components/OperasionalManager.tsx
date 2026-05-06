import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Landmark, ArrowUpRight, ArrowDownRight, Filter, Tag, Image, Upload, X, Settings, History, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { getOperationalTransactions, addOperationalTransaction, deleteOperationalTransaction, getCashDrawerBalance, depositCashDrawer, getCashDrawerDeposits, getOperationalCategories, addOperationalCategory, deleteOperationalCategory, uploadReceipt, type OperationalTransaction, type CashDrawerDeposit, type OperationalCategory } from '@/lib/operasional';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const formatRupiahInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
};

const parseRupiahInput = (value: string): number => {
  return Number(value.replace(/\D/g, '')) || 0;
};

const formatCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const COLORS = ['hsl(217, 72%, 50%)', 'hsl(160, 60%, 45%)', 'hsl(35, 90%, 50%)', 'hsl(0, 72%, 51%)', 'hsl(270, 60%, 50%)', 'hsl(190, 70%, 45%)', 'hsl(45, 85%, 50%)', 'hsl(320, 60%, 50%)'];

export default function OperasionalManager() {
  const [transactions, setTransactions] = useState<OperationalTransaction[]>([]);
  const [deposits, setDeposits] = useState<CashDrawerDeposit[]>([]);
  const [categories, setCategories] = useState<OperationalCategory[]>([]);
  const [cashDrawerBalance, setCashDrawerBalance] = useState(0);
  const [openNew, setOpenNew] = useState(false);
  const [openDeposit, setOpenDeposit] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [openAuditHistory, setOpenAuditHistory] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState<Set<string>>(new Set());
  const [openReceipt, setOpenReceipt] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const [newForm, setNewForm] = useState({
    type: 'pemasukan' as 'pemasukan' | 'pengeluaran',
    category: 'cash' as 'cash' | 'transfer',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    categoryId: '' as string,
  });

  const [depositForm, setDepositForm] = useState({
    amount: '',
    notes: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const [newCatForm, setNewCatForm] = useState({ name: '', type: 'pengeluaran' as 'pemasukan' | 'pengeluaran' });

  const refresh = async () => {
    const [txns, bal, deps, cats] = await Promise.all([
      getOperationalTransactions(),
      getCashDrawerBalance(),
      getCashDrawerDeposits(),
      getOperationalCategories(),
    ]);
    setTransactions(txns);
    setCashDrawerBalance(bal);
    setDeposits(deps);
    setCategories(cats);
  };

  useEffect(() => { refresh(); }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === newForm.type);
  }, [categories, newForm.type]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterCategoryId !== 'all' && t.categoryId !== filterCategoryId) return false;
      if (filterDateFrom && t.date < filterDateFrom) return false;
      if (filterDateTo && t.date > filterDateTo) return false;
      return true;
    });
  }, [transactions, filterType, filterCategoryId, filterDateFrom, filterDateTo]);

  const totals = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    // Tanggal acuan: kalau user filter tanggal mulai, pakai itu; kalau tidak, pakai hari ini
    const refDate = filterDateFrom || todayStr;

    // Saldo Kemarin = sisa UANG DI LACI pada akhir hari sebelum refDate
    // (basis kategori cash + dikurangi setoran ke bank, dari SEMUA transaksi, tidak ikut filter)
    let cashInBefore = 0;
    let cashOutBefore = 0;
    transactions.forEach(t => {
      if (t.category === 'cash' && t.date < refDate) {
        if (t.type === 'pemasukan') cashInBefore += t.amount;
        else cashOutBefore += t.amount;
      }
    });
    const depositsBefore = deposits.filter(d => d.date < refDate).reduce((s, d) => s + d.amount, 0);
    const saldoKemarin = Math.max(0, cashInBefore - cashOutBefore - depositsBefore);

    // Hari ini = transaksi pada refDate (tidak terpengaruh filter type/kategori biar konsisten)
    const pemasukanToday = transactions.filter(t => t.type === 'pemasukan' && t.date === refDate).reduce((s, t) => s + t.amount, 0);
    const pengeluaranToday = transactions.filter(t => t.type === 'pengeluaran' && t.date === refDate).reduce((s, t) => s + t.amount, 0);

    // Untuk daftar/laporan tetap pakai data terfilter
    const pengeluaran = filtered.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0);
    const pemasukan = saldoKemarin + pemasukanToday;
    return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran, saldoKemarin, pemasukanToday, pengeluaranToday };
  }, [transactions, deposits, filtered, filterDateFrom]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; type: string; total: number; count: number }>();
    filtered.forEach(t => {
      const key = t.categoryId || 'uncategorized';
      const name = t.categoryName || 'Tanpa Kategori';
      const existing = map.get(key) || { name, type: t.type, total: 0, count: 0 };
      existing.total += t.amount;
      existing.count += 1;
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Riwayat saldo harian (audit per tanggal) - dari semua transaksi (tidak terfilter)
  const dailyAudit = useMemo(() => {
    const byDate = new Map<string, OperationalTransaction[]>();
    transactions.forEach(t => {
      const arr = byDate.get(t.date) || [];
      arr.push(t);
      byDate.set(t.date, arr);
    });
    const dates = Array.from(byDate.keys()).sort();
    let running = 0;
    const rows = dates.map(date => {
      const txs = byDate.get(date)!;
      const pemasukanHari = txs.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0);
      const pengeluaranHari = txs.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0);
      const saldoAwal = running;
      const totalPemasukan = saldoAwal + pemasukanHari;
      const saldoAkhir = totalPemasukan - pengeluaranHari;
      running = saldoAkhir;
      return { date, saldoAwal, pemasukanHari, pengeluaranHari, totalPemasukan, saldoAkhir, txs };
    });
    return rows.reverse(); // terbaru di atas
  }, [transactions]);

  const toggleAuditRow = (date: string) => {
    setAuditExpanded(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  const handleAdd = async () => {
    const amount = parseRupiahInput(newForm.amount);
    if (!amount || !newForm.date) {
      toast({ title: 'Error', description: 'Nominal dan tanggal wajib diisi', variant: 'destructive' });
      return;
    }
    let receiptUrl: string | null = null;
    if (receiptFile) {
      setUploading(true);
      try {
        receiptUrl = await uploadReceipt(receiptFile);
      } catch {
        toast({ title: 'Error', description: 'Gagal upload bukti transaksi', variant: 'destructive' });
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    await addOperationalTransaction({
      type: newForm.type,
      category: newForm.category,
      amount,
      description: newForm.description,
      date: newForm.date,
      categoryId: newForm.categoryId || null,
      receiptUrl,
    });
    toast({ title: 'Berhasil', description: 'Transaksi berhasil ditambahkan' });
    setNewForm({ type: 'pemasukan', category: 'cash', amount: '', description: '', date: new Date().toISOString().slice(0, 10), categoryId: '' });
    setReceiptFile(null);
    setReceiptPreview(null);
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

  const handleAddCategory = async () => {
    if (!newCatForm.name.trim()) {
      toast({ title: 'Error', description: 'Nama kategori wajib diisi', variant: 'destructive' });
      return;
    }
    await addOperationalCategory({ name: newCatForm.name, type: newCatForm.type });
    toast({ title: 'Berhasil', description: 'Kategori baru ditambahkan' });
    setNewCatForm({ name: '', type: 'pengeluaran' });
    refresh();
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteOperationalCategory(id);
    toast({ title: 'Dihapus', description: 'Kategori dihapus' });
    refresh();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="transaksi" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Operasional</h2>
            <p className="text-muted-foreground">Kelola transaksi dan kategori operasional</p>
          </div>
          <TabsList>
            <TabsTrigger value="transaksi">Transaksi</TabsTrigger>
            <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
            <TabsTrigger value="kategori">Kategori</TabsTrigger>
          </TabsList>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { title: 'Saldo Kemarin', value: totals.saldoKemarin, icon: Wallet, color: totals.saldoKemarin >= 0 ? 'primary' : 'destructive' },
            { title: 'Pemasukan Hari Ini', value: totals.pemasukanToday, icon: ArrowDownRight, color: 'success' },
            { title: 'Total Pemasukan', value: totals.pemasukan, icon: TrendingUp, color: 'success', sub: 'Saldo kemarin + hari ini' },
            { title: 'Total Pengeluaran', value: totals.pengeluaran, icon: TrendingDown, color: 'destructive' },
            { title: 'Saldo Bersih', value: totals.saldo, icon: Wallet, color: totals.saldo >= 0 ? 'primary' : 'destructive' },
            { title: 'Uang di Laci', value: cashDrawerBalance, icon: Landmark, color: 'warning', highlight: true },
          ].map((s) => {
            const Icon = s.icon;
            const colorMap: Record<string, { text: string; bg: string }> = {
              primary: { text: 'text-primary', bg: 'bg-primary/10' },
              success: { text: 'text-success', bg: 'bg-success/10' },
              destructive: { text: 'text-destructive', bg: 'bg-destructive/10' },
              warning: { text: 'text-warning', bg: 'bg-warning/10' },
            };
            const c = colorMap[s.color];
            return (
              <Card key={s.title} className={s.highlight ? 'border-warning/30 bg-warning/5' : 'border-border/60'}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">{s.title}</p>
                      <p className={`text-base sm:text-lg font-bold mt-1 break-words leading-tight ${c.text}`}>{formatCurrency(s.value)}</p>
                      {s.sub && <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.sub}</p>}
                    </div>
                    <div className={`h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-lg flex items-center justify-center ${c.bg}`}>
                      <Icon className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${c.text}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpenAuditHistory(true)}>
            <History className="h-3.5 w-3.5 mr-1.5" /> Riwayat Saldo Harian
          </Button>
          <Button size="sm" variant="outline" onClick={() => setOpenDeposit(true)}>
            <Landmark className="h-3.5 w-3.5 mr-1.5" /> Setor ke Bank
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpenHistory(true)}>
            Riwayat Setoran
          </Button>
        </div>

        {/* ===== TAB: TRANSAKSI ===== */}
        <TabsContent value="transaksi" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="pemasukan">Pemasukan</SelectItem>
                  <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-[150px]" />
              <span className="text-muted-foreground text-sm">s/d</span>
              <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-[150px]" />
            </div>
            {(filterType !== 'all' || filterCategoryId !== 'all' || filterDateFrom || filterDateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterType('all'); setFilterCategoryId('all'); setFilterDateFrom(''); setFilterDateTo(''); }}>
                Reset
              </Button>
            )}
            <div className="ml-auto">
              <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-2" /> Tambah Transaksi</Button>
            </div>
          </div>

          <div className="space-y-2">
            {filtered.length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Belum ada transaksi operasional</CardContent></Card>
            )}
            {filtered.map(t => (
              <Card key={t.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4 flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'pemasukan' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    {t.type === 'pemasukan' ? <ArrowDownRight className="h-5 w-5 text-success" /> : <ArrowUpRight className="h-5 w-5 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{t.description || (t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran')}</p>
                      <Badge variant={t.category === 'cash' ? 'secondary' : 'outline'} className="text-xs shrink-0">
                        {t.category === 'cash' ? 'Cash' : 'Transfer'}
                      </Badge>
                      {t.categoryName && (
                        <Badge variant="outline" className="text-xs shrink-0 gap-1">
                          <Tag className="h-2.5 w-2.5" />{t.categoryName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'dd MMM yyyy', { locale: idLocale })}</p>
                  </div>
                  {t.receiptUrl && (
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setOpenReceipt(t.receiptUrl)}>
                      <Image className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                  <p className={`font-semibold text-sm shrink-0 ${t.type === 'pemasukan' ? 'text-success' : 'text-destructive'}`}>
                    {t.type === 'pemasukan' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ===== TAB: RINGKASAN ===== */}
        <TabsContent value="ringkasan" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" /> Pemasukan per Kategori</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const data = categoryBreakdown.filter(c => c.type === 'pemasukan');
                  if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">Belum ada data pemasukan</p>;
                  return (
                    <div className="space-y-4">
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={data} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: '10px' }}>
                              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {data.map((c, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-foreground">{c.name}</span>
                              <span className="text-muted-foreground text-xs">({c.count}x)</span>
                            </div>
                            <span className="font-semibold text-foreground">{formatCurrency(c.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive" /> Pengeluaran per Kategori</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const data = categoryBreakdown.filter(c => c.type === 'pengeluaran');
                  if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">Belum ada data pengeluaran</p>;
                  return (
                    <div className="space-y-4">
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={data} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: '10px' }}>
                              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {data.map((c, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-foreground">{c.name}</span>
                              <span className="text-muted-foreground text-xs">({c.count}x)</span>
                            </div>
                            <span className="font-semibold text-foreground">{formatCurrency(c.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== TAB: KATEGORI ===== */}
        <TabsContent value="kategori" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Kelola Kategori</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                  <Label>Nama Kategori Baru</Label>
                  <Input value={newCatForm.name} onChange={e => setNewCatForm(p => ({ ...p, name: e.target.value }))} placeholder="Contoh: Parkir" />
                </div>
                <div>
                  <Label>Jenis</Label>
                  <Select value={newCatForm.type} onValueChange={(v: 'pemasukan' | 'pengeluaran') => setNewCatForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pemasukan">Pemasukan</SelectItem>
                      <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddCategory}><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold text-success mb-2">Kategori Pemasukan</h4>
                  <div className="space-y-1.5">
                    {categories.filter(c => c.type === 'pemasukan').map(c => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-success" />
                          <span className="text-sm text-foreground">{c.name}</span>
                          {c.isPreset && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                        </div>
                        {!c.isPreset && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCategory(c.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-destructive mb-2">Kategori Pengeluaran</h4>
                  <div className="space-y-1.5">
                    {categories.filter(c => c.type === 'pengeluaran').map(c => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-destructive" />
                          <span className="text-sm text-foreground">{c.name}</span>
                          {c.isPreset && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                        </div>
                        {!c.isPreset && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCategory(c.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOGS ===== */}
      <Dialog open={openNew} onOpenChange={(o) => { setOpenNew(o); if (!o) { setReceiptFile(null); setReceiptPreview(null); } }}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader><DialogTitle>Tambah Transaksi Operasional</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label>Jenis Transaksi</Label>
              <Select value={newForm.type} onValueChange={(v: 'pemasukan' | 'pengeluaran') => setNewForm(p => ({ ...p, type: v, categoryId: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pemasukan">Pemasukan</SelectItem>
                  <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={newForm.categoryId} onValueChange={v => setNewForm(p => ({ ...p, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Metode Pembayaran</Label>
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
            <div>
              <Label>Bukti Transaksi (opsional)</Label>
              {receiptPreview ? (
                <div className="relative mt-2">
                  <img src={receiptPreview} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-border" />
                  <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label className="mt-2 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Klik untuk upload foto nota</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </label>
              )}
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={uploading}>
              {uploading ? 'Mengupload...' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openDeposit} onOpenChange={setOpenDeposit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Setor Uang Laci ke Bank</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Saldo laci saat ini: <strong>{formatCurrency(cashDrawerBalance)}</strong></p>
            <div>
              <Label>Nominal Setoran</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                <Input className="pl-9" value={depositForm.amount} onChange={e => setDepositForm(p => ({ ...p, amount: formatRupiahInput(e.target.value) }))} placeholder="0" />
              </div>
            </div>
            <div><Label>Tanggal</Label><Input type="date" value={depositForm.date} onChange={e => setDepositForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div><Label>Keterangan</Label><Textarea value={depositForm.notes} onChange={e => setDepositForm(p => ({ ...p, notes: e.target.value }))} placeholder="Contoh: Setor mingguan" /></div>
            <Button onClick={handleDeposit} className="w-full">Setor ke Bank</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openHistory} onOpenChange={setOpenHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Riwayat Setoran ke Bank</DialogTitle></DialogHeader>
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

      <Dialog open={!!openReceipt} onOpenChange={() => setOpenReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Bukti Transaksi</DialogTitle></DialogHeader>
          {openReceipt && <img src={openReceipt} alt="Bukti" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Riwayat Saldo Harian (Audit per tanggal) */}
      <Dialog open={openAuditHistory} onOpenChange={setOpenAuditHistory}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Riwayat Saldo Harian</DialogTitle>
            <p className="text-xs text-muted-foreground">Audit per tanggal: saldo kemarin, pemasukan, pengeluaran, dan saldo bersih akhir hari. Klik baris untuk melihat detail transaksi.</p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {dailyAudit.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada data transaksi</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border sticky top-0 bg-background z-10">
                  <div className="col-span-3">Tanggal</div>
                  <div className="col-span-2 text-right">Saldo Kemarin</div>
                  <div className="col-span-2 text-right">Pemasukan</div>
                  <div className="col-span-2 text-right">Pengeluaran</div>
                  <div className="col-span-3 text-right">Saldo Bersih</div>
                </div>
                {dailyAudit.map(row => {
                  const expanded = auditExpanded.has(row.date);
                  return (
                    <div key={row.date} className="border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleAuditRow(row.date)}
                        className="w-full grid grid-cols-12 gap-2 px-3 py-3 text-sm hover:bg-muted/50 transition-colors items-center"
                      >
                        <div className="col-span-3 flex items-center gap-2 text-left">
                          {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                          <span className="font-medium">{format(new Date(row.date), 'EEE, dd MMM yyyy', { locale: idLocale })}</span>
                        </div>
                        <div className="col-span-2 text-right text-muted-foreground">{formatCurrency(row.saldoAwal)}</div>
                        <div className="col-span-2 text-right text-success font-medium">+{formatCurrency(row.pemasukanHari)}</div>
                        <div className="col-span-2 text-right text-destructive font-medium">-{formatCurrency(row.pengeluaranHari)}</div>
                        <div className={`col-span-3 text-right font-bold ${row.saldoAkhir >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(row.saldoAkhir)}</div>
                      </button>
                      {expanded && (
                        <div className="bg-muted/30 border-t border-border px-3 py-3 space-y-2">
                          <div className="text-xs text-muted-foreground mb-2">
                            Total Pemasukan (saldo kemarin + hari ini): <span className="font-semibold text-foreground">{formatCurrency(row.totalPemasukan)}</span>
                          </div>
                          {row.txs.map(t => (
                            <div key={t.id} className="flex items-center gap-3 text-xs bg-background rounded px-2.5 py-2">
                              <Badge variant={t.type === 'pemasukan' ? 'default' : 'destructive'} className="text-[10px] shrink-0">
                                {t.type === 'pemasukan' ? 'Masuk' : 'Keluar'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] shrink-0">{t.category === 'cash' ? 'Cash' : 'Transfer'}</Badge>
                              {t.categoryName && <Badge variant="outline" className="text-[10px] shrink-0 gap-1"><Tag className="h-2 w-2" />{t.categoryName}</Badge>}
                              <span className="flex-1 truncate text-muted-foreground">{t.description || '-'}</span>
                              <span className={`font-semibold shrink-0 ${t.type === 'pemasukan' ? 'text-success' : 'text-destructive'}`}>
                                {t.type === 'pemasukan' ? '+' : '-'}{formatCurrency(t.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
