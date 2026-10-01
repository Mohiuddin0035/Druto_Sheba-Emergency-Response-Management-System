'use client';
import { useState, useEffect } from 'react';
import { User, Truck, ShieldCheck, MapPin, Settings as SettingsIcon, Award, X, Plus, Trash2, Edit3, ShieldAlert } from 'lucide-react';
import { useUser } from '@/lib/UserContext';

export default function DriverSettings() {
  const { activeDriver, refreshUserContext } = useUser();
  const [loading, setLoading] = useState(true);
  const [certifications, setCertifications] = useState([]);
  
  // Stateful Toggles
  const [voiceNav, setVoiceNav] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);

  // Edit Profile Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLicense, setEditLicense] = useState('');
  const [newCertificates, setNewCertificates] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Driver stats state
  const [driverStats, setDriverStats] = useState({ rating: 0, trips_count: 0 });

  // Load preferences, certifications and driver stats
  useEffect(() => {
    if (activeDriver?.id) {
      // Preferences from localStorage
      const savedVoice = localStorage.getItem(`voiceNav_${activeDriver.id}`);
      const savedAccept = localStorage.getItem(`autoAccept_${activeDriver.id}`);
      setVoiceNav(savedVoice !== 'false'); // defaults to true
      setAutoAccept(savedAccept === 'true'); // defaults to false

      // Load certifications, verification status & driver history stats
      Promise.all([
        fetch(`/api/driver/certifications?driver_id=${activeDriver.id}&t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()).catch(() => []),
        fetch(`/api/driver/verification?driver_id=${activeDriver.id}&t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
        fetch(`/api/driver/history?driver_id=${activeDriver.id}&t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({}))
      ]).then(([certs, verifData, histData]) => {
        const standardCerts = Array.isArray(certs) ? certs : [];
        const submittedCerts = (verifData.submissions || [])
          .filter(s => s.submission_type !== 'REGISTRATION' && s.submission_type !== 'PROFILE_CHANGE')
          .map(s => ({
            certification_id: `sub_${s.submission_id}`,
            certification_name: s.certificate_name,
            issuing_authority: s.issuing_authority || 'Pending Review',
            serial_number: s.serial_number,
            batch_number: s.batch_number,
            has_own_ambulance: s.has_own_ambulance,
            ambulance_license_plate: s.ambulance_license_plate,
            is_submission: true,
            verification_status: s.status,
            date_issued: s.submitted_at
          }));
        setCertifications([...standardCerts, ...submittedCerts]);
        setDriverStats({
          rating: histData.rating || 0,
          trips_count: histData.trips_count || 0
        });
        setLoading(false);
      });
    }
  }, [activeDriver]);

  // Toggle handlers
  const handleToggleVoice = () => {
    const newVal = !voiceNav;
    setVoiceNav(newVal);
    if (activeDriver?.id) {
      localStorage.setItem(`voiceNav_${activeDriver.id}`, String(newVal));
    }
  };

  const handleToggleAccept = () => {
    const newVal = !autoAccept;
    setAutoAccept(newVal);
    if (activeDriver?.id) {
      localStorage.setItem(`autoAccept_${activeDriver.id}`, String(newVal));
    }
  };

  // Profile Save handler - Sends change request to Admin for verification instead of direct mutation
  const [profileRequestSuccess, setProfileRequestSuccess] = useState('');
  const [profileRequestError, setProfileRequestError] = useState('');
  const [hasPendingProfileChange, setHasPendingProfileChange] = useState(false);

  const handleAddNewCert = () => {
    setNewCertificates(prev => [
      ...prev,
      { certificate_name: '', issuing_authority: '', serial_number: '', batch_number: '' }
    ]);
  };

  const handleRemoveNewCert = (idx) => {
    setNewCertificates(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCertChange = (idx, field, val) => {
    setNewCertificates(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const openEditModal = () => {
    if (activeDriver?.verification_status !== 'Verified') return;
    setEditName(activeDriver?.name || '');
    setEditLicense(activeDriver?.license?.startsWith('PENDING-') ? '' : (activeDriver?.license || ''));
    setNewCertificates([]);
    setProfileRequestSuccess('');
    setProfileRequestError('');
    setIsModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editLicense.trim() || !activeDriver?.id) return;
    setIsSaving(true);
    setProfileRequestSuccess('');
    setProfileRequestError('');

    const validExtraCerts = newCertificates.filter(c => c.certificate_name?.trim());

    try {
      const res = await fetch('/api/driver/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: activeDriver.id,
          submission_type: 'PROFILE_CHANGE',
          requested_name: editName.trim(),
          requested_license_no: editLicense.trim().toUpperCase(),
          certificates: validExtraCerts
        })
      });

      const resData = await res.json();
      if (res.ok) {
        setProfileRequestSuccess(resData.message || 'Profile change & certificate verification request sent to Admin.');
        setHasPendingProfileChange(true);
        setTimeout(() => {
          setIsModalOpen(false);
          setProfileRequestSuccess('');
        }, 2200);
      } else {
        setProfileRequestError(resData.error || 'Failed to submit profile change request');
      }
    } catch (err) {
      console.error(err);
      setProfileRequestError('Error submitting profile change request');
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeDriver) return null;

  const isVerified = activeDriver.verification_status === 'Verified';

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Profile & Settings</h2>
          <p className="page-header-sub">Manage your driver account, licenses, certifications, and vehicle preferences</p>
        </div>
        <div>
          {isVerified ? (
            <button className="btn btn-primary" onClick={openEditModal} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Edit3 size={16} /> Edit Profile & Credentials
            </button>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 12,
              background: 'rgba(255, 159, 10, 0.1)',
              border: '1px solid rgba(255, 159, 10, 0.35)',
              color: 'var(--yellow)',
              fontSize: 12.5,
              fontWeight: 700
            }}>
              <ShieldAlert size={15} /> Profile Edit Available After Approval
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        
        {/* Left Col: Driver Card */}
        <div className="section-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32, textAlign: 'center' }}>
          <div style={{ width: 100, height: 100, borderRadius: 50, background: 'var(--border-subtle)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <User size={40} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 style={{ fontSize: 22, margin: 0 }}>{activeDriver.name}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>{activeDriver.role}</p>
          
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <span className={`badge ${activeDriver.verification_status === 'Verified' ? 'badge-active' : 'badge-critical'}`} style={{
              background: activeDriver.verification_status === 'Verified' ? 'rgba(52,199,89,0.15)' : 'rgba(255,159,10,0.15)',
              color: activeDriver.verification_status === 'Verified' ? 'var(--green)' : 'var(--yellow)',
              border: `1px solid ${activeDriver.verification_status === 'Verified' ? 'var(--green)' : 'var(--yellow)'}`
            }}>
              {activeDriver.verification_status === 'Pending' ? '⏳ Verification Pending' : '✓ Verified Driver'}
            </span>
            <span className="badge" style={{ background: 'rgba(255,159,10,0.1)', color: 'var(--yellow)', border: '1px solid var(--yellow)' }}>
              ⭐ {driverStats.rating && driverStats.rating > 0 ? driverStats.rating : '--'}
            </span>
          </div>

          <div style={{ width: '100%', borderTop: '1px solid var(--border-subtle)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Employee ID</span>
              <span style={{ fontWeight: 600 }}>NEX-D-100{activeDriver.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>License No.</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 600 }}>{activeDriver.license}</span>
                {(activeDriver.verification_status === 'Pending' || hasPendingProfileChange) && (
                  <span style={{ 
                    display: 'inline-block',
                    marginLeft: 6,
                    fontSize: 9, 
                    fontWeight: 800, 
                    padding: '1px 6px', 
                    borderRadius: 4, 
                    background: 'rgba(255,159,10,0.2)', 
                    color: 'var(--yellow)',
                    border: '1px solid rgba(255,159,10,0.4)'
                  }}>
                    PENDING VERIFICATION
                  </span>
                )}
              </div>
            </div>
            {activeDriver.nid_number && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>NID Number</span>
                <span style={{ fontWeight: 600 }}>{activeDriver.nid_number}</span>
              </div>
            )}
            {activeDriver.own_ambulance_plate && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Own Ambulance</span>
                <span style={{ fontWeight: 600, color: 'var(--blue)' }}>{activeDriver.own_ambulance_plate}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Joined</span>
              <span style={{ fontWeight: 600 }}>March 2024</span>
            </div>
          </div>
        </div>

        {/* Right Col: Settings & Vehicle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="section-card">
            <div className="section-header">
              <h3><Truck size={16} /> Assigned Vehicle Info</h3>
            </div>
            <div className="section-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Current Ambulance</label>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 700, 
                  marginTop: 4, 
                  color: activeDriver.verification_status !== 'Verified' ? 'var(--yellow)' : 'inherit' 
                }}>
                  {activeDriver.verification_status !== 'Verified' 
                    ? 'Verification Pending' 
                    : (activeDriver.own_ambulance_plate || activeDriver.vehicle || 'Assigned Per Trip')}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Equipment Level</label>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 700, 
                  marginTop: 4, 
                  color: activeDriver.verification_status !== 'Verified' ? 'var(--yellow)' : 'var(--red)' 
                }}>
                  {activeDriver.verification_status !== 'Verified' ? 'Verification Pending' : 'Advanced Life Support'}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Last Maintenance</label>
                <div style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>
                  {activeDriver.own_ambulance_plate ? 'Own Maintenance' : (activeDriver.verification_status !== 'Verified' ? 'Verification Pending' : 'April 15, 2026')}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Status</label>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  marginTop: 4, 
                  color: activeDriver.verification_status !== 'Verified' ? 'var(--yellow)' : 'var(--green)' 
                }}>
                  {activeDriver.verification_status !== 'Verified' ? (
                    '⏳ Verification Pending'
                  ) : (
                    <><ShieldCheck size={14} style={{ display: 'inline', marginRight: 4 }} />Cleared for Duty</>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h3><MapPin size={16} /> App Preferences</h3>
            </div>
            <div className="section-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Auto-Accept Critical Dispatches</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Automatically accept Level 1 emergencies</div>
                </div>
                <div 
                  onClick={handleToggleAccept}
                  style={{ 
                    width: 44, 
                    height: 24, 
                    background: autoAccept ? 'var(--green)' : 'var(--bg-primary)', 
                    border: autoAccept ? 'none' : '1px solid var(--border-subtle)',
                    borderRadius: 12, 
                    position: 'relative', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <div style={{ 
                    width: 20, 
                    height: 20, 
                    background: autoAccept ? 'white' : 'var(--text-muted)', 
                    borderRadius: 10, 
                    position: 'absolute', 
                    right: autoAccept ? 2 : 'auto',
                    left: autoAccept ? 'auto' : 2, 
                    top: autoAccept ? 2 : 1,
                    transition: 'all 0.2s ease-in-out'
                  }} />
                </div>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h3><Award size={16} /> Certifications & Licensing</h3>
            </div>
            <div className="section-body">
              {certifications.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {certifications.map(cert => {
                    const isExpiring = cert.expiry_date && new Date(cert.expiry_date) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days
                    return (
                      <div key={cert.certification_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {cert.certification_name}
                            {isExpiring && <span className="badge badge-critical" style={{ fontSize: 10 }}>Expiring Soon</span>}
                            {cert.is_submission && (
                              <span style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: cert.verification_status === 'Approved' ? 'rgba(52,199,89,0.2)' : 'rgba(255,159,10,0.2)',
                                color: cert.verification_status === 'Approved' ? 'var(--green)' : 'var(--yellow)',
                                border: `1px solid ${cert.verification_status === 'Approved' ? 'var(--green)' : 'var(--yellow)'}`
                              }}>
                                {cert.verification_status === 'Approved' ? '✓ Verified' : '⏳ Pending Review'}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {cert.issuing_authority} • Issued: {cert.date_issued ? new Date(cert.date_issued).toLocaleDateString() : 'N/A'}
                            {cert.serial_number ? ` • SN: ${cert.serial_number}` : ''}
                            {cert.batch_number ? ` • Batch: ${cert.batch_number}` : ''}
                          </div>
                          {cert.has_own_ambulance && (
                            <div style={{ fontSize: 12, color: 'var(--blue)', marginTop: 4 }}>
                              🚑 Own Ambulance: <strong>{cert.ambulance_license_plate}</strong>
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {cert.is_submission ? 'Status' : 'Valid Until'}
                          </div>
                          <div style={{ fontWeight: 600, color: cert.is_submission ? (cert.verification_status === 'Approved' ? 'var(--green)' : 'var(--yellow)') : (isExpiring ? 'var(--red)' : 'var(--green)') }}>
                            {cert.is_submission ? cert.verification_status : (cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString() : 'Lifetime')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: 20 }}>No certifications found on record.</div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Edit Profile Modal (Glassmorphism Popup) */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', 
          backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 1000, padding: 20
        }}>
          <div className="glass" style={{ 
            width: '100%', 
            maxWidth: 580, 
            maxHeight: '90vh', 
            borderRadius: 22, 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column', 
            position: 'relative',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.8)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Edit Driver Profile & Credentials</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, margin: '2px 0 0 0' }}>
                  Update system identification records or submit additional driving certificates
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, borderRadius: 8 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 24, gap: 20 }}>
              <div style={{
                background: 'rgba(255, 159, 10, 0.1)',
                border: '1px solid rgba(255, 159, 10, 0.35)',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 12,
                color: 'var(--yellow)',
                lineHeight: 1.5
              }}>
                🛡️ <strong>Admin Verification Policy:</strong> নিরাপত্তা ও সিস্টেম অডিট স্বার্থে চালক নিজে সরাসরি নাম ও লাইসেন্স পরিবর্তন করতে পারবেন না। &apos;Save & Submit to Admin&apos; দিলে আবেদনটি অ্যাডমিনের কাছে ভেরিফিকেশনের জন্য চলে যাবে। অ্যাডমিন অনুমোদন করলে আপনার ড্যাশবোর্ডে এটি স্বয়ংক্রিয়ভাবে আপডেট হয়ে যাবে।
              </div>

              {profileRequestSuccess && (
                <div style={{
                  background: 'rgba(52, 199, 89, 0.18)',
                  border: '1px solid var(--green)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: 12.5,
                  color: 'var(--green)',
                  fontWeight: 600
                }}>
                  ✓ {profileRequestSuccess}
                </div>
              )}

              {profileRequestError && (
                <div style={{
                  background: 'rgba(255, 45, 85, 0.15)',
                  border: '1px solid var(--red)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: 12.5,
                  color: 'var(--red)',
                  fontWeight: 600
                }}>
                  ⚠ {profileRequestError}
                </div>
              )}
              
              {/* Personal Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  1. Official Identification
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your full official name"
                    required 
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>BRTA Driving License Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editLicense}
                    onChange={(e) => setEditLicense(e.target.value)}
                    placeholder="e.g. DL-DH-908234"
                    required 
                  />
                </div>
              </div>

              {/* Extra Certifications & Courses */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid var(--border-subtle)', paddingTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      2. Add Extra Certificate or Training
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      Attach advanced driving, first aid, or life-support credentials
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewCert}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: 8,
                      background: 'rgba(255, 159, 10, 0.15)',
                      color: 'var(--yellow)',
                      border: '1px solid rgba(255, 159, 10, 0.35)',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> Add Certificate
                  </button>
                </div>

                {newCertificates.length === 0 ? (
                  <div style={{
                    padding: 16,
                    borderRadius: 12,
                    background: 'var(--bg-input)',
                    border: '1px dashed var(--border-subtle)',
                    textAlign: 'center',
                    fontSize: 12,
                    color: 'var(--text-muted)'
                  }}>
                    No extra certificate added. Click &quot;Add Certificate&quot; above to submit an additional certificate for admin approval.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {newCertificates.map((cert, idx) => (
                      <div key={idx} style={{
                        padding: 14,
                        borderRadius: 12,
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--yellow)' }}>
                            Certificate #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewCert(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--red)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11
                            }}
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label className="form-label" style={{ fontSize: 11 }}>Certificate / Course Name</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. Advanced Defensive Driving"
                              style={{ fontSize: 12, height: 38 }}
                              value={cert.certificate_name}
                              onChange={(e) => handleCertChange(idx, 'certificate_name', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: 11 }}>Issuing Authority / Institute</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. Red Crescent / BRTA"
                              style={{ fontSize: 12, height: 38 }}
                              value={cert.issuing_authority}
                              onChange={(e) => handleCertChange(idx, 'issuing_authority', e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label className="form-label" style={{ fontSize: 11 }}>Serial Number (or N/A)</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. SN-88231 or N/A"
                              style={{ fontSize: 12, height: 38 }}
                              value={cert.serial_number}
                              onChange={(e) => handleCertChange(idx, 'serial_number', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: 11 }}>Batch / Training ID</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. BATCH-24 or N/A"
                              style={{ fontSize: 12, height: 38 }}
                              value={cert.batch_number}
                              onChange={(e) => handleCertChange(idx, 'batch_number', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 4, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ 
                    flex: 1, 
                    border: '1px solid rgba(255, 255, 255, 0.18)', 
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={isSaving}
                >
                  {isSaving ? 'Submitting Application...' : 'Save & Submit to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
