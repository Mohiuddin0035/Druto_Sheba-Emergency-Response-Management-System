'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useUser } from '@/lib/UserContext';
import { 
  Bell, Mail, AlertTriangle, ShieldAlert, 
  CheckCircle2, Clock, Info, RefreshCw, MessageSquare
} from 'lucide-react';

export default function PatientInbox() {
  const { activePatient } = useUser();
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMessage, setActiveMessage] = useState(null);
  const isFirstLoad = useRef(true);

  const fetchInbox = useCallback(async () => {
    if (!activePatient?.id) return;
    try {
      if (isFirstLoad.current) setLoading(true);
      setIsRefreshing(true);
      const res = await fetch(`/api/patient/inbox?patient_id=${activePatient.id}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error('Error fetching patient inbox:', err);
    } finally {
      setIsRefreshing(false);
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, [activePatient]);

  useAutoRefresh(fetchInbox);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const handleMarkAsRead = async (msg) => {
    setActiveMessage(msg);
    if (!msg.is_read) {
      try {
        await fetch('/api/patient/inbox', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_id: msg.id, is_read: true })
        });
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    }
  };

  if (!activePatient) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          Please sign in to view your inbox.
        </div>
      </div>
    );
  }

  const getCategoryBadge = (category, priority) => {
    if (priority === 'HIGH' || category === 'REFUND_NOTICE' || category === 'AUTO_CANCEL') {
      return (
        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'rgba(255, 69, 58, 0.2)', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ShieldAlert size={12} /> {category.replace(/_/g, ' ')}
        </span>
      );
    }
    if (category === 'APPOINTMENT_CONFIRMED') {
      return (
        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'rgba(52, 199, 89, 0.2)', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={12} /> CONFIRMED
        </span>
      );
    }
    return (
      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'rgba(10, 132, 255, 0.2)', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Info size={12} /> {category.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2>Patient Inbox & Confirmations</h2>
            {unreadCount > 0 ? (
              <span style={{ 
                fontSize: 11, 
                fontWeight: 800, 
                padding: '3px 8px', 
                borderRadius: 12, 
                background: 'rgba(255, 59, 48, 0.15)', 
                color: 'var(--red)',
                border: '1px solid rgba(255, 59, 48, 0.3)'
              }}>
                {unreadCount} UNREAD
              </span>
            ) : (
              <span style={{ 
                fontSize: 11, 
                fontWeight: 700, 
                padding: '3px 8px', 
                borderRadius: 12, 
                background: 'rgba(52, 199, 89, 0.15)', 
                color: 'var(--green)',
                border: '1px solid rgba(52, 199, 89, 0.3)'
              }}>
                ALL READ
              </span>
            )}
          </div>
          <p className="page-header-sub">
            Payment acknowledgements, doctor appointment confirmations, and official refund notices
          </p>
        </div>

        <button 
          onClick={() => {
            setIsRefreshing(true);
            fetchInbox();
          }}
          disabled={isRefreshing}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Checking...' : 'Refresh Inbox'}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Loading your inbox messages...
        </div>
      ) : messages.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Mail size={40} style={{ margin: '0 auto 12px', color: 'var(--text-muted)', opacity: 0.5 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Your Inbox is Empty</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
            When you make payments, book appointments, or receive verification updates, confirmations will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(360px, 1.3fr)', gap: 20 }}>
          {/* Message List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg) => {
              const isSelected = activeMessage?.id === msg.id;
              return (
                <div
                  key={msg.id}
                  onClick={() => handleMarkAsRead(msg)}
                  className="card"
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderRadius: 12,
                    border: isSelected ? '2px solid var(--blue)' : !msg.is_read ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'rgba(0, 122, 255, 0.05)' : !msg.is_read ? 'rgba(0, 122, 255, 0.02)' : 'var(--bg-primary)',
                    boxShadow: !msg.is_read ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {!msg.is_read && (
                    <span style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--red)',
                      boxShadow: '0 0 6px var(--red)'
                    }} />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {getCategoryBadge(msg.category, msg.priority)}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {new Date(msg.created_at + (msg.created_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ fontSize: 14, fontWeight: !msg.is_read ? 800 : 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {msg.title}
                  </div>

                  <div style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.4
                  }}>
                    {msg.body}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message Detail View */}
          <div className="card" style={{ padding: 24, borderRadius: 12, minHeight: 340, display: 'flex', flexDirection: 'column' }}>
            {activeMessage ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      {getCategoryBadge(activeMessage.category, activeMessage.priority)}
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        From: <strong style={{ color: 'var(--text-primary)' }}>{activeMessage.sender_role}</strong>
                      </span>
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{activeMessage.title}</h3>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                    {new Date(activeMessage.created_at + (activeMessage.created_at.endsWith('Z') ? '' : 'Z')).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    <br />
                    {new Date(activeMessage.created_at + (activeMessage.created_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div style={{
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  flex: 1
                }}>
                  {activeMessage.body}
                </div>

                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Status: <strong style={{ color: 'var(--green)' }}>✓ Verified Delivery</strong>
                  </span>
                  <button 
                    onClick={() => setActiveMessage(null)}
                    className="btn btn-secondary btn-sm"
                  >
                    Close Preview
                  </button>
                </div>
              </>
            ) : (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                <MessageSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>Select a message to read details</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Click on any message from the left list</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
