import { useState, useEffect } from 'react';
import { Piutang, Store } from '@/types';
import { getPiutangs, getStores, refreshPiutangStatuses } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Store as StoreIcon, DollarSign, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface StoreSummaryData {
  store: Store;
  totalAmount: number;
  totalRemaining: number;
  paidPercent: number;
  lunas: number;
  jatuhTempo: number;
  belumLunas: number;
  count: number;
  maxAging: number;
}

export default function StoreSummary() {
  const [data, setData] = useState<StoreSummaryData[]>([]);

  useEffect(() => {
    const load = async () => {
      const [piutangs, stores] = await Promise.all([refreshPiutangStatuses(), getStores()]);
      const now = new Date();

      const result = stores.map(store => {
        const sp = piutangs.filter(p => p.storeId === store.id);
        const totalAmount = sp.reduce((s, p) => s + p.amount, 0);
        const totalRemaining = sp.reduce((s, p) => s + p.remainingAmount, 0);
        const totalPaid = totalAmount - totalRemaining;
        const paidPercent = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;
        const oldestUnpaid = sp.filter(p => p.status !== 'lunas').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
        const maxAging = oldestUnpaid ? differenceInDays(now, new Date(oldestUnpaid.createdAt)) : 0;

        return {
          store, totalAmount, totalRemaining, paidPercent,
          lunas: sp.filter(p => p.status === 'lunas').length,
          jatuhTempo: sp.filter(p => p.status === 'jatuh_tempo').length,
          belumLunas: sp.filter(p => p.status === 'belum_lunas').length,
          count: sp.length, maxAging,
        };
      }).filter(s => s.count > 0).sort((a, b) => b.totalRemaining - a.totalRemaining);

      setData(result);
    };
    load();
  }, []);

  const formatCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const totalAll = data.reduce((s, d) => s + d.totalRemaining, 0);

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

      {data.length === 0 ? (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <StoreIcon className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Belum ada data piutang per toko</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map(({ store, totalAmount, totalRemaining, paidPercent, lunas, jatuhTempo, belumLunas, count, maxAging }) => (
            <Card key={store.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
