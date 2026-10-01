'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Truck, Users, Plus, ToggleLeft, ToggleRight, Trash2, Search, Wrench, Package } from 'lucide-react';
import { StatusBadge, EquipmentBadge } from '@/components/Badges';
import Modal from '@/components/Modal';

export default function FleetPage() {
  const [ambulances, setAmbulances] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAmbModal, setShowAmbModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ driver_id: '', vehicle_id: '' });

  const [showInvModal, setShowInvModal] = useState(false);
  const [selectedAmb, setSelectedAmb] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [invForm, setInvForm] = useState({ item_name: '', quantity: 1, expiry_date: '' });

  const fetchData = useCallback(async () => {
    try {
      const [a, d] = await Promise.all([
        fetch(`/api/ambulances?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/drivers?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
      ]);
      setAmbulances(Array.isArray(a) ? a : []);
      setDrivers(Array.isArray(d) ? d : []);
    } catch (err) { 
      console.error('Fetch error:', err);
      setAmbulances([]);
      setDrivers([]);
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

  const [ambForm, setAmbForm] = useState({ license_plate: '', equipment_level: 'Basic' });


  const addAmbulance = async () => {
    await fetch('/api/ambulances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ambForm) });
    setShowAmbModal(false);
    setAmbForm({ license_plate: '', equipment_level: 'Basic' });
    fetchData();
  };

  const assignAmbulance = async () => {
    await fetch('/api/drivers', { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ driver_id: assignForm.driver_id, assigned_ambulance_id: assignForm.vehicle_id }) 
    });
    setShowAssignModal(false);
    setAssignForm({ driver_id: '', vehicle_id: '' });
    fetchData();
  };

  const removeAmbulance = async (ambulance) => {
    if (!confirm(`Are you sure you want to remove ambulance ${ambulance.license_plate}?`)) return;
    await fetch('/api/ambulances', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vehicle_id: ambulance.vehicle_id }) });
    fetchData();
  };

  const toggleShift = async (driver) => {
    const newStatus = driver.shift_status === 'On_Duty' ? 'Off_Duty' : 'On_Duty';
    await fetch('/api/drivers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ driver_id: driver.driver_id, shift_status: newStatus }) });
    fetchData();
  };

  const removeDriver = async (driver) => {
    if (!confirm(`Are you sure you want to remove ${driver.name} from the system?`)) return;
    await fetch('/api/drivers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ driver_id: driver.driver_id }) });
    fetchData();
  };

  const openInventory = async (ambulance) => {
    setSelectedAmb(ambulance);
    setShowInvModal(true);
    const res = await fetch(`/api/ambulances/inventory?vehicle_id=${ambulance.vehicle_id}&t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    setInventory(data);
  };

  const addInventory = async () => {
    if (!selectedAmb) return;
    const res = await fetch('/api/ambulances/inventory', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ vehicle_id: selectedAmb.vehicle_id, ...invForm }) 
    });
    if (res.ok) {
      setInvForm({ item_name: '', quantity: 1, expiry_date: '' });
      openInventory(selectedAmb);
    }
  };

  const removeInventory = async (itemId) => {
    await fetch(`/api/ambulances/inventory?inventory_id=${itemId}`, { method: 'DELETE' });
    openInventory(selectedAmb);
  };

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  const filteredAmb = ambulances.filter(a => a.license_plate.toLowerCase().includes(search.toLowerCase()));
  const filteredDrv = drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Fleet & Crew Management</h2>
          <p className="page-header-sub">{ambulances.length} ambulances · {drivers.length} drivers</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
            <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', padding: '0 16px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <Search size={16} color="var(--text-muted)" />
                <input 
                    type="text" 
                    placeholder="Search fleet..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '10px 12px', outline: 'none', width: 200 }}
                />
            </div>
        </div>
      </div>

      <div className="content-grid">
        {/* Ambulance Section */}
        <div className="section-card">
          <div className="section-header">
            <h3><Truck size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Ambulances</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAmbModal(true)}><Plus size={14} /> Add</button>
          </div>
          <div style={{ padding: 16 }}>
            <div className="table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px' }}>License Plate</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Equipment</th>
                    <th style={{ padding: '12px 16px' }}>Service Info</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAmb.map(a => (
                    <tr key={a.vehicle_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="hover:bg-white/5">
                      <td style={{ padding: '12px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {a.current_status === 'Maintenance_Required' && <Wrench size={14} color="var(--red)" />}
                        {a.license_plate}
                      </td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={a.current_status} /></td>
                      <td style={{ padding: '12px 16px' }}><EquipmentBadge level={a.equipment_level} /></td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {a.trips_since_maintenance || 0} trips since service
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button className="btn-icon" onClick={() => openInventory(a)} title="Manage Inventory" style={{ marginRight: 8, display: 'inline-flex' }}>
                          <Package size={16} />
                        </button>
                        <button className="btn-icon" onClick={() => removeAmbulance(a)} title="Remove Ambulance" style={{ color: 'var(--red)', display: 'inline-flex' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAmb.length === 0 && (
                    <tr><td colSpan="5" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No ambulances found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Driver Section */}
        <div className="section-card">
          <div className="section-header">
            <h3><Users size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Drivers</h3>
            <button className="btn btn-blue btn-sm" onClick={() => setShowAssignModal(true)}><Truck size={14} /> Assign Ambulance</button>
          </div>
          <div style={{ padding: 16 }}>
            <div className="table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px' }}>Emp ID</th>
                    <th style={{ padding: '12px 16px' }}>Driver Name</th>
                    <th style={{ padding: '12px 16px' }}>License No</th>
                    <th style={{ padding: '12px 16px' }}>Shift Status</th>
                    <th style={{ padding: '12px 16px' }}>Vehicle</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrv.map(d => (
                    <tr key={d.driver_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="hover:bg-white/5">
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>NEX-D-100{d.driver_id}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{d.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{d.license_no}</td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={d.shift_status} /></td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        {d.own_ambulance_plate ? (
                          <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{d.own_ambulance_plate} (Own)</span>
                        ) : d.vehicle ? (
                          <span style={{ color: 'var(--green)', fontWeight: 600 }}>{d.vehicle}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>None</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button className="btn-icon" onClick={() => toggleShift(d)} title="Toggle Shift" style={{ marginRight: 8, display: 'inline-flex' }}>
                          {d.shift_status === 'On_Duty' ? <ToggleRight size={18} color="var(--green)" /> : <ToggleLeft size={18} />}
                        </button>
                        {/* Driver removal is restricted to Admin only */}
                      </td>
                    </tr>
                  ))}
                  {filteredDrv.length === 0 && (
                    <tr><td colSpan="6" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No drivers found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={showAmbModal} onClose={() => setShowAmbModal(false)} title="Add Ambulance" footer={
        <><button className="btn btn-secondary" onClick={() => setShowAmbModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={addAmbulance} disabled={!ambForm.license_plate}>Add Ambulance</button></>
      }>
        <div className="form-group">
          <label className="form-label">License Plate</label>
          <input className="form-input" placeholder="e.g. DHA-13-5566" value={ambForm.license_plate} onChange={e => setAmbForm({ ...ambForm, license_plate: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Equipment Level</label>
          <select className="form-input form-select" value={ambForm.equipment_level} onChange={e => setAmbForm({ ...ambForm, equipment_level: e.target.value })}>
            <option value="Basic">Basic</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
      </Modal>

      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Ambulance" footer={
        <><button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
          <button className="btn btn-blue" onClick={assignAmbulance} disabled={!assignForm.driver_id || !assignForm.vehicle_id}>Assign</button></>
      }>
        <div className="form-group">
          <label className="form-label">Select Driver (Without Own Ambulance)</label>
          <select 
            className="form-input form-select" 
            value={assignForm.driver_id} 
            onChange={e => setAssignForm({ ...assignForm, driver_id: e.target.value })}
          >
            <option value="">-- Choose Driver --</option>
            {drivers.filter(d => !d.own_ambulance_plate).map(d => (
              <option key={d.driver_id} value={d.driver_id}>{d.name} (NEX-D-100{d.driver_id}) - Current: {d.assigned_ambulance_id ? `Assigned ID ${d.assigned_ambulance_id}` : 'None'}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Select Available Ambulance</label>
          <select 
            className="form-input form-select" 
            value={assignForm.vehicle_id} 
            onChange={e => setAssignForm({ ...assignForm, vehicle_id: e.target.value })}
          >
            <option value="">-- Choose Ambulance --</option>
            {ambulances.map(a => (
              <option key={a.vehicle_id} value={a.vehicle_id}>{a.license_plate} ({a.equipment_level}) - {a.current_status}</option>
            ))}
          </select>
        </div>
      </Modal>

      <Modal isOpen={showInvModal} onClose={() => setShowInvModal(false)} title={`Inventory: ${selectedAmb?.license_plate}`} footer={
        <button className="btn btn-secondary" onClick={() => setShowInvModal(false)}>Close</button>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {inventory.length > 0 ? (
              <table style={{ width: '100%', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }}>
                    <th style={{ padding: 8, borderBottom: '1px solid var(--border-subtle)' }}>Item</th>
                    <th style={{ padding: 8, borderBottom: '1px solid var(--border-subtle)' }}>Qty</th>
                    <th style={{ padding: 8, borderBottom: '1px solid var(--border-subtle)' }}>Expiry</th>
                    <th style={{ padding: 8, borderBottom: '1px solid var(--border-subtle)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => {
                    const isExpiring = item.expiry_date && new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
                    return (
                      <tr key={item.inventory_id}>
                        <td style={{ padding: '12px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{item.item_name}</td>
                        <td style={{ padding: '12px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 'bold' }}>{item.quantity}</td>
                        <td style={{ padding: '12px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: isExpiring ? 'var(--red)' : 'inherit' }}>
                          {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '12px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
                          <button onClick={() => removeInventory(item.inventory_id)} style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state" style={{ padding: 20 }}>No inventory items found.</div>
            )}
          </div>
          
          <div className="glass" style={{ padding: 16, display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 8, alignItems: 'end' }}>
            <div>
              <label className="form-label" style={{ fontSize: 10 }}>New Item</label>
              <input className="form-input" style={{ padding: '6px 10px', fontSize: 12 }} value={invForm.item_name} onChange={e => setInvForm({...invForm, item_name: e.target.value})} placeholder="e.g. Oxygen" />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 10 }}>Qty</label>
              <input type="number" min="1" className="form-input" style={{ padding: '6px 10px', fontSize: 12 }} value={invForm.quantity} onChange={e => setInvForm({...invForm, quantity: e.target.value})} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 10 }}>Expiry</label>
              <input type="date" className="form-input" style={{ padding: '6px 10px', fontSize: 12 }} value={invForm.expiry_date} onChange={e => setInvForm({...invForm, expiry_date: e.target.value})} />
            </div>
            <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={addInventory} disabled={!invForm.item_name}>Add</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
