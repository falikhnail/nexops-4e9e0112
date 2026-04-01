import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, WifiOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useKeepAliveState } from '@/hooks/useKeepAlive';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function ConnectionStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const { lastPingAt, lastPingOk } = useKeepAliveState();
  const [, setTick] = useState(0);

  // Re-render every 30s to update "x menit lalu" text
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const { error } = await supabase.from('stores').select('id').limit(1);
        if (mounted) setStatus(error ? 'disconnected' : 'connected');
      } catch {
        if (mounted) setStatus('disconnected');
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const isConnected = status === 'connected';
  const isChecking = status === 'checking';

  const pingLabel = lastPingAt
    ? `Ping terakhir: ${formatDistanceToNow(lastPingAt, { addSuffix: true, locale: localeId })} (${lastPingOk ? '✓' : '✗'})`
    : 'Belum ada ping';

  const statusLabel = isConnected ? 'Database terhubung' : status === 'disconnected' ? 'Database terputus' : 'Mengecek...';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
          {status === 'disconnected' ? <WifiOff className="h-3 w-3 text-destructive" /> : <Wifi className="h-3 w-3 text-success" />}
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-success' : status === 'disconnected' ? 'bg-destructive' : 'bg-muted-foreground'} ${isChecking ? 'animate-pulse' : ''}`} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="space-y-0.5">
          <p className="text-xs font-medium">{statusLabel}</p>
          <p className="text-[10px] text-muted-foreground">{pingLabel}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
