'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Wrench, CheckCircle, Plus, Truck, History, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { StatusBadge } from '@/components/Badges';

export default function MaintenanceHub() {
  const [data, setData] = useState({ active: [], history: [], available_ambulances: [] });
  const [loading, setLoading] = useState(true);
  const [modalConfig, setModalConfig] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    vehicle_id: '',
    maintenance_type: '',
    description: '',
    estimated_cost: '',
    technician_name: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const openModal = (type) => {
    setFormData({
      vehicle_id: '',
      maintenance_type: type === 'General Repair' ? '' : type,
      description: type === 'Oxygen Cylinder Restock' ? 'Restocking 50L oxygen cylinder' : (type === 'Defibrillator Repair' ? 'Fixing broken defibrillator' : (type === 'Basic Supplies Restock' ? 'Restocking basic medical supplies (saline, bandages)' : '')),
      estimated_cost: '',
      technician_name: ''
    });
    setModalConfig(type);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/maintenance?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      setData(json);
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



  const handleComplete = async (log_id) => {
    const finalCost = prompt("Enter final repair cost (optional):", "0");
    if (finalCost === null) return; // cancelled

    try {
      await fetch('/api/maintenance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id, final_cost: parseFloat(finalCost) || 0 })
      });
      fetchData();
    } catch (err) {
      alert("Failed to mark complete: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        setModalConfig(null);
        setFormData({ vehicle_id: '', maintenance_type: '', description: '', estimated_cost: '', technician_name: '' });
        fetchData();
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Maintenance Hub</h2>
          <p className="page-header-sub">Manage fleet repairs and service history</p>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="section-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--blue-dim)' }}>
            <div style={{ color: 'var(--blue)' }}><RefreshCw size={18} /></div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Total Investment</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>৳{data.total_investment?.toLocaleString()}</div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => openModal('General Repair')}>
            <Plus size={16} /> Send to Shop
          </button>
          <button className="btn btn-primary" style={{ background: '#f59e0b', borderColor: '#f59e0b' }} onClick={() => openModal('Defibrillator Repair')}>
            <Wrench size={16} /> Fix Defib
          </button>
          <button className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={() => openModal('Oxygen Cylinder Restock')}>
            <CheckCircle size={16} /> Purchase Cylinder
          </button>
          <button className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} onClick={() => openModal('Basic Supplies Restock')}>
            <Plus size={16} /> Restock Supplies
          </button>
        </div>
      </div>

      <div className="content-grid">
        
        {/* ACTIVE REPAIRS */}
        <div className="section-card content-grid-full">
          <div className="section-header">
            <h3><Wrench size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8, color: 'var(--yellow)' }} /> Active Repairs (In Shop)</h3>
          </div>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            {data?.active?.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Issue Description</th>
                    <th>Technician</th>
                    <th>Date Started</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.active.map((log) => (
                    <tr key={log.log_id}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Truck size={14} style={{ color: 'var(--text-muted)' }}/> {log.license_plate}
                        </div>
                      </td>
                      <td><span className="badge badge-maintenance">{log.maintenance_type}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{log.description || '—'}</td>
                      <td>{log.technician_name || '—'}</td>
                      <td>{new Date(log.date_started).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--green)' }} onClick={() => handleComplete(log.log_id)}>
                          <CheckCircle size={14} /> Mark Complete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <CheckCircle size={32} style={{ color: 'var(--green)', opacity: 0.5, marginBottom: 12 }} />
                <p>All ambulances are currently healthy and available.</p>
              </div>
            )}
          </div>
        </div>

        {/* SERVICE HISTORY */}
        <div className="section-card content-grid-full">
          <div className="section-header">
            <h3><History size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8, color: 'var(--blue)' }} /> Service History</h3>
          </div>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            {data?.history?.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Technician</th>
                    <th>Duration</th>
                    <th>Cost (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((log) => {
                     const start = new Date(log.date_started);
                     const end = new Date(log.date_completed);
                     const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) || 1;
                     
                     return (
                      <tr key={log.log_id}>
                        <td style={{ color: 'var(--text-muted)' }}>#{log.log_id}</td>
                        <td style={{ fontWeight: 600 }}>{log.license_plate}</td>
                        <td>{log.maintenance_type}</td>
                        <td>{log.technician_name || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{days} day(s)</td>
                        <td style={{ fontFamily: 'monospace' }}>৳{parseFloat(log.cost).toLocaleString()}</td>
                      </tr>
                     );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state"><p>No service history found.</p></div>
            )}
          </div>
        </div>

      </div>

      {/* NEW MAINTENANCE MODAL */}
      {modalConfig && (
        <div className="modal-overlay" onClick={() => setModalConfig(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalConfig === 'General Repair' && <><AlertTriangle size={18} style={{ display: 'inline', verticalAlign: -3, color: 'var(--yellow)', marginRight: 8 }} /> Send to Shop</>}
                {modalConfig === 'Defibrillator Repair' && <><Wrench size={18} style={{ display: 'inline', verticalAlign: -3, color: '#f59e0b', marginRight: 8 }} /> Fix Defibrillator</>}
                {modalConfig === 'Oxygen Cylinder Restock' && <><CheckCircle size={18} style={{ display: 'inline', verticalAlign: -3, color: '#10b981', marginRight: 8 }} /> Purchase Cylinder</>}
                {modalConfig === 'Basic Supplies Restock' && <><Plus size={18} style={{ display: 'inline', verticalAlign: -3, color: '#3b82f6', marginRight: 8 }} /> Restock Supplies</>}
              </h3>
              <button className="btn-icon" onClick={() => setModalConfig(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                  {modalConfig === 'General Repair' && <>Sending an ambulance to the shop will immediately trigger the database to change its status to <strong style={{color: 'var(--yellow)'}}>Maintenance</strong>, removing it from the dispatch pool.</>}
                  {modalConfig === 'Defibrillator Repair' && <>Sending the defibrillator for repair will create a maintenance log and reset the inventory status to <strong>Fixed</strong> once complete.</>}
                  {modalConfig === 'Oxygen Cylinder Restock' && <>Purchasing a cylinder will create a maintenance log and reset the ambulance oxygen level to <strong>100%</strong> in the inventory.</>}
                  {modalConfig === 'Basic Supplies Restock' && <>Restocking will create a maintenance log and reset the ambulance basic supplies status to <strong>Stocked</strong> in the inventory.</>}
                </p>

                <div className="form-group">
                  <label className="form-label">Select Available Ambulance</label>
                  <select 
                    className="form-select" 
                    required 
                    value={formData.vehicle_id}
                    onChange={e => setFormData({...formData, vehicle_id: e.target.value})}
                  >
                    <option value="">-- Select an Ambulance --</option>
                    {data?.available_ambulances?.map(a => (
                      <option key={a.vehicle_id} value={a.vehicle_id}>{a.license_plate}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Service Type</label>
                    <input type="text" className="form-input" required placeholder="e.g. Engine Repair, Tires" value={formData.maintenance_type} onChange={e => setFormData({...formData, maintenance_type: e.target.value})} disabled={modalConfig !== 'General Repair'} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Technician/Vendor (Optional)</label>
                    <input type="text" className="form-input" placeholder="e.g. Rahim Motors or O2 Supplier" value={formData.technician_name} onChange={e => setFormData({...formData, technician_name: e.target.value})} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description of Issue</label>
                  <textarea className="form-input" rows="3" required placeholder="Describe what is wrong..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Estimated Cost (BDT)</label>
                  <input type="number" className="form-input" min="0" placeholder="0.00" value={formData.estimated_cost} onChange={e => setFormData({...formData, estimated_cost: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Processing...' : 'Confirm Maintenance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
