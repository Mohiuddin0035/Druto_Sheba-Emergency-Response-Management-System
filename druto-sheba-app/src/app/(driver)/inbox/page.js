'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useUser } from '@/lib/UserContext';
import { 
  Bell, Mail, AlertTriangle, ShieldAlert, 
  CheckCircle2, Clock, Info, RefreshCw, MessageSquare
} from 'lucide-react';

export default function DriverInbox() {
  const { activeDriver } = useUser();
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMessage, setActiveMessage] = useState(null);
  const isFirstLoad = useRef(true);

  const fetchInbox = useCallback(async () => {
    if (!activeDriver?.id) return;
    try {
      if (isFirstLoad.current) setLoading(true);
      setIsRefreshing(true);
      const res = await fetch(`/api/driver/inbox?driver_id=${activeDriver.id}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error('Error fetching driver inbox:', err);
    } finally {
      setIsRefreshing(false);
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, [activeDriver]);

  useAutoRefresh(fetchInbox);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const handleMarkAsRead = async (msg) => {
    setActiveMessage(msg);
    if (!msg.is_read) {
      try {
        await fetch('/api/driver/inbox', {
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

  if (!activeDriver) return null;

  const getCategoryBadge = (category, priority) => {
    if (priority === 'URGENT' || category === 'LEGAL_NOTICE' || category === 'SUSPENSION') {
      return (
        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'rgba(255, 69, 58, 0.2)', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ShieldAlert size={12} /> {category.replace('_', ' ')}
        </span>
      );
    }
    if (category === 'PAYMENT_REMINDER' || category === 'WARNING') {
      return (
        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'rgba(255, 159, 10, 0.2)', color: 'var(--orange)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={12} /> {category.replace('_', ' ')}
        </span>
      );
    }
    return (
      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'rgba(10, 132, 255, 0.2)', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Info size={12} /> {category.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2>Driver Inbox & Official Notices</h2>
            {unreadCount > 0 ? (
              <span style={{ 
                fontSize: 11, 
                fontWeight: 800, 
                padding: '3px 8px', 
                borderRadius: 12, 
                background: 'var(--red)', 
                color: '#fff' 
              }}>
                {unreadCount} New
              </span>
            ) : (
              <span style={{ 
                fontSize: 11, 
                fontWeight: 700, 
                padding: '3px 8px', 
                borderRadius: 12, 
                background: 'rgba(255,255,255,0.08)', 
                color: 'var(--text-muted)' 
              }}>
                All Read
              </span>
            )}
          </div>
          <p className="page-header-sub">
            Direct communications, settlement reminders, and official notices from Druto Sheba Administration
          </p>
        </div>

        <button 
          onClick={fetchInbox}
          disabled={isRefreshing}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '8px 14px', opacity: isRefreshing ? 0.7 : 1 }}
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} /> {isRefreshing ? 'Refreshing...' : 'Refresh Inbox'}
        </button>
      </div>

      {/* Main Inbox Layout: Split View (List on left, preview on right) */}
      <div style={{ display: 'grid', gridTemplateColumns: messages.length > 0 ? 'minmax(320px, 1fr) minmax(360px, 1.4fr)' : '1fr', gap: 20 }}>
        {/* Messages List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div className="glass" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading notices...
            </div>
          ) : messages.length === 0 ? (
            <div className="glass" style={{ padding: 40, textAlign: 'center', borderRadius: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Mail size={24} />
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Your Inbox is Empty</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                You have no official reminders or policy notices at this time.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isSelected = activeMessage?.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => handleMarkAsRead(m)}
                  className="glass"
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: isSelected ? '1.5px solid var(--orange)' : '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(255, 159, 10, 0.08)' : !m.is_read ? 'rgba(255, 255, 255, 0.04)' : undefined,
                    boxShadow: isSelected ? '0 0 12px rgba(255, 159, 10, 0.2)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {!m.is_read && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--orange)' }} />
                      )}
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                        From: {m.sender}
                      </span>
                    </div>
                    {getCategoryBadge(m.category, m.priority)}
                  </div>

                  <h4 style={{ fontSize: 14, fontWeight: m.is_read ? 600 : 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {m.title}
                  </h4>

                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {m.body}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{m.date}</span>
                    {m.is_read ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--green)' }}>
                        <CheckCircle2 size={12} /> Read
                      </span>
                    ) : (
                      <span style={{ color: 'var(--orange)', fontWeight: 700 }}>Unread</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Preview Pane */}
        {messages.length > 0 && (
          <div className="section-card" style={{ padding: 24, borderRadius: 14, alignSelf: 'start' }}>
            {activeMessage ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: 16, marginBottom: 18 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {getCategoryBadge(activeMessage.category, activeMessage.priority)}
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Official Notice</span>
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {activeMessage.title}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: 600 }}>{activeMessage.sender}</div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>{activeMessage.date}</div>
                  </div>
                </div>

                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-line', marginBottom: 24 }}>
                  {activeMessage.body}
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 10, padding: 14, border: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  🛡️ <strong>Official Notice Policy:</strong> All correspondence delivered to your Druto Sheba Driver Inbox is legally recorded under your verified driver ID (NEX-D-{1000 + activeDriver.id}). If this notice requires settlement, please visit the <strong>Bill Pay</strong> tab.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ fontSize: 14 }}>Select a notice from the left to read full details.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
