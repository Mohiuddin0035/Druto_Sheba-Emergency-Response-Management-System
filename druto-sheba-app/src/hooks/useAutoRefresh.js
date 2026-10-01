import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export function useAutoRefresh(callback) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client not initialized. Auto-refresh is disabled.');
      return;
    }

    const channel = supabase.channel('global-auto-refresh')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('[AutoRefresh] Database change detected, refreshing UI.', payload);
        if (savedCallback.current) {
          savedCallback.current();
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[AutoRefresh] Connected to Supabase Realtime.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
