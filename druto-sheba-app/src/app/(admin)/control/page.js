'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Save, UserPlus, ShieldBan, Truck, Settings, ClipboardList, RefreshCw, Cctv } from 'lucide-react';
import { StatusBadge, EquipmentBadge } from '@/components/Badges';
import { useToast } from '@/components/Toast';

export default function AdminControlPage() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState({ users: [], ambulances: [], audit: [], pricing: {} });
  const [userForm, setUserForm] = useState({ username: '', name: '', password: '', role: 'Admin' });
  const [fleetForm, setFleetForm] = useState({ license_plate: '', equipment_level: 'Basic', hub: 'Central Hub', next_service_date: '' });
  const [pricing, setPricing] = useState({ 
    base_fare: 750, 
    per_km_charge: 25, 
    commission_company_cert: 25.0, 
    commission_company_nocert: 30.0, 
    commission_own_cert: 3.0, 
    commission_own_nocert: 5.0 
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [auditFilter, setAuditFilter] = useState('All');

  const [bypassActive, setBypassActive] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Poll for pending count to determine bypass button status
  useEffect(() => {
    const checkBypass = async () => {
      try {
        const res = await fetch('/api/admin/pending-count');
        if (res.ok) {
          const d = await res.json();
          setBypassActive(!!d.hasOverdue);
        }
      } catch {}
    };
    checkBypass();
    const interval = setInterval(checkBypass, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/admin/control?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      setData(json);
      setPricing(json.pricing || pricing);
      
      const meRes = await fetch('/api/auth/me?portal=admin');
      if (meRes.ok) {
        const me = await meRes.json();
        setCurrentUser(me);
      }
    } catch {
      toast('Failed to load admin controls.', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useAutoRefresh(fetchData);
  useEffect(() => { 
    fetchData(); 

  }, [fetchData]);

  const createUser = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'user', ...userForm }),
    });
    if (res.ok) {
      toast('New Admin created successfully.', 'success');
      setUserForm({ username: '', name: '', password: '', role: 'Admin' });
      fetchData();
    } else {
      const err = await res.json();
      toast(err.error || 'Failed to create admin.', 'error');
    }
  };

  const updateUser = async (user, patch) => {
    await fetch('/api/admin/control', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'user', user_id: user.user_id, source: user.source, ...patch }),
    });
    fetchData();
  };

  const createAmbulance = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ambulance', ...fleetForm }),
    });
    if (res.ok) {
      toast('Ambulance registered.', 'success');
      setFleetForm({ license_plate: '', equipment_level: 'Basic', hub: 'Central Hub', next_service_date: '' });
      fetchData();
    }
  };

  const updateAmbulance = async (vehicle_id, patch) => {
    await fetch('/api/admin/control', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ambulance', vehicle_id, ...patch }),
    });
    fetchData();
  };

  const savePricing = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/control', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pricing', ...pricing }),
    });
    if (res.ok) toast('Pricing engine updated.', 'success');
  };

  const handleBypassDispatch = () => {
    if (!bypassActive) return;
    setAdminPassword('');
    setShowConfirmModal(true);
  };

  const handleConfirmBypass = async (e) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword.trim()) return;

    setConfirming(true);
    try {
      const res = await fetch('/api/auth/bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });
      
      if (res.ok) {
        toast('Bypass session generated successfully.', 'success');
        setShowConfirmModal(false);
        router.push('/dashboard');
      } else {
        const err = await res.json();
        toast(err.error || 'Incorrect password verification failed.', 'error');
      }
    } catch {
      toast('Network error during verification.', 'error');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Admin Control</h2>
          <p className="page-header-sub">Roles, fleet registry, pricing engine, and audit ledger</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button 
            className="btn" 
            disabled={!bypassActive}
            onClick={handleBypassDispatch}
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              background: bypassActive ? '#ff3b30' : 'rgba(120, 120, 128, 0.2)',
              color: bypassActive ? '#fff' : 'rgba(120, 120, 128, 0.6)',
              border: 'none',
              cursor: bypassActive ? 'pointer' : 'not-allowed',
              opacity: bypassActive ? 1 : 0.8,
              transition: 'all 0.3s ease',
              boxShadow: bypassActive ? '0 0 10px rgba(255, 59, 48, 0.4)' : 'none',
              fontWeight: 700,
              borderRadius: '6px',
              height: '30px'
            }}
          >
            Bypass Dispatcher
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ height: '36px' }} 
            onClick={fetchData}
            disabled={isRefreshing}
          >
            <RefreshCw 
              size={16} 
              style={{ 
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                opacity: isRefreshing ? 0.6 : 1
              }} 
            /> 
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {(currentUser?.username === 'admin_chairperson' || currentUser?.username === 'admin_executive_owner') && (
          <div className="section-card">
            <div className="section-header"><h3><UserPlus size={16} /> User & Role Management (Add Admin)</h3></div>
            <form onSubmit={createUser} className="section-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10 }}>
              <input required className="form-input" placeholder="Name" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
              <input required className="form-input" placeholder="Username" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} />
              <input required type="password" className="form-input" placeholder="Key / Password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
              <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}><UserPlus size={16} /> Add Admin</button>
            </form>
            <div className="section-body" style={{ paddingTop: 0, maxHeight: '400px', overflowY: 'auto' }}>
              <table>
                <thead><tr style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg)', zIndex: 1 }}><th>Name</th><th>Designation / Role</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{data.users.map((u) => (
                  <tr key={`${u.source}-${u.user_id}`}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.name || u.username}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{u.username}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        {u.source === 'dispatcher' ? 'Dispatcher' : u.role}
                      </div>
                    </td>
                    <td>{u.blocked ? <StatusBadge status="Blocked" /> : <StatusBadge status="Active" />}</td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => updateUser(u, { blocked: !u.blocked })}
                        style={{ color: u.blocked ? '#10b981' : '#ef4444', borderColor: u.blocked ? '#10b981' : '#ef4444' }}
                      >
                        <ShieldBan size={14} /> {u.blocked ? 'Unblock' : 'Block'}
                      </button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        <div className="section-card">
          <div className="section-header"><h3><Settings size={16} /> Pricing Engine</h3></div>
          <form onSubmit={savePricing} className="section-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '16px' }}>
              <label className="form-label">Base Fare<input className="form-input" type="number" value={pricing.base_fare || 0} onChange={e => setPricing({ ...pricing, base_fare: e.target.value })} /></label>
              <label className="form-label">Per KM<input className="form-input" type="number" value={pricing.per_km_charge || 0} onChange={e => setPricing({ ...pricing, per_km_charge: e.target.value })} /></label>
            </div>
            
            <strong style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-main)' }}>Platform Commission (%)</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '16px', background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
              <label className="form-label">Company Amb + Cert
                <input className="form-input" type="number" step="0.1" value={pricing.commission_company_cert || 0} onChange={e => setPricing({ ...pricing, commission_company_cert: e.target.value })} />
              </label>
              <label className="form-label">Company Amb (No Cert)
                <input className="form-input" type="number" step="0.1" value={pricing.commission_company_nocert || 0} onChange={e => setPricing({ ...pricing, commission_company_nocert: e.target.value })} />
              </label>
              <label className="form-label">Own Amb + Cert
                <input className="form-input" type="number" step="0.1" value={pricing.commission_own_cert || 0} onChange={e => setPricing({ ...pricing, commission_own_cert: e.target.value })} />
              </label>
              <label className="form-label">Own Amb (No Cert)
                <input className="form-input" type="number" step="0.1" value={pricing.commission_own_nocert || 0} onChange={e => setPricing({ ...pricing, commission_own_nocert: e.target.value })} />
              </label>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}><Save size={16} /> Save Pricing</button>
          </form>
        </div>
      </div>

      <div className="section-card" style={{ marginTop: 24 }}>
        <div className="section-header"><h3><Truck size={16} /> Fleet Management</h3></div>
        <form onSubmit={createAmbulance} className="section-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10 }}>
          <input required className="form-input" placeholder="License plate" value={fleetForm.license_plate} onChange={e => setFleetForm({ ...fleetForm, license_plate: e.target.value })} />
          <select className="form-input form-select" value={fleetForm.equipment_level} onChange={e => setFleetForm({ ...fleetForm, equipment_level: e.target.value })}>
            <option>Basic</option><option>Advanced</option><option>Basic Life Support</option><option>Advanced Life Support</option><option>ICU Support</option>
          </select>
          <input 
            className="form-input" 
            placeholder="Search or select hub..." 
            list="admin-zones-list"
            value={fleetForm.hub} 
            onChange={e => setFleetForm({ ...fleetForm, hub: e.target.value })} 
          />
          <datalist id="admin-zones-list">
            {data.zones && data.zones.map(z => (
              <option key={z.name} value={z.name} />
            ))}
          </datalist>
          <input className="form-input" type="date" value={fleetForm.next_service_date} onChange={e => setFleetForm({ ...fleetForm, next_service_date: e.target.value })} />
          <button className="btn btn-primary">Register</button>
        </form>
        <div className="section-body" style={{ paddingTop: 0 }}>
          <table>
            <thead><tr><th>Plate</th><th>Equipment</th><th>Status</th><th>Hub</th><th>Next Service</th></tr></thead>
            <tbody>{data.ambulances.map((a) => (
              <tr key={a.vehicle_id}>
                <td>{a.license_plate}</td>
                <td><EquipmentBadge level={a.equipment_level} /></td>
                <td>
                  <select className="form-input form-select" value={a.current_status} onChange={e => updateAmbulance(a.vehicle_id, { current_status: e.target.value })} style={{ height: 34, fontSize: 12 }}>
                    <option>Available</option><option>Dispatched</option><option>Maintenance</option><option>Maintenance_Required</option>
                  </select>
                </td>
                <td>{a.hub || 'Central Hub'}</td>
                <td>{a.next_service_date || 'Not set'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="section-card" style={{ marginTop: 24 }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3><Cctv size={16} /> Audit Logs</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['All', 'Admin', 'Dispatcher', 'Patient', 'Driver'].map(cat => (
              <button 
                key={cat} 
                className={`btn btn-sm ${auditFilter === cat ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setAuditFilter(cat)}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="section-body">
          <table>
            <thead><tr><th>Time</th><th>Table</th><th>Operation</th><th>Changed By</th><th>Summary</th></tr></thead>
            <tbody>
              {(data.audit || []).filter(a => {
                if (auditFilter === 'All') return true;
                let cat = 'System';
                if (a.table_name === 'pricing_config' || a.table_name === 'staff_users') cat = 'Admin';
                else if (a.table_name === 'ambulances') cat = a.operation === 'INSERT' ? 'Admin' : 'Driver';
                else if (a.table_name === 'emergency_requests') cat = a.operation === 'INSERT' ? 'Patient' : 'Dispatcher';
                return cat === auditFilter;
              }).map((a) => (
                <tr key={a.audit_id}>
                  <td>
                    {a.changed_at 
                      ? new Date(a.changed_at).toLocaleString('en-US', { 
                          timeZone: 'Asia/Dhaka', 
                          month: 'short', day: 'numeric', year: 'numeric', 
                          hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true 
                        }) 
                      : 'Now'
                    }
                  </td>
                  <td>{a.table_name}</td>
                  <td><StatusBadge status={a.operation} /></td>
                  <td>{a.changed_by || 'system'}</td>
                  <td>{a.summary || `${a.operation} on record ${a.record_id}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showConfirmModal && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: 360, padding: 24, borderRadius: 16 }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: 16, fontWeight: 800 }}>Confirm Bypass Credentials</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              For security, please enter your Admin username and password to enter the dispatcher portal.
            </p>
            <form onSubmit={handleConfirmBypass}>
              <input
                required
                type="text"
                className="form-input"
                placeholder="Admin Username"
                value={adminUsername}
                onChange={e => setAdminUsername(e.target.value)}
                style={{ width: '100%', marginBottom: 12, height: 40 }}
                autoFocus
              />
              <input
                required
                type="password"
                className="form-input"
                placeholder="Admin Password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                style={{ width: '100%', marginBottom: 20, height: 40 }}
              />
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setShowConfirmModal(false)}
                  disabled={confirming}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={confirming || !adminPassword}
                >
                  {confirming ? 'Verifying...' : 'Verify & Bypass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
