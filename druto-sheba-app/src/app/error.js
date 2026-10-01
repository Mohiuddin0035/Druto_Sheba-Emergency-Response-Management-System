'use client';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[Global Error]', error);
  }, [error]);

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', background: 'var(--bg-primary, #0a0a0f)', color: 'var(--text-primary, #fff)',
      fontFamily: 'var(--font-inter, system-ui)'
    }}>
      <div style={{ 
        padding: '48px', textAlign: 'center', maxWidth: 480,
        background: 'rgba(255,255,255,0.03)', borderRadius: 20, 
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)'
      }}>
        <AlertTriangle size={48} color="#ff9f0a" style={{ margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Page Load Error</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          This page couldn&apos;t load. This usually happens after a new deployment or session timeout. Try reloading.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => reset()} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
              background: '#0a84ff', color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}
          >
            <RefreshCcw size={16} /> Reload Page
          </button>
          <button 
            onClick={() => window.location.href = '/'} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
              background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}
          >
            <Home size={16} /> Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
