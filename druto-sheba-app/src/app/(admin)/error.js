'use client';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, ArrowLeft } from 'lucide-react';

export default function AdminError({ error, reset }) {
  useEffect(() => {
    console.error('[Admin Portal Error]', error);
  }, [error]);

  return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="glass" style={{ padding: '48px', textAlign: 'center', maxWidth: 480 }}>
        <AlertTriangle size={48} color="var(--orange)" style={{ margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
          The page encountered an error. This may be due to a session timeout or a temporary issue.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn-blue" onClick={() => reset()}>
            <RefreshCcw size={16} /> Try Again
          </button>
          <button className="btn btn-secondary" onClick={() => window.location.href = '/login'}>
            <ArrowLeft size={16} /> Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}
