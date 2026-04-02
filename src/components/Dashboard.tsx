import { useState, useEffect } from 'react';
import { Piutang, Store } from '@/types';
import { getPiutangs, getStores, refreshPiutangStatuses } from '@/lib/store';
import { getOperationalTransactions, getCashDrawerBalance } from '@/lib/operasional';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, DollarSign, FileText, Wallet, ArrowDownCircle, ArrowUpCircle, Landmark } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Dashboard() {
  const [totalPiutang, setTotalPiutang] = useState(0);
  const [totalLunas, setTotalLunas] = useState(0);
  const [totalJatuhTempo, setTotalJatuhTempo] = useState(0);
  const [totalBelumLunas, setTotalBelumLunas] = useState(0);
  const [storesSummary, setStoresSummary] = useState<{ store: Store; total: number; count: number; overdue: number }[]>([]);
  const [recentPiutangs, setRecentPiutangs] = useState<{ piutang: Piutang; storeName: string }[]>([]);
  const [todayIncome, setTodayIncome] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);
  const [drawerBalance, setDrawerBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [piutangTrend, setPiutangTrend] = useState<{ month: string; total: number; lunas: number }[]>([]);
  const [opsTrend, setOpsTrend] = useState<{ month: string; pemasukan: number; pengeluaran: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const [piutangs, stores, opsTxs, drawer] = await Promise.all([
        refreshPiutangStatuses(), getStores(), getOperationalTransactions(), getCashDrawerBalance(),
      ]);

      setTotalPiutang(piutangs.reduce((sum, p) => sum + p.remainingAmount, 0));
      setTotalLunas(piutangs.filter(p => p.status === 'lunas').length);
      setTotalJatuhTempo(piutangs.filter(p => p.status === 'jatuh_tempo').length);
      setTotalBelumLunas(piutangs.filter(p => p.status === 'belum_lunas').length);

      const storeMap = new Map<string, Store>();
      stores.forEach(s => storeMap.set(s.id, s));

      setStoresSummary(
        stores.map(store => {
          const sp = piutangs.filter(p => p.storeId === store.id);
          return { store, total: sp.reduce((s, p) => s + p.remainingAmount, 0), count: sp.length, overdue: sp.filter(p => p.status === 'jatuh_tempo').length };
        }).filter(s => s.count > 0).sort((a, b) => b.total - a.total)
      );

      setRecentPiutangs(
        [...piutangs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
          .map(p => ({ piutang: p, storeName: storeMap.get(p.storeId)?.name || '-' }))
      );

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const todayTxs = opsTxs.filter(t => t.date === todayStr);
      setTodayIncome(todayTxs.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0));
      setTodayExpense(todayTxs.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0));
      setTotalIncome(opsTxs.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0));
      setTotalExpense(opsTxs.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0));
      setDrawerBalance(drawer);

      const now = new Date();
      const months: { month: string; total: number; lunas: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(now, i);
        const start = startOfMonth(m);
        const end = endOfMonth(m);
        const label = format(m, 'MMM yy', { locale: idLocale });
        const inMonth = piutangs.filter(p => { const d = parseISO(p.createdAt); return isWithinInterval(d, { start, end }); });
        months.push({ month: label, total: inMonth.reduce((s, p) => s + p.amount, 0), lunas: inMonth.filter(p => p.status === 'lunas').reduce((s, p) => s + p.amount, 0) });
      }
      setPiutangTrend(months);

      const opsMonths: { month: string; pemasukan: number; pengeluaran: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(now, i);
        const start = startOfMonth(m);
        const end = endOfMonth(m);
        const label = format(m, 'MMM yy', { locale: idLocale });
        const inMonth = opsTxs.filter(t => { const d = parseISO(t.date); return isWithinInterval(d, { start, end }); });
        opsMonths.push({ month: label, pemasukan: inMonth.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0), pengeluaran: inMonth.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0) });
      }
      setOpsTrend(opsMonths);
    };
    load();
  }, []);

  const formatCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const formatShort = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
    return n.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg">
        <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
        ))}
      </div>
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return { text: 'Selamat Pagi', emoji: '☀️' };
    if (hour >= 11 && hour < 15) return { text: 'Selamat Siang', emoji: '🌤️' };
    if (hour >= 15 && hour < 18) return { text: 'Selamat Sore', emoji: '🌅' };
    return { text: 'Selamat Malam', emoji: '🌙' };
  };

  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">{greeting.emoji} {greeting.text}!</h2>
        <p className="text-sm text-muted-foreground">Ringkasan piutang & operasional CV. Manunggal Karya</p>
      </div>

      {/* Piutang Stats */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Piutang</h3>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Total Piutang', value: formatCurrency(totalPiutang), icon: DollarSign, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
            { title: 'Belum Lunas', value: totalBelumLunas, icon: Clock, iconBg: 'bg-warning/10', iconColor: 'text-warning' },
            { title: 'Jatuh Tempo', value: totalJatuhTempo, icon: AlertTriangle, iconBg: 'bg-destructive/10', iconColor: 'text-destructive' },
            { title: 'Lunas', value: totalLunas, icon: CheckCircle, iconBg: 'bg-success/10', iconColor: 'text-success' },
          ].map((stat) => (
            <Card key={stat.title} className="border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{stat.title}</p>
                  <p className="text-lg font-bold text-foreground truncate">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Operational Stats */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Operasional</h3>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Pemasukan Hari Ini', value: formatCurrency(todayIncome), icon: ArrowDownCircle, iconBg: 'bg-success/10', iconColor: 'text-success' },
            { title: 'Pengeluaran Hari Ini', value: formatCurrency(todayExpense), icon: ArrowUpCircle, iconBg: 'bg-destructive/10', iconColor: 'text-destructive' },
            { title: 'Saldo Laci', value: formatCurrency(drawerBalance), icon: Wallet, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
            { title: 'Saldo Bersih', value: formatCurrency(totalIncome - totalExpense), icon: Landmark, iconBg: 'bg-accent/10', iconColor: 'text-accent' },
          ].map((stat) => (
            <Card key={stat.title} className="border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{stat.title}</p>
                  <p className="text-lg font-bold text-foreground truncate">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Charts */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Grafik Tren</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-semibold">Tren Piutang (6 Bulan)</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={piutangTrend} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={formatShort} className="fill-muted-foreground" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="total" name="Total Piutang" fill="hsl(215, 65%, 36%)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="lunas" name="Lunas" fill="hsl(160, 50%, 38%)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-semibold">Pemasukan vs Pengeluaran (6 Bulan)</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={opsTrend} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={formatShort} className="fill-muted-foreground" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="pemasukan" name="Pemasukan" fill="hsl(160, 50%, 38%)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="pengeluaran" name="Pengeluaran" fill="hsl(0, 65%, 48%)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Lists */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ringkasan</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                Piutang Per Toko
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              {storesSummary.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Belum ada data piutang</p>
              ) : (
                storesSummary.map(({ store, total, count, overdue }) => (
                  <div key={store.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3.5 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{store.name}</p>
                      <p className="text-xs text-muted-foreground">{count} transaksi</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(total)}</p>
                      {overdue > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{overdue} jatuh tempo</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                Piutang Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              {recentPiutangs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Belum ada data piutang</p>
              ) : (
                recentPiutangs.map(({ piutang: p, storeName }) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3.5 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{storeName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(p.remainingAmount)}</p>
                      <Badge variant={p.status === 'lunas' ? 'default' : p.status === 'jatuh_tempo' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">
                        {p.status === 'lunas' ? 'Lunas' : p.status === 'jatuh_tempo' ? 'Jatuh Tempo' : 'Belum Lunas'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
