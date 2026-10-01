'use client';
import { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Trash2, CalendarDays } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

export default function ShiftsPage() {
  const toast = useToast();
  const [data, setData] = useState({ shifts: [], drivers: [] });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [form, setForm] = useState({
    driver_id: '',
    shift_date: '',
    start_time: '08:00',
    end_time: '16:00',
    zone_assigned: 'Central Hub'
  });

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/dispatcher/shifts', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch {
      toast('Failed to load shifts', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useAutoRefresh(fetchData);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.driver_id) {
      toast('Please select a driver', 'error');
      return;
    }
    try {
      const res = await fetch('/api/dispatcher/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          start_time: form.start_time + ':00',
          end_time: form.end_time + ':00'
        }),
      });
      if (res.ok) {
        toast('Shift saved successfully', 'success');
        setForm({ ...form, shift_date: '' }); // reset date for next entry
        fetchData();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save shift', 'error');
      }
    } catch {
      toast('Network error', 'error');
    }
  };

  const handleDelete = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    try {
      const res = await fetch(`/api/dispatcher/shifts?schedule_id=${scheduleId}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Shift deleted', 'success');
        fetchData();
      } else {
        toast('Failed to delete shift', 'error');
      }
    } catch {
      toast('Network error', 'error');
    }
  };

  const getShiftType = (start, end) => {
    const s = parseInt(start.split(':')[0]);
    if (s >= 6 && s < 14) return { label: 'MORNING', color: 'var(--blue)', bg: 'rgba(10,132,255,0.1)' };
    if (s >= 14 && s < 22) return { label: 'EVENING', color: 'var(--yellow)', bg: 'rgba(255,159,10,0.1)' };
    return { label: 'NIGHT', color: 'var(--red)', bg: 'rgba(255,59,48,0.1)' };
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Driver Shift Management</h2>
          <p className="page-header-sub">Manage and assign driver working schedules</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {isRefreshing && <div className="spinner" style={{ width: 16, height: 16 }} />}
        </div>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* Add Shift Form */}
        <div className="section-card">
          <div className="section-header">
            <h3><CalendarDays size={16} /> Assign Shift</h3>
          </div>
          <form className="section-body" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Driver</label>
              <select 
                required
                className="form-input form-select"
                value={form.driver_id}
                onChange={e => setForm({...form, driver_id: e.target.value})}
              >
                <option value="">Select a driver...</option>
                {data.drivers.map(d => (
                  <option key={d.driver_id} value={d.driver_id}>{d.name} ({d.phone})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="form-label">Day of the Week</label>
              <select 
                required
                className="form-input form-select"
                value={form.shift_date}
                onChange={e => setForm({...form, shift_date: e.target.value})}
              >
                <option value="">Select a day...</option>
                <option value="2000-01-03">Monday</option>
                <option value="2000-01-04">Tuesday</option>
                <option value="2000-01-05">Wednesday</option>
                <option value="2000-01-06">Thursday</option>
                <option value="2000-01-07">Friday</option>
                <option value="2000-01-08">Saturday</option>
                <option value="2000-01-02">Sunday</option>
              </select>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Start Time</label>
                <input 
                  required
                  type="time" 
                  className="form-input"
                  value={form.start_time}
                  onChange={e => setForm({...form, start_time: e.target.value})}
                />
              </div>
              <div>
                <label className="form-label">End Time</label>
                <input 
                  required
                  type="time" 
                  className="form-input"
                  value={form.end_time}
                  onChange={e => setForm({...form, end_time: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="form-label">Zone</label>
              <input 
                required
                type="text" 
                list="zones-list"
                className="form-input"
                value={form.zone_assigned}
                onChange={e => setForm({...form, zone_assigned: e.target.value})}
                placeholder="Search or select zone..."
              />
              <datalist id="zones-list">
                {data.zones && data.zones.map(z => (
                  <option key={z.name} value={z.name} />
                ))}
              </datalist>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
              <Plus size={16} /> Assign Shift
            </button>
          </form>
        </div>

        {/* Existing Shifts Table */}
        <div className="section-card">
          <div className="section-header">
            <h3><Clock size={16} /> Scheduled Shifts</h3>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Shift Type</th>
                  <th>Zone</th>
                  <th style={{ width: 60 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>Loading...</td></tr>
                ) : data.shifts.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No shifts scheduled yet.</td></tr>
                ) : data.shifts.map(s => {
                  const type = getShiftType(s.start_time, s.end_time);
                  const dateObj = new Date(s.date);
                  return (
                    <tr key={s.schedule_id}>
                      <td>
                        <strong>{s.driver_name}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.phone}</div>
                      </td>
                      <td>
                        {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: 10,
                          fontWeight: 800,
                          backgroundColor: type.bg,
                          color: type.color
                        }}>
                          {type.label}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{s.zone_assigned}</td>
                      <td>
                        <button 
                          className="btn btn-ghost" 
                          style={{ padding: 6, color: 'var(--red)' }}
                          onClick={() => handleDelete(s.schedule_id)}
                          title="Delete Shift"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
