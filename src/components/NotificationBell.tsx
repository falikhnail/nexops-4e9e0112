import { useState, useEffect, useCallback } from 'react';
import { Piutang, Store } from '@/types';
import { getPiutangs, getStoreById } from '@/lib/store';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Clock } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface Notification {
  id: string;
  type: 'overdue' | 'approaching';
  storeName: string;
  invoice: string;
  daysLeft: number;
  amount: number;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const load = async () => {
      const piutangs = await getPiutangs();
      const now = new Date();
      const alerts: Notification[] = [];

      for (const p of piutangs) {
        if (p.status === 'lunas') continue;
        const store = await getStoreById(p.storeId);
        const dueDate = new Date(p.dueDate);
        const daysLeft = differenceInDays(dueDate, now);

        if (daysLeft < 0) {
          alerts.push({ id: p.id, type: 'overdue', storeName: store?.name || '-', invoice: p.invoiceNumber, daysLeft, amount: p.remainingAmount });
        } else if (daysLeft <= 7) {
          alerts.push({ id: p.id, type: 'approaching', storeName: store?.name || '-', invoice: p.invoiceNumber, daysLeft, amount: p.remainingAmount });
        }
      }

      setNotifications(alerts.sort((a, b) => a.daysLeft - b.daysLeft));
    };
    load();
  }, [open]);

  const formatCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const count = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-border px-4 py-3">
          <p className="font-semibold text-foreground text-sm">Notifikasi Piutang</p>
          <p className="text-xs text-muted-foreground">{count} piutang memerlukan perhatian</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Tidak ada notifikasi
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="flex items-start gap-3 border-b border-border/50 px-4 py-3 last:border-0">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.type === 'overdue' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                  {n.type === 'overdue' ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{n.storeName}</p>
                  <p className="text-xs text-muted-foreground">{n.invoice}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{formatCurrency(n.amount)}</span>
                    <Badge variant={n.type === 'overdue' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {n.type === 'overdue' ? `Lewat ${Math.abs(n.daysLeft)} hari` : n.daysLeft === 0 ? 'Hari ini' : `${n.daysLeft} hari lagi`}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
