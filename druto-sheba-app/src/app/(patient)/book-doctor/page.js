'use client';
import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Activity } from 'lucide-react';
import { useUser } from '@/lib/UserContext';

export default function BookDoctorPage() {
  const { activePatient } = useUser();
  const patientId = activePatient?.id || 1;

  const [hospitals, setHospitals] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [doctors, setDoctors] = useState([]);
  
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  
  // Track patient's active appointments
  const [activeAppointment, setActiveAppointment] = useState(null);

  const loadData = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const [hRes, sRes, apptRes] = await Promise.all([
        fetch('/api/hospitals'),
        fetch('/api/specializations'),
        fetch(`/api/appointments?patient_id=${patientId}`)
      ]);
      const hospitalsData = hRes.ok ? await hRes.json() : [];
      const specsData = sRes.ok ? await sRes.json() : [];
      const appointmentsData = apptRes.ok ? await apptRes.json() : [];
      
      setHospitals(hospitalsData);
      setSpecs(specsData);
      
      const activeAppt = appointmentsData.find(a => ['Pending', 'Confirmed'].includes(a.status));
      if (activeAppt) {
        setActiveAppointment(activeAppt);
      } else {
        setActiveAppointment(null);
      }
    } catch (error) {
      console.error('Error loading page data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patientId]);

  useEffect(() => {
    async function loadDoctors() {
      if (!selectedHospital || !selectedSpec) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/doctors?hospital_id=${selectedHospital}&spec_id=${selectedSpec}&available_only=true`);
        if (res.ok) {
          const data = await res.json();
          setDoctors(data);
        }
      } catch (error) {
        console.error('Error loading doctors:', error);
      } finally {
        setLoading(false);
      }
    }
    loadDoctors();
  }, [selectedHospital, selectedSpec]);

  const handleBook = async (doctorId) => {
    setBookingLoading(true);
    
    const date = new Date();
    date.setDate(date.getDate() + 3);
    const dateString = date.toISOString().split('T')[0];

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          doctor_id: doctorId,
          appointment_date: dateString,
          appointment_time: '10:00:00'
        })
      });

      setBookingLoading(false);
      if (res.ok) {
        alert('Appointment request sent successfully!');
        loadData(); // reload active appointment from DB to get nested names
      } else {
        const errorData = await res.json();
        alert('Error booking appointment: ' + (errorData.error || 'Unknown error'));
      }
    } catch (err) {
      setBookingLoading(false);
      alert('Error booking appointment: ' + err.message);
    }
  };

  const handleCancelAppointment = async (assignmentId) => {
    if (!confirm('Are you sure you want to cancel your current appointment?')) return;
    setBookingLoading(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: assignmentId,
          status: 'Cancelled'
        })
      });
      setBookingLoading(false);
      if (res.ok) {
        setActiveAppointment(null);
        alert('Appointment cancelled successfully.');
        loadData();
      } else {
        const errorData = await res.json();
        alert('Failed to cancel appointment: ' + (errorData.error || 'Unknown error'));
      }
    } catch (err) {
      setBookingLoading(false);
      alert('Failed to cancel appointment: ' + err.message);
    }
  };

  return (
    <div className="page-container dot-pattern" style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <div>
          <h2>Book a Doctor</h2>
          <p className="page-header-sub">Find a specialist and request an appointment.</p>
        </div>
      </div>

      <div className="glass" style={{ padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Find a Specialist</h3>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Hospital</label>
            <select 
              className="form-select"
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
            >
              <option value="">-- Choose Hospital --</option>
              {hospitals.map(h => (
                <option key={h.hospital_id} value={h.hospital_id}>{h.name}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Specialization</label>
            <select 
              className="form-select"
              value={selectedSpec}
              onChange={(e) => setSelectedSpec(e.target.value)}
              disabled={!selectedHospital}
            >
              <option value="">-- Choose Specialization --</option>
              {specs.map(s => (
                <option key={s.spec_id} value={s.spec_id}>{s.spec_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="loading-container"><div className="spinner" /></div>}

      {selectedHospital && selectedSpec && !loading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Available Doctors</h3>
            {activeAppointment && (
              <div className="badge badge-critical" style={{ fontSize: '13px', padding: '6px 12px' }}>
                You already have an active appointment
              </div>
            )}
          </div>
          {doctors.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
              No available doctors found for this specialization at the selected hospital.
            </div>
          ) : (
            <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {doctors.map(doc => (
                <div key={doc.doctor_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: 'var(--blue-dim)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={24} />
                    </div>
                    <div>
                      <div className="card-title">{doc.name}</div>
                      <div className="card-row-label">{doc.phone}</div>
                    </div>
                  </div>
                  
                  {doc.doctor_schedules && doc.doctor_schedules.length > 0 && (
                    <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                        <Clock size={14} /> Schedule
                      </div>
                      {doc.doctor_schedules.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{s.day_of_week}</span>
                          <span style={{ fontWeight: '500' }}>{s.start_time.slice(0,5)} - {s.end_time.slice(0,5)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {activeAppointment && activeAppointment.doctor_id === doc.doctor_id ? (
                    <button 
                      className="btn btn-outline" 
                      style={{ width: '100%', justifyContent: 'center', marginTop: 'auto', borderColor: 'var(--red)', color: 'var(--red)' }}
                      onClick={() => handleCancelAppointment(activeAppointment.assignment_id)}
                      disabled={bookingLoading}
                    >
                      Cancel Appointment
                    </button>
                  ) : activeAppointment ? (
                    <button 
                      className="btn btn-secondary" 
                      style={{ width: '100%', justifyContent: 'center', marginTop: 'auto', opacity: 0.6, cursor: 'not-allowed' }}
                      disabled={true}
                    >
                      Already Booked Elsewhere
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
                      onClick={() => handleBook(doc.doctor_id)}
                      disabled={bookingLoading}
                    >
                      Request Appointment
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
