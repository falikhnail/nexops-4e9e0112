import { useState, useEffect } from 'react';
import { Piutang, Store } from '@/types';
import { getPiutangs, getStores, refreshPiutangStatuses } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, DollarSign, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function Dashboard() {
  const [totalPiutang, setTotalPiutang] = useState(0);
  const [totalLunas, setTotalLunas] = useState(0);
  const [totalJatuhTempo, setTotalJatuhTempo] = useState(0);
  const [totalBelumLunas, setTotalBelumLunas] = useState(0);
  const [storesSummary, setStoresSummary] = useState<{ store: Store; total: number; count: number; overdue: number }[]>([]);
  const [recentPiutangs, setRecentPiutangs] = useState<{ piutang: Piutang; storeName: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const [piutangs, stores] = await Promise.all([refreshPiutangStatuses(), getStores()]);

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
    };
    load();
  }, []);

  const formatCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const statCards = [
    { title: 'Total Piutang', value: formatCurrency(totalPiutang), icon: DollarSign, color: 'text-primary bg-primary/10' },
    { title: 'Belum Lunas', value: totalBelumLunas, icon: Clock, color: 'text-warning bg-warning/10' },
    { title: 'Jatuh Tempo', value: totalJatuhTempo, icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
    { title: 'Lunas', value: totalLunas, icon: CheckCircle, color: 'text-success bg-success/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Ringkasan piutang CV. Manunggal Karya</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border/50 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Piutang Per Toko
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {storesSummary.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Belum ada data piutang</p>
            ) : (
              storesSummary.map(({ store, total, count, overdue }) => (
                <div key={store.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div>
                    <p className="font-semibold text-foreground">{store.name}</p>
                    <p className="text-xs text-muted-foreground">{count} transaksi</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{formatCurrency(total)}</p>
                    {overdue > 0 && (
                      <Badge variant="destructive" className="text-xs">{overdue} jatuh tempo</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Piutang Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPiutangs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Belum ada data piutang</p>
            ) : (
              recentPiutangs.map(({ piutang: p, storeName }) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div>
                    <p className="font-semibold text-foreground">{p.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{storeName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{formatCurrency(p.remainingAmount)}</p>
                    <Badge variant={p.status === 'lunas' ? 'default' : p.status === 'jatuh_tempo' ? 'destructive' : 'secondary'} className="text-xs">
                      {p.status === 'lunas' ? 'Lunas' : p.status === 'jatuh_tempo' ? 'Jatuh Tempo' : 'Belum Lunas'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
