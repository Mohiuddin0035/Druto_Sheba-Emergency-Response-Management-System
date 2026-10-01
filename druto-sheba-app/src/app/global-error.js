'use client';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[Global Error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ 
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', background: '#0a0a0f', color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ 
            padding: '48px', textAlign: 'center', maxWidth: 480,
            background: 'rgba(255,255,255,0.03)', borderRadius: 20, 
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Page Load Error</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              This usually happens after a new deployment. A hard refresh should fix it.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => window.location.reload()} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                  background: '#0a84ff', color: '#fff', border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}
              >
                🔄 Hard Refresh
              </button>
              <button 
                onClick={() => window.location.href = '/'} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                  background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}
              >
                🏠 Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
