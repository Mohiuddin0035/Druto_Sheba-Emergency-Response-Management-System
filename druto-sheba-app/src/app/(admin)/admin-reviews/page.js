'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { MessageSquare, Star, User } from 'lucide-react';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(() => {
    fetch(`/api/reviews?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(setReviews)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useAutoRefresh(fetchReviews);

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Patient Reviews & Feedback</h2>
          <p className="page-header-sub">Monitor overall patient satisfaction and comments</p>
        </div>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
        {reviews.map((r) => (
          <div key={r.feedback_id} className="section-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(10,132,255,0.1)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{r.patient_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2, fontWeight: 700 }}>Trip #{r.trip_id}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} size={16} fill={idx < r.rating ? 'var(--yellow)' : 'none'} stroke={idx < r.rating ? 'var(--yellow)' : 'var(--border-subtle)'} />
                ))}
              </div>
            </div>

            <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                "{r.comments || 'No written comments provided.'}"
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 16, borderTop: '1px dashed var(--border-subtle)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600 }}>Driver:</span> {r.driver_name} ({r.license_plate})
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {new Date(r.submitted_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="section-card" style={{ gridColumn: '1 / -1', padding: 60, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <MessageSquare size={48} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <div>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>No Reviews Yet</h3>
              <p style={{ color: 'var(--text-muted)' }}>Patients have not submitted any feedback for completed trips.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
