import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PING_INTERVAL = 4 * 60 * 1000; // 4 minutes

interface KeepAliveState {
  lastPingAt: Date | null;
  lastPingOk: boolean;
}

const KeepAliveContext = createContext<KeepAliveState>({ lastPingAt: null, lastPingOk: false });

export function useKeepAliveState() {
  return useContext(KeepAliveContext);
}

export { KeepAliveContext };

export function useKeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const [state, setState] = useState<KeepAliveState>({ lastPingAt: null, lastPingOk: false });

  const ping = useCallback(async () => {
    try {
      const { error } = await supabase.from('stores').select('id').limit(1).maybeSingle();
      setState({ lastPingAt: new Date(), lastPingOk: !error });
    } catch {
      setState({ lastPingAt: new Date(), lastPingOk: false });
    }
  }, []);

  useEffect(() => {
    ping();
    intervalRef.current = setInterval(ping, PING_INTERVAL);

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        ping();
        intervalRef.current = setInterval(ping, PING_INTERVAL);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [ping]);

  return state;
}
