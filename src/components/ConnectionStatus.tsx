import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, WifiOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function ConnectionStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

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

  const color = status === 'connected' ? 'text-green-500' : status === 'disconnected' ? 'text-red-500' : 'text-muted-foreground';
  const label = status === 'connected' ? 'Database terhubung' : status === 'disconnected' ? 'Database terputus' : 'Mengecek koneksi...';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${color}`}>
          {status === 'disconnected' ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{status === 'connected' ? 'Online' : status === 'disconnected' ? 'Offline' : '...'}</span>
          <span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-green-500' : status === 'disconnected' ? 'bg-red-500' : 'bg-muted-foreground'} ${status === 'checking' ? 'animate-pulse' : ''}`} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom"><p>{label}</p></TooltipContent>
    </Tooltip>
  );
}
