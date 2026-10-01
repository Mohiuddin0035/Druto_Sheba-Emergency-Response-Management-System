'use client';
import { useState, useEffect } from 'react';
import { User, CheckCircle2, XCircle, Calendar, Power, Plus } from 'lucide-react';

function getNextDateForDay(dayName) {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDay = daysOfWeek.indexOf(dayName);
  if (targetDay === -1) return new Date().toISOString().split('T')[0];
  
  const resultDate = new Date();
  const currentDay = resultDate.getDay();
  
  let steps = (targetDay - currentDay + 7) % 7;
  if (steps === 0) steps = 7;
  
  resultDate.setDate(resultDate.getDate() + steps);
  return resultDate.toISOString().split('T')[0];
}

export default function ManageDoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterHospital, setFilterHospital] = useState('');
  const [filterSpec, setFilterSpec] = useState('');
  const [selectedDays, setSelectedDays] = useState({});

  const [hospitalsList, setHospitalsList] = useState([]);
  const [specsList, setSpecsList] = useState([]);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ name: '', phone: '', hospital_id: '', spec_id: '' });
  const [addingDoctor, setAddingDoctor] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dRes, aRes, hRes, sRes] = await Promise.all([
        fetch('/api/doctors?t=' + Date.now()),
        fetch('/api/appointments?t=' + Date.now()),
        fetch('/api/hospitals?t=' + Date.now()),
        fetch('/api/specializations?t=' + Date.now())
      ]);
      
      const dbDoctors = dRes.ok ? await dRes.json() : [];
      const dbAssignments = aRes.ok ? await aRes.json() : [];
      const dbHospitals = hRes.ok ? await hRes.json() : [];
      const dbSpecs = sRes.ok ? await sRes.json() : [];

      setDoctors(dbDoctors);
      setAssignments(dbAssignments);
      setHospitalsList(dbHospitals);
      setSpecsList(dbSpecs);
    } catch (err) {
      console.error('Error loading admin doctors/appointments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleAvailability = async (doctorId, currentStatus) => {
    try {
      const res = await fetch('/api/doctors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: doctorId,
          is_available: !currentStatus
        })
      });
      if (res.ok) {
        loadData();
      } else {
        const errorData = await res.json();
        alert('Failed to toggle availability: ' + (errorData.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to toggle availability: ' + err.message);
    }
  };

  const updateAssignmentStatus = async (assignmentId, status, dateVal = null, timeVal = null, paymentStatusVal = null) => {
    try {
      const payload = {
        assignment_id: assignmentId,
        status: status
      };
      if (dateVal) payload.appointment_date = dateVal;
      if (timeVal) payload.appointment_time = timeVal;
      if (paymentStatusVal) payload.payment_status = paymentStatusVal;

      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        loadData();
      } else {
        const errorData = await res.json();
        alert('Failed to update status: ' + (errorData.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    if (!newDoctor.name || !newDoctor.hospital_id || !newDoctor.spec_id) {
      alert('Please fill out all required fields.');
      return;
    }
    setAddingDoctor(true);
    try {
      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoctor)
      });
      if (res.ok) {
        setNewDoctor({ name: '', phone: '', hospital_id: '', spec_id: '' });
        setShowAddDoctor(false);
        loadData();
      } else {
        const errorData = await res.json();
        alert('Failed to add doctor: ' + (errorData.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to add doctor: ' + err.message);
    } finally {
      setAddingDoctor(false);
    }
  };

  if (loading) {
    return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;
  }

  const uniqueHospitals = Array.from(new Set(doctors.map(d => d.hospitals?.name))).filter(Boolean).sort();
  const uniqueSpecs = Array.from(new Set(doctors.map(d => d.specializations?.spec_name))).filter(Boolean).sort();

  const filteredDoctors = doctors.filter(doc => {
    if (filterHospital && doc.hospitals?.name !== filterHospital) return false;
    if (filterSpec && doc.specializations?.spec_name !== filterSpec) return false;
    return true;
  });

  return (
    <div className="page-container dot-pattern" style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <div>
          <h2>Manage Doctors & Appointments</h2>
          <p className="page-header-sub">Update doctor availability and manage patient assignments.</p>
        </div>
      </div>

      <div className="content-grid">
        
        {/* Doctors List */}
        <div className="section-card">
          <div className="section-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} /> Doctors Directory ({filteredDoctors.length})
              </h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddDoctor(!showAddDoctor)}>
                <Plus size={14} /> Add Doctor
              </button>
            </div>
            <div className="form-row">
              <select className="form-select" style={{ padding: '8px 12px', fontSize: '13px' }} value={filterHospital} onChange={e => setFilterHospital(e.target.value)}>
                <option value="">All Hospitals</option>
                {uniqueHospitals.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <select className="form-select" style={{ padding: '8px 12px', fontSize: '13px' }} value={filterSpec} onChange={e => setFilterSpec(e.target.value)}>
                <option value="">All Departments</option>
                {uniqueSpecs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {showAddDoctor && (
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-input)' }}>
              <form onSubmit={handleAddDoctor} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Doctor's Name *" 
                  value={newDoctor.name} 
                  onChange={e => setNewDoctor({...newDoctor, name: e.target.value})} 
                  required 
                />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Phone Number" 
                  value={newDoctor.phone} 
                  onChange={e => setNewDoctor({...newDoctor, phone: e.target.value})} 
                />
                <select 
                  className="form-select" 
                  value={newDoctor.hospital_id} 
                  onChange={e => setNewDoctor({...newDoctor, hospital_id: e.target.value})} 
                  required
                >
                  <option value="">Select Hospital *</option>
                  {hospitalsList.map(h => <option key={h.hospital_id} value={h.hospital_id}>{h.name}</option>)}
                </select>
                <select 
                  className="form-select" 
                  value={newDoctor.spec_id} 
                  onChange={e => setNewDoctor({...newDoctor, spec_id: e.target.value})} 
                  required
                >
                  <option value="">Select Specialization *</option>
                  {specsList.map(s => <option key={s.spec_id} value={s.spec_id}>{s.spec_name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddDoctor(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={addingDoctor}>
                    {addingDoctor ? 'Saving...' : 'Save Doctor'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="section-body" style={{ maxHeight: '600px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredDoctors.map(doc => (
              <div key={doc.doctor_id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="card-title" style={{ marginBottom: '4px' }}>{doc.name}</div>
                  <div className="card-row-label" style={{ marginBottom: '12px' }}>{doc.hospitals?.name} • {doc.specializations?.spec_name}</div>
                  
                  <div className={`badge ${doc.is_available ? 'badge-available' : 'badge-maintenance'}`}>
                    <div className="badge-dot"></div>
                    {doc.is_available ? 'Available' : 'Unavailable'}
                  </div>
                </div>
                
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => toggleAvailability(doc.doctor_id, doc.is_available)}
                >
                  <Power size={14} /> Toggle
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Assignments List */}
        <div className="section-card">
          <div className="section-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} /> Appointments
            </h3>
          </div>
          <div className="section-body" style={{ maxHeight: '600px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assignments.map(a => (
              <div key={a.assignment_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="card-title">Patient: {a.patients?.name}</div>
                    <div className="card-row-label" style={{ marginTop: '4px' }}>Doctor: {a.doctors?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      {a.appointment_date} at {a.appointment_time?.slice(0,5)}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '12px' }}>
                      <span className={`badge ${a.payment_status === 'Paid' ? 'badge-available' : 'badge-maintenance'}`}>
                        {a.payment_status === 'Paid' ? '💳 Paid' : '⏳ Unpaid'}
                      </span>
                      {a.payment_reminder_sent && (
                        <span className="badge" style={{ background: 'rgba(255,159,10,0.15)', color: '#ff9f0a', padding: '3px 8px', borderRadius: '6px', fontSize: '10px' }}>
                          📢 Reminder Sent
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`badge ${
                    a.status === 'Confirmed' ? 'badge-available' :
                    a.status === 'Pending' ? 'badge-pending' :
                    a.status === 'Cancelled' ? 'badge-critical' : 'badge-admitted'
                  }`}>
                    <div className="badge-dot"></div>
                    {a.status}
                  </div>
                </div>
                
                {a.status === 'Pending' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {(() => {
                      const docObj = doctors.find(d => d.doctor_id === a.doctor_id);
                      const docSchedules = docObj?.doctor_schedules || [];
                      return (
                        <>
                          {a.payment_status !== 'Paid' && (
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ width: '100%', justifyContent: 'center' }}
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/appointments', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ assignment_id: a.assignment_id, payment_reminder_sent: true })
                                  });
                                  if (res.ok) {
                                    alert('Payment reminder notification triggered!');
                                    loadData();
                                  }
                                } catch (e) {
                                  alert('Error sending reminder: ' + e.message);
                                }
                              }}
                            >
                              📢 Send Payment Reminder
                            </button>
                          )}
                          
                          {docSchedules.length > 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', marginBottom: '8px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Choose Appointment Day:</span>
                              <select 
                                className="form-select" 
                                style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                                value={selectedDays[a.assignment_id] || ''}
                                onChange={e => setSelectedDays({ ...selectedDays, [a.assignment_id]: e.target.value })}
                              >
                                <option value="">-- Select Day --</option>
                                {docSchedules.map(ds => (
                                  <option key={ds.day_of_week} value={JSON.stringify(ds)}>
                                    {ds.day_of_week} ({ds.start_time.slice(0,5)} - {ds.end_time.slice(0,5)})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button 
                              className="btn btn-primary btn-sm" 
                              style={{ flex: 1, justifyContent: 'center' }} 
                              disabled={a.payment_status !== 'Paid'}
                              title={a.payment_status !== 'Paid' ? 'Patient must pay before confirming' : ''}
                              onClick={() => {
                                let finalDate = null;
                                let finalTime = null;
                                
                                if (docSchedules.length > 1) {
                                  const selectedDayRaw = selectedDays[a.assignment_id];
                                  if (!selectedDayRaw) {
                                    alert('Please select an appointment day from the dropdown first!');
                                    return;
                                  }
                                  const ds = JSON.parse(selectedDayRaw);
                                  finalDate = getNextDateForDay(ds.day_of_week);
                                  finalTime = ds.start_time;
                                } else if (docSchedules.length === 1) {
                                  finalDate = getNextDateForDay(docSchedules[0].day_of_week);
                                  finalTime = docSchedules[0].start_time;
                                }
                                
                                updateAssignmentStatus(a.assignment_id, 'Confirmed', finalDate, finalTime);
                              }}
                            >
                              Confirm
                            </button>
                            <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => updateAssignmentStatus(a.assignment_id, 'Cancelled')}>
                              Cancel
                            </button>
                          </div>

                          {/* Refund Button */}
                          <div style={{ marginTop: '6px' }}>
                            <button 
                              className="btn btn-sm" 
                              style={{ 
                                width: '100%', 
                                justifyContent: 'center', 
                                backgroundColor: '#fef2f2', 
                                color: '#b91c1c', 
                                border: '1px solid #fecaca',
                                fontWeight: '600'
                              }}
                              onClick={() => {
                                if (confirm('Are you sure you want to refund this patient and cancel the appointment? An automated refund notice will be sent to the patient inbox.')) {
                                  updateAssignmentStatus(a.assignment_id, 'Cancelled', null, null, 'Refunded');
                                }
                              }}
                            >
                              Refund & Cancel
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                {a.status === 'Confirmed' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                    <button className="btn btn-blue btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => updateAssignmentStatus(a.assignment_id, 'Completed')}>
                      Mark Completed
                    </button>
                    <button 
                      className="btn btn-sm" 
                      style={{ 
                        width: '100%', 
                        justifyContent: 'center', 
                        backgroundColor: '#fef2f2', 
                        color: '#b91c1c', 
                        border: '1px solid #fecaca',
                        fontWeight: '600'
                      }}
                      onClick={() => {
                        if (confirm('Cancel confirmed appointment and issue full refund to patient?')) {
                          updateAssignmentStatus(a.assignment_id, 'Cancelled', null, null, 'Refunded');
                        }
                      }}
                    >
                      Refund & Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
