'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Plus, Zap, Filter } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '@/components/Badges';
import Modal from '@/components/Modal';

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ patient_id: '', severity_level: 'Medium', lat: '23.7925', lon: '90.4125' });

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, patRes] = await Promise.all([
        fetch(`/api/requests?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/patients?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
      ]);
      setRequests(reqRes);
      setPatients(patRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useAutoRefresh(fetchData);
  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();

  }, [fetchData]);


  const handleCreate = async () => {
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: parseInt(form.patient_id),
          severity_level: form.severity_level,
          lat: parseFloat(form.lat),
          lon: parseFloat(form.lon),
        }),
      });
      setShowModal(false);
      setForm({ patient_id: '', severity_level: 'Medium', lat: '23.7925', lon: '90.4125' });
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDispatch = async (requestId) => {
    const res = await fetch('/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId }),
    });
    const result = await res.json();
    alert(result.message);
    fetchData();
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    await fetch('/api/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, status: newStatus }),
    });
    fetchData();
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Emergency Requests</h2>
          <p className="page-header-sub">{requests.length} total requests</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Emergency
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div className="tabs">
          {['all', 'Pending', 'Active', 'En Route', 'Picked Up', 'Resolved', 'Cancelled'].map(t => (
            <button key={t} className={`tab-btn ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Patient</th>
              <th>Phone</th>
              <th>Blood</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.request_id}>
                <td style={{ fontWeight: 600 }}>#{r.request_id}</td>
                <td>{r.patient_name}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{r.phone}</td>
                <td>{r.blood_type}</td>
                <td><SeverityBadge level={r.severity_level} /></td>
                <td><StatusBadge status={r.status} /></td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  {new Date(r.timestamp_created).toLocaleString()}
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  {r.status === 'Pending' && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleDispatch(r.request_id)}>
                      <Zap size={13} /> Dispatch
                    </button>
                  )}
                  {r.status === 'Active' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleStatusUpdate(r.request_id, 'Resolved')}>
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8}><div className="empty-state"><p>No requests found</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Emergency Request" footer={
        <><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={!form.patient_id}>Create Request</button></>
      }>
        <div className="form-group">
          <label className="form-label">Patient</label>
          <select className="form-input form-select" value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })}>
            <option value="">Select patient...</option>
            {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.name} ({p.blood_type})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Severity Level</label>
          <select className="form-input form-select" value={form.severity_level} onChange={e => setForm({ ...form, severity_level: e.target.value })}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Latitude</label>
            <input className="form-input" type="number" step="0.0001" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Longitude</label>
            <input className="form-input" type="number" step="0.0001" value={form.lon} onChange={e => setForm({ ...form, lon: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
