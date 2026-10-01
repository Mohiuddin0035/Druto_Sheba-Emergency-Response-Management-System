'use client';
import { useState, useEffect } from 'react';
import { User, Phone, Droplet, Activity, Save, CheckCircle, Trash2, Plus } from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import { useToast } from '@/components/Toast';

const CONDITION_GROUPS = [
  {
    label: '🔴 CRITICAL (Life-Threatening)',
    severity: 'critical',
    conditions: [
      'Heart Attack', 'Heart Failure', 'Stroke', 'Severe Trauma',
      'Major Burn', 'Cardiac Arrest', 'Brain Hemorrhage', 'Spinal Injury',
    ],
  },
  {
    label: '🟠 CHRONIC (Ongoing)',
    severity: 'chronic',
    conditions: [
      'Type 2 Diabetes', 'Type 1 Diabetes', 'Hypertension', 'Asthma',
      'Kidney Disease', 'Epilepsy', 'COPD', 'Liver Disease',
      'Cancer', 'Leukemia', 'Sickle Cell Disease', 'Thyroid Disorder',
    ],
  },
  {
    label: '🟡 MODERATE (Requires Attention)',
    severity: 'moderate',
    conditions: [
      'Pregnancy', 'Bone Fracture', 'Appendicitis', 'Pneumonia',
      'Dengue Fever', 'Severe Allergy', 'Gallstones', 'Hernia',
    ],
  },
  {
    label: '🔵 MINOR (General)',
    severity: 'minor',
    conditions: [
      'Food Allergy', 'Minor Burn', 'Fever', 'General Pain',
      'Migraine', 'Skin Infection', 'Acid Reflux', 'Anemia',
    ],
  },
];

export default function PatientProfile() {
  const { activePatient, refreshUserContext } = useUser();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', relationship: '', phone: '' });

  useEffect(() => {
    // Only fetch if we don't have a profile yet, or if the active patient ID has changed.
    // This prevents the background polling in UserContext from resetting the local unsaved state.
    if (activePatient && (!profile || String(profile.patient_id) !== String(activePatient.id))) {
      Promise.all([
        fetch(`/api/patients?patient_id=${activePatient.id}&t=${Date.now()}`, { cache: 'no-store' }).then(res => res.json()),
        fetch(`/api/patients/contacts?patient_id=${activePatient.id}&t=${Date.now()}`, { cache: 'no-store' }).then(res => res.json())
      ]).then(([profileData, contactsData]) => {
         setProfile(Array.isArray(profileData) ? profileData[0] : profileData);
         setContacts(Array.isArray(contactsData) ? contactsData : []);
         setLoading(false);
      });
    }
  }, [activePatient?.id, profile?.patient_id]);

  if (!activePatient) return null;

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        await refreshUserContext();
        toast('Your medical profile has been saved successfully.', 'success', { title: 'Profile Updated' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      toast('Failed to save profile. Please try again.', 'error', { title: 'Save Error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleCondition = (conditionName) => {
    setProfile(prev => {
      if (!prev) return prev;
      const current = prev.conditions || [];
      const newConditions = current.includes(conditionName)
        ? current.filter(c => c !== conditionName)
        : [...current, conditionName];
      return { ...prev, conditions: newConditions };
    });
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    try {
      const res = await fetch('/api/patients/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: activePatient.id, contact_name: newContact.name, relationship: newContact.relationship, phone: newContact.phone })
      });
      const data = await res.json();
      if (data.success) {
        setContacts([...contacts, data.contact]);
        setNewContact({ name: '', relationship: '', phone: '' });
        toast('Emergency contact added.', 'success');
      }
    } catch (err) {
      toast('Failed to add contact.', 'error');
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      const res = await fetch(`/api/patients/contacts?contact_id=${contactId}`, { method: 'DELETE' });
      if (res.ok) {
        setContacts(contacts.filter(c => c.contact_id !== contactId));
        toast('Contact removed.', 'success');
      }
    } catch (err) {
      toast('Failed to remove contact.', 'error');
    }
  };

  if (!activePatient) return null;
  if (loading || !profile) return <div className="page-container"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Medical Profile</h2>
          <p className="page-header-sub">Manage your life-saving information</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="section-card">
          <div className="section-header">
            <h3><User size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Personal Information</h3>
          </div>
          <div style={{ padding: 20 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-input" rows={3} value={profile.address || ''} onChange={e => setProfile({...profile, address: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="section-header">
            <h3><Phone size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Emergency Contacts</h3>
          </div>
          <div style={{ padding: 20 }}>
            {contacts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {contacts.map(contact => (
                  <div key={contact.contact_id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{contact.contact_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{contact.relationship} • {contact.phone}</div>
                    </div>
                    <button className="btn-icon" onClick={() => handleDeleteContact(contact.contact_id)} style={{ color: 'var(--red)', width: 32, height: 32 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--text-muted)', fontSize: 13 }}>No contacts.</div>
            )}
            <div className="glass" style={{ padding: 12, border: '1px solid var(--border-accent)', borderRadius: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Quick Add</div>
              <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input required className="form-input btn-sm" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder="Name" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input btn-sm" value={newContact.relationship} onChange={e => setNewContact({...newContact, relationship: e.target.value})} placeholder="Relation" />
                  <input required className="form-input btn-sm" value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} placeholder="Phone" />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}><Plus size={14} /> Add Contact</button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr', marginTop: 24 }}>
        <div className="section-card">
          <div className="section-header">
            <h3><Activity size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Medical Records & History</h3>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
              <div className="form-group">
                <label className="form-label">Blood Type</label>
                <select className="form-input form-select" value={profile.blood_type || ''} onChange={e => setProfile({...profile, blood_type: e.target.value})}>
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                </select>

                <div className="form-group" style={{ marginTop: 24 }}>
                  <label className="form-label">Allergies</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={profile.allergies || ''}
                    onChange={e => setProfile({...profile, allergies: e.target.value})}
                    placeholder="e.g. Penicillin, latex, food allergies"
                  />
                </div>

                <div className="form-group" style={{ marginTop: 24 }}>
                  <label className="form-label">Primary Medical Requirement</label>
                  <select 
                    className="form-input form-select" 
                    value={profile.primary_specialization || ''} 
                    onChange={e => setProfile({...profile, primary_specialization: e.target.value})} 
                  >
                    <option value="">No Special Requirement (General)</option>
                    <option value="Cardiology">Cardiology (Heart)</option>
                    <option value="Neurology">Neurology (Brain/Stroke)</option>
                    <option value="Orthopedics">Orthopedics (Bones)</option>
                    <option value="Trauma Surgery">Trauma Surgery</option>
                    <option value="Burn Unit">Burn Unit</option>
                    <option value="Obstetrics">Obstetrics (Maternity)</option>
                    <option value="Pediatrics">Pediatrics (Children)</option>
                    <option value="Oncology">Oncology (Cancer)</option>
                  </select>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
                    * Used for hospital routing during dispatch.
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Pre-existing Conditions</label>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Select all that apply.</p>
                <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: 10 }}>
                  {CONDITION_GROUPS.map((group) => (
                    <div key={group.label} style={{ marginBottom: 16 }}>
                      <div className="condition-group-label">{group.label}</div>
                      <div className="condition-grid">
                        {group.conditions.map((condition) => {
                          const isSelected = (profile.conditions || []).includes(condition);
                          return (
                            <div
                              key={condition}
                              className={`condition-chip ${isSelected ? `selected ${group.severity}` : ''}`}
                              onClick={() => toggleCondition(condition)}
                            >
                              {condition}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
