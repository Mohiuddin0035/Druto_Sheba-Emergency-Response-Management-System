'use client';
import { useState, useEffect } from 'react';
import { Calendar, Clock, User, XCircle, CheckCircle } from 'lucide-react';
import { useUser } from '@/lib/UserContext';

export default function PatientAppointmentsPage() {
  const { activePatient } = useUser();
  const patientId = activePatient?.id || 1;

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAppointments = async () => {
    if (!patientId) return setLoading(false);
    try {
      setLoading(true);
      const res = await fetch(`/api/appointments?patient_id=${patientId}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data || []);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [patientId]);

  const handleCancel = async (assignmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    
    const appToCancel = appointments.find(a => a.assignment_id === assignmentId);
    const wasPaid = appToCancel && appToCancel.payment_status === 'Paid';

    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: assignmentId,
          status: 'Cancelled'
        })
      });
      if (res.ok) {
        if (wasPaid) {
          alert('You got your refund');
        } else {
          alert('Appointment cancelled successfully.');
        }
        loadAppointments();
      } else {
        const errorData = await res.json();
        alert('Failed to cancel appointment: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to cancel appointment: ' + error.message);
    }
  };

  return (
    <div className="page-container dot-pattern" style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <div>
          <h2>My Appointments</h2>
          <p className="page-header-sub">View and manage your doctor appointments.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : appointments.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
          <Calendar size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3>No Appointments Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>You haven't booked any doctor appointments yet.</p>
        </div>
      ) : (
        <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {appointments.map(app => (
            <div key={app.assignment_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'var(--blue-dim)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <div className="card-title" style={{ fontSize: '15px' }}>{app.doctors?.name}</div>
                    <div className="card-row-label">{app.doctors?.specializations?.spec_name}</div>
                  </div>
                </div>
                <div className={`badge ${app.status === 'Pending' ? 'badge-low' : app.status === 'Confirmed' ? 'badge-ok' : 'badge-critical'}`}>
                  {app.status}
                </div>
              </div>
              
              <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-sm)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <Calendar size={16} color="var(--blue)" />
                  <span style={{ fontWeight: '600' }}>Date:</span> {new Date(app.appointment_date).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <Clock size={16} color="var(--orange)" />
                  <span style={{ fontWeight: '600' }}>Time:</span> {app.appointment_time?.slice(0, 5) || 'TBD'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <User size={16} color="var(--green)" />
                  <span style={{ fontWeight: '600' }}>Hospital:</span> {app.doctors?.hospitals?.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <span style={{ fontWeight: '600' }}>Payment:</span> 
                  <span className={`badge ${
                    app.payment_status === 'Paid' ? 'badge-ok' : 
                    app.payment_status === 'Refunded' ? 'badge-critical' : 
                    app.payment_status === 'N/A' ? 'badge-medium' : 'badge-low'
                  }`} style={{ marginLeft: '4px' }}>
                    {app.payment_status}
                  </span>
                </div>
              </div>
              
              <div style={{ background: 'rgba(255, 69, 58, 0.08)', border: '1px solid rgba(255, 69, 58, 0.25)', padding: '10px 12px', borderRadius: '8px', fontSize: '11px', color: 'var(--red)', lineHeight: 1.4 }}>
                ⚠️ <strong>Note:</strong> If payment is not completed within 3 hours, your appointment will be automatically cancelled.
              </div>

              {app.payment_status !== 'Paid' && app.payment_status !== 'Refunded' && app.payment_status !== 'N/A' && app.payment_reminder_sent && (
                <div style={{ background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.3)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#ff9f0a' }}>
                  ⚠️ <strong>For confirm your appointment, please pay the bill.</strong>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                {app.payment_status === 'Unpaid' && app.status !== 'Cancelled' && (
                  <button 
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => {
                      window.location.href = `/payment?purpose=Patient_Medical_Bill&id=${app.assignment_id}&phone=${activePatient?.phone || ''}&amount=100&returnUrl=/appointments`;
                    }}
                  >
                    Pay Bill (৳100)
                  </button>
                )}
                {(app.status === 'Pending' || app.status === 'Confirmed') && (
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: (app.payment_status === 'Unpaid' && app.status !== 'Cancelled') ? 1 : 'none', width: (app.payment_status === 'Unpaid' && app.status !== 'Cancelled') ? 'auto' : '100%', justifyContent: 'center', borderColor: 'var(--red)', color: 'var(--red)' }}
                    onClick={() => handleCancel(app.assignment_id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
