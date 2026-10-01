'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Building2, BedDouble, MapPin, Plus, Stethoscope } from 'lucide-react';
import dynamic from 'next/dynamic';
import Modal from '@/components/Modal';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', lat: 23.7750, lon: 90.4100, general_beds: 0, icu_beds: 0, type: 'Private', spec_ids: []
  });

  const fetchData = useCallback(async () => {
    try {
      const [hRes, sRes] = await Promise.all([
        fetch(`/api/hospitals?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/specializations?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json())
      ]);
      setHospitals(hRes);
      setSpecializations(sRes);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useAutoRefresh(fetchData);
  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();

  }, [fetchData]);


  const addHospital = async () => {
    await fetch('/api/hospitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setForm({ name: '', lat: 23.7750, lon: 90.4100, general_beds: 0, icu_beds: 0, type: 'Private', spec_ids: [] });
    fetchData();
  };

  const handleSpecToggle = (specId) => {
    const current = form.spec_ids;
    if (current.includes(specId)) {
      setForm({ ...form, spec_ids: current.filter(id => id !== specId) });
    } else {
      setForm({ ...form, spec_ids: [...current, specId] });
    }
  };

  const updateBeds = async (hospital_id, field, delta) => {
    const h = hospitals.find(x => x.hospital_id === hospital_id);
    const newVal = Math.max(0, parseInt(h[field]) + delta);
    await fetch('/api/hospitals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hospital_id, general_beds: field === 'general_beds' ? newVal : h.general_beds, icu_beds: field === 'icu_beds' ? newVal : h.icu_beds }),
    });
    fetchData();
  };

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  const filteredHospitals = selectedSpec 
    ? hospitals.filter(h => h.specializations?.includes(selectedSpec))
    : hospitals;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Hospitals</h2>
          <p className="page-header-sub">{filteredHospitals.length} facilities matching filter</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Hospital
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
        {/* Sidebar Filters */}
        <div className="section-card" style={{ height: 'fit-content', position: 'sticky', top: 20 }}>
          <div className="section-header">
            <h3 style={{ fontSize: 14 }}>Filter Specialty</h3>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button 
              className={`btn btn-sm ${!selectedSpec ? 'btn-primary' : 'btn-ghost'}`}
              style={{ justifyContent: 'flex-start' }}
              onClick={() => setSelectedSpec(null)}
            >
              All Facilities
            </button>
            {specializations.map(s => (
              <button 
                key={s.spec_id}
                className={`btn btn-sm ${selectedSpec === s.spec_name ? 'btn-blue' : 'btn-ghost'}`}
                style={{ justifyContent: 'flex-start', fontSize: 12 }}
                onClick={() => setSelectedSpec(s.spec_name)}
              >
                <Stethoscope size={14} style={{ marginRight: 8 }} /> {s.spec_name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <div style={{ height: '400px', width: '100%', borderRadius: 12, overflow: 'hidden' }}>
            <MapView hospitals={filteredHospitals} />
          </div>

          <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {filteredHospitals.map(h => (
              <div className="card" key={h.hospital_id}>
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: h.type === 'Government' ? 'var(--blue-dim)' : 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: h.type === 'Government' ? 'var(--blue)' : 'var(--green)' }}>
                      <Building2 size={18} />
                    </div>
                    <div>
                      <div className="card-title">{h.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        <span style={{ color: h.type === 'Government' ? 'var(--blue)' : 'var(--green)', fontWeight: 600, marginRight: 8 }}>{h.type}</span>
                        <MapPin size={10} style={{ display: 'inline', verticalAlign: -1 }} /> {parseFloat(h.lat).toFixed(4)}, {parseFloat(h.lon).toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
                    {(h.specializations || []).map((s, i) => (
                      <span key={i} style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Stethoscope size={10} /> {s}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BedDouble size={14} color="var(--green)" />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>General</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button className="btn-icon" style={{ width: 28, height: 28, fontSize: 16 }} onClick={() => updateBeds(h.hospital_id, 'general_beds', -1)}>−</button>
                      <span style={{ fontWeight: 700, fontSize: 18, minWidth: 36, textAlign: 'center' }}>{h.general_beds}</span>
                      <button className="btn-icon" style={{ width: 28, height: 28, fontSize: 16 }} onClick={() => updateBeds(h.hospital_id, 'general_beds', 1)}>+</button>
                    </div>
                  </div>
                  <div className="bed-bar-wrapper">
                    <div className="bed-bar"><div className="bed-bar-fill green" style={{ width: `${Math.min(100, (h.general_beds / 500) * 100)}%` }} /></div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BedDouble size={14} color="var(--red)" />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>ICU</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button className="btn-icon" style={{ width: 28, height: 28, fontSize: 16 }} onClick={() => updateBeds(h.hospital_id, 'icu_beds', -1)}>−</button>
                      <span style={{ fontWeight: 700, fontSize: 18, minWidth: 36, textAlign: 'center', color: 'var(--red)' }}>{h.icu_beds}</span>
                      <button className="btn-icon" style={{ width: 28, height: 28, fontSize: 16 }} onClick={() => updateBeds(h.hospital_id, 'icu_beds', 1)}>+</button>
                    </div>
                  </div>
                  <div className="bed-bar-wrapper">
                    <div className="bed-bar"><div className={`bed-bar-fill ${h.icu_beds <= 5 ? 'red' : 'blue'}`} style={{ width: `${Math.min(100, (h.icu_beds / 30) * 100)}%` }} /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Hospital" footer={
        <><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={addHospital} disabled={!form.name || form.spec_ids.length === 0}>Add Facility</button></>
      }>
        <div className="form-group">
          <label className="form-label">Hospital Name</label>
          <input className="form-input" placeholder="e.g. Dhaka Medical College" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Latitude</label>
            <input type="number" step="0.0001" className="form-input" value={form.lat} onChange={e => setForm({ ...form, lat: parseFloat(e.target.value) })} />
          </div>
          <div className="form-group">
            <label className="form-label">Longitude</label>
            <input type="number" step="0.0001" className="form-input" value={form.lon} onChange={e => setForm({ ...form, lon: parseFloat(e.target.value) })} />
          </div>
        </div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">General Beds</label>
            <input type="number" className="form-input" value={form.general_beds} onChange={e => setForm({ ...form, general_beds: parseInt(e.target.value) })} />
          </div>
          <div className="form-group">
            <label className="form-label">ICU Beds</label>
            <input type="number" className="form-input" value={form.icu_beds} onChange={e => setForm({ ...form, icu_beds: parseInt(e.target.value) })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Hospital Type</label>
          <select className="form-input form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="Private">Private</option>
            <option value="Government">Government</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Select Specializations</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            {specializations.map(s => (
              <label key={s.spec_id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={form.spec_ids.includes(s.spec_id)} 
                  onChange={() => handleSpecToggle(s.spec_id)} 
                />
                {s.spec_name}
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
