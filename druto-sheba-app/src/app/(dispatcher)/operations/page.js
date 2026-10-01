'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { ClipboardPlus, RefreshCw, Route, Truck, Building2, Clock, Radio } from 'lucide-react';
import { SeverityBadge, StatusBadge, EquipmentBadge } from '@/components/Badges';
import { useToast } from '@/components/Toast';

const initialCall = {
  name: '',
  phone: '',
  blood_type: 'O+',
  emergency_type: 'General',
  requested_for: 'Call-in patient',
  severity: 'High',
  lat: '23.7750',
  lon: '90.4100',
};

export default function DispatcherOperationsPage() {
  const toast = useToast();
  const [data, setData] = useState({ triage_queue: [], ambulances: [], drivers: [], hospitals: [] });
  const [callForm, setCallForm] = useState(initialCall);
  const [assignment, setAssignment] = useState({ request_id: '', vehicle_id: '', driver_id: '', hospital_id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/dispatcher/operations?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      setData({
        triage_queue: json.triage_queue || [],
        ambulances: json.ambulances || [],
        drivers: json.drivers || [],
        hospitals: json.hospitals || [],
        audit: json.audit || [],
      });
    } catch {
      toast('Failed to refresh dispatcher operations.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useAutoRefresh(fetchData);
  useEffect(() => {
    fetchData();

  }, [fetchData]);

  const availableAmbulances = useMemo(() => data.ambulances.filter((a) => a.current_status === 'Available'), [data.ambulances]);
  const availableDrivers = useMemo(() => data.drivers.filter((d) => ['Available', 'On_Duty', 'Dispatched'].includes(d.shift_status)), [data.drivers]);

  const createCallIn = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/dispatcher/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callForm),
      });
      if (!res.ok) throw new Error();
      toast('Call-in emergency request created.', 'success');
      setCallForm(initialCall);
      fetchData();
    } catch {
      toast('Failed to create call-in request.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const assignManually = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/dispatcher/operations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast(json.message, 'success', { title: 'Manual Assignment' });
      fetchData();
    } catch (err) {
      toast(err.message || 'Manual assignment failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Dispatch Operations</h2>
          <p className="page-header-sub">Call-in entry, triage, override assignment, fleet, and hospital coordination</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData}><RefreshCw size={16} /> Refresh</button>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1.1fr 0.9fr' }}>
        <div className="section-card">
          <div className="section-header"><h3><ClipboardPlus size={16} /> Hotline Call-in Entry</h3></div>
          <form onSubmit={createCallIn} className="section-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input required className="form-input" placeholder="Caller / patient name" value={callForm.name} onChange={e => setCallForm({ ...callForm, name: e.target.value })} />
            <input required className="form-input" placeholder="Phone" value={callForm.phone} onChange={e => setCallForm({ ...callForm, phone: e.target.value })} />
            <select className="form-input form-select" value={callForm.emergency_type} onChange={e => setCallForm({ ...callForm, emergency_type: e.target.value })}>
              <option>Accident</option><option>Cardiac</option><option>Maternity</option><option>General</option>
            </select>
            <select className="form-input form-select" value={callForm.severity} onChange={e => setCallForm({ ...callForm, severity: e.target.value })}>
              <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
            <input className="form-input" placeholder="Requested for" value={callForm.requested_for} onChange={e => setCallForm({ ...callForm, requested_for: e.target.value })} />
            <select className="form-input form-select" value={callForm.blood_type} onChange={e => setCallForm({ ...callForm, blood_type: e.target.value })}>
              <option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
            </select>
            <input className="form-input" placeholder="Latitude" value={callForm.lat} onChange={e => setCallForm({ ...callForm, lat: e.target.value })} />
            <input className="form-input" placeholder="Longitude" value={callForm.lon} onChange={e => setCallForm({ ...callForm, lon: e.target.value })} />
            <button className="btn btn-primary" disabled={saving} style={{ gridColumn: '1 / -1' }}><ClipboardPlus size={16} /> Create Request</button>
          </form>
        </div>

        <div className="section-card">
          <div className="section-header"><h3><Route size={16} /> Manual Override</h3></div>
          <form onSubmit={assignManually} className="section-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <select required className="form-input form-select" value={assignment.request_id} onChange={e => setAssignment({ ...assignment, request_id: e.target.value })}>
              <option value="">Select request</option>
              {data.triage_queue.map((r) => <option key={r.request_id} value={r.request_id}>#{r.request_id} · {r.patient_name} · {r.severity_level}</option>)}
            </select>
            <select required className="form-input form-select" value={assignment.vehicle_id} onChange={e => setAssignment({ ...assignment, vehicle_id: e.target.value })}>
              <option value="">Select ambulance</option>
              {availableAmbulances.map((a) => <option key={a.vehicle_id} value={a.vehicle_id}>{a.license_plate} · {a.equipment_level}</option>)}
            </select>
            <select required className="form-input form-select" value={assignment.driver_id} onChange={e => setAssignment({ ...assignment, driver_id: e.target.value })}>
              <option value="">Select driver</option>
              {availableDrivers.map((d) => <option key={d.driver_id} value={d.driver_id}>{d.name} · {d.shift_status}</option>)}
            </select>
            <select required className="form-input form-select" value={assignment.hospital_id} onChange={e => setAssignment({ ...assignment, hospital_id: e.target.value })}>
              <option value="">Select hospital</option>
              {data.hospitals.map((h) => <option key={h.hospital_id} value={h.hospital_id}>{h.name} · ICU {h.icu_beds} · General {h.general_beds}</option>)}
            </select>
            <button className="btn btn-primary" disabled={saving}><Route size={16} /> Assign Unit</button>
          </form>
        </div>
      </div>

      <div className="table-wrapper" style={{ marginTop: 24 }}>
        <div className="table-header"><h3><Clock size={16} /> Triage Queue</h3></div>
        <table>
          <thead><tr><th>Request</th><th>Patient</th><th>Severity</th><th>Type</th><th>Wait</th><th>Status</th><th>Unit</th></tr></thead>
          <tbody>
            {data.triage_queue.map((r) => (
              <tr key={r.request_id}>
                <td>#{r.request_id}</td>
                <td>{r.patient_name}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.requested_for || 'Self'}</div></td>
                <td><SeverityBadge level={r.severity_level} /></td>
                <td>{r.emergency_type || 'General'}</td>
                <td>{r.wait_minutes || 0} min</td>
                <td><StatusBadge status={r.request_status} /></td>
                <td>{r.assigned_ambulance || 'Unassigned'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 24 }}>
        <div className="section-card">
          <div className="section-header"><h3><Radio size={16} /> Live Fleet Board</h3></div>
          <div className="section-body" style={{ display: 'grid', gap: 10, maxHeight: 600, overflowY: 'auto' }}>
            {data.ambulances.map((a) => (
              <div key={a.vehicle_id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center', padding: 12 }}>
                <div><strong>{a.license_plate}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.hub || 'Central Hub'} · {a.lat?.toFixed?.(4) || '23.7750'}, {a.lon?.toFixed?.(4) || '90.4100'}</div></div>
                <EquipmentBadge level={a.equipment_level} />
                <StatusBadge status={a.current_status} />
              </div>
            ))}
          </div>
        </div>

        <div className="section-card">
          <div className="section-header"><h3><Building2 size={16} /> Hospital Coordination</h3></div>
          <div className="section-body" style={{ display: 'grid', gap: 10, maxHeight: 600, overflowY: 'auto' }}>
            {data.hospitals.map((h) => (
              <div key={h.hospital_id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: 12 }}>
                <div><strong>{h.name}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.type} · {(h.specializations || []).slice?.(0, 3).join(', ')}</div></div>
                <div style={{ textAlign: 'right', fontWeight: 800 }}>ICU {h.icu_beds}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>General {h.general_beds}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
