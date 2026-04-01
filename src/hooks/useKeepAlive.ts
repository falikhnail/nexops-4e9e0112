import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PING_INTERVAL = 4 * 60 * 1000; // 4 minutes

export function useKeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const ping = async () => {
      try {
        await supabase.from('stores').select('id').limit(1).maybeSingle();
      } catch {
        // silent fail
      }
    };

    // Initial ping
    ping();

    intervalRef.current = setInterval(ping, PING_INTERVAL);

    // Pause when tab is hidden, resume when visible
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
  }, []);
}
