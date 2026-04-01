import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { TrendingUp, TrendingDown, Wallet, Calendar, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parse, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getOperationalTransactions, getOperationalCategories, type OperationalTransaction, type OperationalCategory } from '@/lib/operasional';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const formatCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const COLORS = [
  'hsl(217, 72%, 50%)', 'hsl(160, 60%, 45%)', 'hsl(35, 90%, 50%)',
  'hsl(0, 72%, 51%)', 'hsl(270, 60%, 50%)', 'hsl(190, 70%, 45%)',
  'hsl(45, 85%, 50%)', 'hsl(320, 60%, 50%)', 'hsl(100, 50%, 45%)',
  'hsl(25, 80%, 50%)',
];

type PresetKey = 'this_month' | 'last_month' | 'last_7' | 'last_30' | 'custom';

const PRESETS: { value: PresetKey; label: string }[] = [
  { value: 'this_month', label: 'Bulan Ini' },
  { value: 'last_month', label: 'Bulan Lalu' },
  { value: 'last_7', label: '7 Hari Terakhir' },
  { value: 'last_30', label: '30 Hari Terakhir' },
  { value: 'custom', label: 'Rentang Custom' },
];

function getPresetRange(key: PresetKey): { from: Date; to: Date } {
  const now = new Date();
  switch (key) {
    case 'this_month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last_month': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: d, to: endOfMonth(d) };
    }
    case 'last_7':
      return { from: subDays(now, 6), to: now };
    case 'last_30':
      return { from: subDays(now, 29), to: now };
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

export default function LaporanBulanan() {
  const [transactions, setTransactions] = useState<OperationalTransaction[]>([]);
  const [categories, setCategories] = useState<OperationalCategory[]>([]);
  const [preset, setPreset] = useState<PresetKey>('this_month');
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));
  const [loading, setLoading] = useState(true);

  // Update dates when preset changes
  useEffect(() => {
    if (preset !== 'custom') {
      const range = getPresetRange(preset);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }, [preset]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [tx, cats] = await Promise.all([
          getOperationalTransactions(),
          getOperationalCategories(),
        ]);
        setTransactions(tx);
        setCategories(cats);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const from = format(dateFrom, 'yyyy-MM-dd');
    const to = format(dateTo, 'yyyy-MM-dd');
    return transactions.filter(t => t.date >= from && t.date <= to);
  }, [transactions, dateFrom, dateTo]);

  const totalPemasukan = useMemo(() => filtered.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0), [filtered]);
  const totalPengeluaran = useMemo(() => filtered.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0), [filtered]);
  const saldo = totalPemasukan - totalPengeluaran;

  // Breakdown per kategori
  const breakdownPemasukan = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    filtered.filter(t => t.type === 'pemasukan').forEach(t => {
      const name = t.categoryName || 'Tanpa Kategori';
      const existing = map.get(name) || { name, total: 0, count: 0 };
      existing.total += t.amount;
      existing.count += 1;
      map.set(name, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const breakdownPengeluaran = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    filtered.filter(t => t.type === 'pengeluaran').forEach(t => {
      const name = t.categoryName || 'Tanpa Kategori';
      const existing = map.get(name) || { name, total: 0, count: 0 };
      existing.total += t.amount;
      existing.count += 1;
      map.set(name, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Daily chart data
  const dailyData = useMemo(() => {
    const days = new Map<string, { date: string; pemasukan: number; pengeluaran: number }>();
    
    let current = new Date(dateFrom);
    while (current <= dateTo) {
      const key = format(current, 'yyyy-MM-dd');
      days.set(key, { date: format(current, 'dd/MM'), pemasukan: 0, pengeluaran: 0 });
      current.setDate(current.getDate() + 1);
    }

    filtered.forEach(t => {
      const entry = days.get(t.date);
      if (entry) {
        if (t.type === 'pemasukan') entry.pemasukan += t.amount;
        else entry.pengeluaran += t.amount;
      }
    });

    return Array.from(days.values());
  }, [filtered, dateFrom, dateTo]);

  const rangeLabel = `${format(dateFrom, 'dd MMM yyyy', { locale: idLocale })} — ${format(dateTo, 'dd MMM yyyy', { locale: idLocale })}`;

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Memuat data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Laporan Operasional</h2>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={preset} onValueChange={(v) => setPreset(v as PresetKey)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal text-xs")}>
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    {format(dateFrom, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={dateFrom}
                    onSelect={(d) => d && setDateFrom(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">s/d</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal text-xs")}>
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    {format(dateTo, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarPicker
                    mode="single"
                    selected={dateTo}
                    onSelect={(d) => d && setDateTo(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pemasukan</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(totalPemasukan)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(totalPengeluaran)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Bersih</p>
                <p className={`text-lg font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(saldo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily bar chart */}
      {filtered.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Grafik Harian — {rangeLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="pemasukan" name="Pemasukan" fill="hsl(160, 60%, 45%)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="pengeluaran" name="Pengeluaran" fill="hsl(0, 72%, 51%)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breakdown section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pemasukan breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-green-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Breakdown Pemasukan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {breakdownPemasukan.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Tidak ada pemasukan bulan ini</p>
            ) : (
              <div className="space-y-4">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={breakdownPemasukan} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                        {breakdownPemasukan.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Transaksi</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdownPemasukan.map((item, i) => (
                      <TableRow key={item.name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            {item.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.count}x</TableCell>
                        <TableCell className="text-right font-medium text-green-600">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{breakdownPemasukan.reduce((s, i) => s + i.count, 0)}x</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(totalPemasukan)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pengeluaran breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Breakdown Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            {breakdownPengeluaran.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Tidak ada pengeluaran bulan ini</p>
            ) : (
              <div className="space-y-4">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={breakdownPengeluaran} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                        {breakdownPengeluaran.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Transaksi</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdownPengeluaran.map((item, i) => (
                      <TableRow key={item.name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            {item.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.count}x</TableCell>
                        <TableCell className="text-right font-medium text-red-600">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{breakdownPengeluaran.reduce((s, i) => s + i.count, 0)}x</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(totalPengeluaran)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction list */}
      {filtered.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail Transaksi — {monthLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(tx.date), 'dd MMM yyyy', { locale: idLocale })}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === 'pemasukan' ? 'default' : 'destructive'} className="text-xs">
                          {tx.type === 'pemasukan' ? 'Masuk' : 'Keluar'}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.categoryName || '-'}</TableCell>
                      <TableCell className="capitalize">{tx.category}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{tx.description || '-'}</TableCell>
                      <TableCell className={`text-right font-medium whitespace-nowrap ${tx.type === 'pemasukan' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'pemasukan' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Tidak ada transaksi pada bulan ini.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
