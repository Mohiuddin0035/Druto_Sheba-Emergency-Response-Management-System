'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { FileText, MapPin, Download, CheckCircle, Clock, Star } from 'lucide-react';
import { SeverityBadge } from '@/components/Badges';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { useUser } from '@/lib/UserContext';

export default function PatientHistoryPage() {
  const { activePatient } = useUser();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [ratingData, setRatingData] = useState({ rating: 5, comments: '' });
  
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoiceTrip, setSelectedInvoiceTrip] = useState(null);

  const handleOpenRating = (trip) => {
    setSelectedTrip(trip);
    setRatingData({ rating: 5, comments: '' });
    setShowRatingModal(true);
  };

  const submitRating = async () => {
    try {
      const res = await fetch('/api/trips/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: selectedTrip.id, rating: ratingData.rating, comments: ratingData.comments })
      });
      if (res.ok) {
        toast('Thank you for your feedback!', 'success');
        setShowRatingModal(false);
        setHistory(prev => prev.map(t => t.id === selectedTrip.id ? { ...t, hasRating: true } : t));
      } else {
        toast('Failed to submit rating.', 'error');
      }
    } catch (err) {
      toast('Failed to submit rating.', 'error');
    }
  };

  const fetchHistory = useCallback(async () => {
    try {
      const url = activePatient?.id 
        ? `/api/patient/history?patient_id=${activePatient.id}` 
        : '/api/patient/history';
      const res = await fetch(url);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, [activePatient]);

  useAutoRefresh(fetchHistory);
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (!activePatient) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Emergency History</h2>
          <p className="page-header-sub">Review your past ambulance requests, assigned drivers, and feedback</p>
        </div>
        <div className="live-indicator"><div className="live-dot" /> LIVE</div>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr' }}>
        {loading ? <div className="loading-container" style={{ minHeight: 200 }}><div className="spinner" /></div> : history.length > 0 ? history.map((trip) => (
          <div key={trip.id} className="section-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'transform 0.2s' }}>
            
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
               <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(48,209,88,0.1)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                 <CheckCircle size={24} />
               </div>
               <div>
                 <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>Trip #{trip.id || 'Req'}</h3>
                    <SeverityBadge level={trip.severity} />
                 </div>
                 <div style={{ display: 'flex', gap: 16, color: 'var(--text-secondary)', fontSize: 13, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14}/> {trip.date}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14}/> {trip.from} → {trip.hospital}</span>
                    {trip.driver_name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--blue)' }}>
                        👤 Driver: <strong>{trip.driver_name}</strong>
                      </span>
                    )}
                 </div>
               </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button 
                className={`btn btn-sm ${trip.hasRating ? 'btn-ghost' : 'btn-primary'}`} 
                onClick={() => !trip.hasRating && trip.status === 'Resolved' && handleOpenRating(trip)} 
                disabled={trip.hasRating || trip.status !== 'Resolved'}
                style={{ 
                  padding: '8px 18px', 
                  background: trip.hasRating || trip.status !== 'Resolved' ? 'rgba(255,255,255,0.05)' : 'var(--blue)', 
                  color: trip.hasRating || trip.status !== 'Resolved' ? 'var(--text-muted)' : 'white',
                  opacity: trip.hasRating || trip.status !== 'Resolved' ? 0.7 : 1,
                  cursor: trip.hasRating || trip.status !== 'Resolved' ? 'not-allowed' : 'pointer'
                }} 
                title={trip.status !== 'Resolved' ? 'Trip not completed yet' : (trip.hasRating ? 'Feedback submitted' : 'Leave Review')}
              >
                <Star size={16} fill={trip.hasRating ? 'var(--yellow)' : 'none'} stroke={trip.hasRating ? 'var(--yellow)' : 'currentColor'} /> 
                {trip.hasRating ? 'Rated' : 'Rate Trip'}
              </button>
            </div>

          </div>
        )) : (
          <div className="section-card">
            <div className="empty-state">
              <p>No emergency history found for this patient.</p>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} title="Rate Your Experience" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setShowRatingModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={submitRating}>Submit Feedback</button>
        </>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>How was your trip to {selectedTrip?.hospital}?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star 
                  key={star} 
                  size={32} 
                  fill={ratingData.rating >= star ? 'var(--yellow)' : 'none'} 
                  color={ratingData.rating >= star ? 'var(--yellow)' : 'var(--border-accent)'} 
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => setRatingData({ ...ratingData, rating: star })}
                />
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Additional Comments (Optional)</label>
            <textarea 
              className="form-input" 
              rows={4} 
              placeholder="Tell us about the driver, the ambulance condition, or your overall experience..."
              value={ratingData.comments}
              onChange={e => setRatingData({ ...ratingData, comments: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={showInvoiceModal} 
        onClose={() => setShowInvoiceModal(false)} 
        title={`Invoice #INV-${selectedInvoiceTrip?.id}`} 
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => {
              window.print();
            }}>
              <Download size={16} /> Download PDF
            </button>
          </>
        }
      >
        {selectedInvoiceTrip && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 24, border: '1px dashed var(--border-accent)', borderRadius: 12, background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Date:</span>
                <span style={{ fontWeight: 600 }}>{selectedInvoiceTrip.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Patient:</span>
                <span style={{ fontWeight: 600 }}>{activePatient?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Destination:</span>
                <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{selectedInvoiceTrip.hospital}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Driver:</span>
                <span style={{ fontWeight: 600, color: 'var(--blue)' }}>
                  {selectedInvoiceTrip.driver_name || 'Assigned Driver'} 
                  {selectedInvoiceTrip.ambulance_plate ? ` (${selectedInvoiceTrip.ambulance_plate})` : ''}
                </span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px dashed var(--border-subtle)', margin: '16px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Total Amount:</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue)' }}>{selectedInvoiceTrip.fare}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
