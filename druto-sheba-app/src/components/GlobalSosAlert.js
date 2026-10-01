'use client';
import { useState, useCallback, useEffect } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AlertOctagon } from 'lucide-react';

export default function GlobalSosAlert() {
  const [sosDrivers, setSosDrivers] = useState([]);

  const fetchSos = useCallback(async () => {
    try {
      const res = await fetch('/api/drivers?t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        const sos = data.filter(d => d.shift_status === 'EMERGENCY_SOS');
        setSosDrivers(sos);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchSos();
    const interval = setInterval(fetchSos, 5000);
    return () => clearInterval(interval);
  }, [fetchSos]);

  useAutoRefresh(fetchSos);

  if (sosDrivers.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
      background: 'var(--red)', color: 'white',
      padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
      boxShadow: '0 4px 20px rgba(239, 68, 68, 0.6)',
      animation: 'pulse 1s infinite'
    }}>
      <AlertOctagon size={36} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
          CRITICAL: DRIVER SOS PANIC TRIGGERED
        </div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>
          The following drivers are in severe distress: {sosDrivers.map(d => `${d.name} (NEX-D-100${d.driver_id})`).join(', ')}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4, opacity: 0.9 }}>
          Please initiate communication, dispatch law enforcement, or provide immediate backup.
        </div>
      </div>
    </div>
  );
}
