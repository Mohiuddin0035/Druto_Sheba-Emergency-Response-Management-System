'use client';
import { useState, useEffect } from 'react';
import { 
  User, ShieldCheck, Award, Mail, Phone, Clock, Briefcase, Hash, Calendar, 
  GraduationCap, MapPin, Edit3, X, Plus, Trash2, CheckCircle2, AlertCircle, 
  ExternalLink, Sparkles, Building, BookmarkCheck
} from 'lucide-react';

export default function DispatcherProfile() {
  const [activeDispatcher, setActiveDispatcher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState([]);
  const [pendingProfileChange, setPendingProfileChange] = useState(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [newQualifications, setNewQualifications] = useState([]);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  const fetchProfile = async () => {
    let userId = localStorage.getItem('emergency_staff_user');
    if (!userId || userId === 'undefined') {
      try {
        const meRes = await fetch('/api/auth/me?portal=dispatcher', { cache: 'no-store' });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.userId) {
            userId = String(meData.userId);
            localStorage.setItem('emergency_staff_user', userId);
          }
        }
      } catch (e) {}
    }

    try {
      const vUrl = userId && userId !== 'undefined'
        ? `/api/dispatcher/verification?userId=${userId}&t=${Date.now()}`
        : `/api/dispatcher/verification?t=${Date.now()}`;
      const res = await fetch(vUrl, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setActiveDispatcher(data.staff);
        setVerifications(data.verifications || []);
        setPendingProfileChange(data.pendingProfileChange || null);
        if (data.staff?.user_id) {
          localStorage.setItem('emergency_staff_user', String(data.staff.user_id));
        }
      }
    } catch (e) {
      console.error('Failed to load dispatcher profile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const openEditModal = () => {
    if (!activeDispatcher) return;
    setEditName(activeDispatcher.name || '');
    setEditEmail(activeDispatcher.email || '');
    setEditPhone(activeDispatcher.phone || '');
    setNewQualifications([]);
    setEditSuccessMsg('');
    setEditErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleAddNewQual = () => {
    setNewQualifications(prev => [
      ...prev,
      {
        type: 'Bachelor',
        title: '',
        institute: '',
        serial_or_student_id: ''
      }
    ]);
  };

  const handleRemoveNewQual = (idx) => {
    setNewQualifications(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQualChange = (idx, field, val) => {
    setNewQualifications(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editEmail.trim() || !editPhone.trim()) {
      setEditErrorMsg('Name, email, and phone number are required.');
      return;
    }

    setIsSubmittingEdit(true);
    setEditErrorMsg('');
    setEditSuccessMsg('');

    try {
      const res = await fetch('/api/dispatcher/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeDispatcher.user_id,
          action: 'PROFILE_EDIT',
          profileData: {
            name: editName.trim(),
            email: editEmail.trim(),
            phone: editPhone.trim(),
            newQualifications
          }
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setEditSuccessMsg('Profile update submitted! Admin verification is required before changes go live.');
        setPendingProfileChange(resData.requestedChanges);
        setTimeout(() => {
          setIsEditModalOpen(false);
          setEditSuccessMsg('');
          fetchProfile();
        }, 2200);
      } else {
        setEditErrorMsg(resData.error || 'Failed to submit profile update');
      }
    } catch (err) {
      console.error(err);
      setEditErrorMsg('Network error while saving profile.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!activeDispatcher) {
    return (
      <div className="page-container" style={{ padding: 24 }}>
        <h2>Error loading profile.</h2>
      </div>
    );
  }

  const isVerified = activeDispatcher.verification_status === 'Approved';
  const joinDate = activeDispatcher.created_at ? new Date(activeDispatcher.created_at) : null;
  const joinDisplay = joinDate ? joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A';

  // Badge logic: while Pending, level is NOT shown as Junior
  const displayLevel = isVerified 
    ? (activeDispatcher.level || 'Junior') 
    : 'Pending Review';

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header with Title and Action Button */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
              Profile & Credentials
            </h2>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 6,
              background: isVerified ? 'rgba(0,255,136,0.12)' : 'rgba(255,214,0,0.12)',
              color: isVerified ? 'var(--green)' : 'var(--yellow)',
              border: `1px solid ${isVerified ? 'var(--green)' : 'var(--yellow)'}`,
              textTransform: 'uppercase'
            }}>
              {isVerified ? 'Cleared Staff' : 'Under Clearance'}
            </span>
          </div>
          <p className="page-header-sub" style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: 13.5 }}>
            View official system identity, credentials clearance status, and institutional qualifications
          </p>
        </div>

        {/* Edit Profile Button - Only available to verified accounts */}
        <div>
          {isVerified ? (
            <button 
              className="btn btn-primary" 
              onClick={openEditModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 13.5,
                background: 'linear-gradient(135deg, #0a84ff 0%, #0066cc 100%)',
                color: '#fff',
                border: 'none',
                boxShadow: '0 4px 14px rgba(10,132,255,0.35)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Edit3 size={16} /> Edit Profile
            </button>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 600
            }}>
              <ShieldCheck size={14} /> Profile Edit Available After Approval
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
        
        {/* Left Column: Dispatcher Identity Card */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Card Top Banner with Ambient Glow */}
          <div style={{
            height: 110,
            background: isVerified 
              ? 'linear-gradient(135deg, rgba(10,132,255,0.25) 0%, rgba(0,255,136,0.15) 100%)' 
              : 'linear-gradient(135deg, rgba(255,159,10,0.25) 0%, rgba(255,69,58,0.15) 100%)',
            borderBottom: '1px solid var(--border-subtle)',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 14,
              right: 14,
              display: 'flex',
              gap: 6
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                backdropFilter: 'blur(8px)',
                letterSpacing: 0.5
              }}>
                DISPATCH HUB
              </span>
            </div>
          </div>

          {/* Avatar and Main Identity */}
          <div style={{ padding: '0 24px 24px 24px', textAlign: 'center', marginTop: -50 }}>
            <div style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'var(--bg-secondary)',
              border: `3px solid ${isVerified ? 'var(--blue)' : 'var(--yellow)'}`,
              boxShadow: isVerified ? '0 0 20px rgba(0,240,255,0.3)' : '0 0 20px rgba(255,214,0,0.25)',
              margin: '0 auto 16px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <User size={48} style={{ color: isVerified ? 'var(--blue)' : 'var(--yellow)' }} />
              <div style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: isVerified ? 'var(--green)' : 'var(--yellow)',
                border: '2px solid var(--bg-secondary)'
              }} />
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>
              {activeDispatcher.name}
            </h3>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 16 }}>
              {isVerified ? `${activeDispatcher.level} Dispatcher` : 'Awaiting Operational Clearance'}
            </div>

            {/* Badges Pill Row */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 8,
                background: isVerified ? 'rgba(0,255,136,0.12)' : 'rgba(255,214,0,0.12)',
                color: isVerified ? 'var(--green)' : 'var(--yellow)',
                border: `1px solid ${isVerified ? 'rgba(0,255,136,0.3)' : 'rgba(255,214,0,0.3)'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}>
                {isVerified ? '✓ Cleared Dispatcher' : '⏳ Verification Pending'}
              </span>

              {/* Ranks badge: strictly driven by database and only active when verified */}
              {isVerified ? (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: activeDispatcher.level === 'Senior' ? 'rgba(255,214,0,0.15)' : 'rgba(0,240,255,0.12)',
                  color: activeDispatcher.level === 'Senior' ? 'var(--yellow)' : 'var(--blue)',
                  border: `1px solid ${activeDispatcher.level === 'Senior' ? 'var(--yellow)' : 'var(--blue)'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}>
                  ⭐ {activeDispatcher.level} Level
                </span>
              ) : (
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  🔒 Rank Unassigned
                </span>
              )}
            </div>

            {/* Profile Fields List */}
            <div style={{
              width: '100%',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              textAlign: 'left'
            }}>
              {/* Employee ID */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Hash size={14} /> Employee ID
                </span>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                  NEX-DISP-{activeDispatcher.user_id}
                </span>
              </div>

              {/* Username */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={14} /> Username
                </span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>
                  {activeDispatcher.username}
                </span>
              </div>

              {/* Email */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Mail size={14} /> Email
                </span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-all' }}>
                    {activeDispatcher.email}
                  </span>
                  {pendingProfileChange?.requested_email && (
                    <div style={{ marginTop: 2 }}>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: 'rgba(255,214,0,0.15)',
                        color: 'var(--yellow)',
                        border: '1px solid rgba(255,214,0,0.3)',
                        textTransform: 'uppercase'
                      }}>
                        Pending: {pendingProfileChange.requested_email}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Phone size={14} /> Phone
                </span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    {activeDispatcher.phone}
                  </span>
                  {pendingProfileChange?.requested_phone && (
                    <div style={{ marginTop: 2 }}>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: 'rgba(255,214,0,0.15)',
                        color: 'var(--yellow)',
                        border: '1px solid rgba(255,214,0,0.3)',
                        textTransform: 'uppercase'
                      }}>
                        Pending: {pendingProfileChange.requested_phone}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* National ID (NID) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={14} color="var(--blue)" /> National ID (NID)
                </span>
                <span style={{ 
                  fontWeight: 700, 
                  fontSize: 12.5, 
                  letterSpacing: 0.5,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: activeDispatcher.nid_number ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.04)',
                  color: activeDispatcher.nid_number ? '#38bdf8' : 'var(--text-muted)',
                  border: `1px solid ${activeDispatcher.nid_number ? 'rgba(56, 189, 248, 0.25)' : 'var(--border-subtle)'}`
                }}>
                  {activeDispatcher.nid_number || 'Awaiting Clearance'}
                </span>
              </div>

              {/* Name change indicator if applicable */}
              {pendingProfileChange?.requested_name && pendingProfileChange.requested_name !== activeDispatcher.name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>Name Update</span>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'rgba(255,214,0,0.15)',
                    color: 'var(--yellow)',
                    border: '1px solid rgba(255,214,0,0.3)',
                    textTransform: 'uppercase'
                  }}>
                    Pending: {pendingProfileChange.requested_name}
                  </span>
                </div>
              )}

              {/* Joined Date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} /> Joined
                </span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {joinDisplay}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dispatch Assignment Info & Qualifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Assignment Information Card */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 20,
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
            padding: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', pb: 14 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(10,132,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--blue)'
              }}>
                <Briefcase size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Dispatch Assignment Info</h3>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Operational clearance and system authority parameters</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {/* Role */}
              <div style={{
                background: 'var(--bg-input)',
                borderRadius: 14,
                padding: 16,
                border: '1px solid var(--border-subtle)'
              }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
                  Current Role
                </label>
                <div style={{ fontSize: 15, fontWeight: 800, marginTop: 6, color: 'var(--text-primary)' }}>
                  Emergency Dispatcher
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Central Druto Sheba Operations Desk
                </div>
              </div>

              {/* Level */}
              <div style={{
                background: 'var(--bg-input)',
                borderRadius: 14,
                padding: 16,
                border: '1px solid var(--border-subtle)'
              }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
                  Dispatcher Level
                </label>
                <div style={{ 
                  fontSize: 15, 
                  fontWeight: 800, 
                  marginTop: 6,
                  color: isVerified ? (activeDispatcher.level === 'Senior' ? 'var(--yellow)' : 'var(--blue)') : 'var(--yellow)'
                }}>
                  {isVerified ? `${activeDispatcher.level} Dispatcher` : 'Pending Verification'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {isVerified 
                    ? (activeDispatcher.level === 'Senior' ? 'Authorized for Priority 1 Emergencies' : 'Standard Emergency Dispatch')
                    : 'Awaiting credential review'}
                </div>
              </div>

              {/* Account Status */}
              <div style={{
                background: 'var(--bg-input)',
                borderRadius: 14,
                padding: 16,
                border: '1px solid var(--border-subtle)'
              }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
                  Account Status
                </label>
                <div style={{ fontSize: 15, fontWeight: 800, marginTop: 6 }}>
                  {activeDispatcher.status === 'Active' ? (
                    <span style={{ color: 'var(--green)' }}>● Active</span>
                  ) : (
                    <span style={{ color: 'var(--red)' }}>● {activeDispatcher.status}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  System Authentication Enabled
                </div>
              </div>

              {/* Verification Status */}
              <div style={{
                background: 'var(--bg-input)',
                borderRadius: 14,
                padding: 16,
                border: '1px solid var(--border-subtle)'
              }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
                  Credentials Clearance
                </label>
                <div style={{ 
                  fontSize: 15, 
                  fontWeight: 800, 
                  marginTop: 6,
                  color: isVerified ? 'var(--green)' : 'var(--yellow)'
                }}>
                  {isVerified ? '✓ Cleared for Dispatch' : '⏳ Pending Review'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {isVerified ? 'All checks verified by Admin' : 'HSC/Academic check underway'}
                </div>
              </div>
            </div>
          </div>

          {/* Certifications & Educational Records Card */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 20,
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
            padding: 24
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(0,255,136,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--green)'
                }}>
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Academic Qualifications & Certifications</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Institutional records validated for dispatcher seniority</div>
                </div>
              </div>

              {isVerified && (
                <button
                  onClick={openEditModal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'rgba(0,240,255,0.1)',
                    color: 'var(--blue)',
                    border: '1px solid rgba(0,240,255,0.3)',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} /> Add Degree / Course
                </button>
              )}
            </div>

            {/* Pending Update Notice if profile changes are awaiting admin review */}
            {pendingProfileChange && (
              <div style={{
                background: 'rgba(255,214,0,0.08)',
                border: '1px solid rgba(255,214,0,0.3)',
                borderRadius: 14,
                padding: '14px 18px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}>
                <AlertCircle size={20} color="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--yellow)' }}>
                    Pending Profile & Qualification Changes Under Review
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                    You have submitted an update request to the Admin desk. Your active profile continues to display previously approved data until the administrator reviews and certifies the modifications.
                  </div>
                  {Array.isArray(pendingProfileChange.new_qualifications) && pendingProfileChange.new_qualifications.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {pendingProfileChange.new_qualifications.map((nq, nIdx) => (
                        <span key={nIdx} style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(255,214,0,0.15)',
                          color: 'var(--yellow)',
                          border: '1px solid rgba(255,214,0,0.35)'
                        }}>
                          ⏳ {nq.title || nq.type} ({nq.institute || 'Pending'})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {verifications.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {verifications.map((v, i) => {
                  let rawExtra = v.extra_qualifications;
                  if (typeof rawExtra === 'string') {
                    try { rawExtra = JSON.parse(rawExtra); } catch (e) { rawExtra = []; }
                  }
                  
                  // Handle profile edit extra format vs standard array
                  let extraList = [];
                  let isProfileEditRecord = false;
                  if (rawExtra && rawExtra.is_profile_edit) {
                    isProfileEditRecord = true;
                    extraList = rawExtra.changes?.new_qualifications || [];
                  } else if (Array.isArray(rawExtra)) {
                    extraList = rawExtra;
                  }

                  return (
                    <div 
                      key={i} 
                      style={{ 
                        padding: 20, 
                        borderRadius: 16, 
                        border: '1px solid var(--border-subtle)', 
                        background: 'var(--bg-input)'
                      }}
                    >
                      {/* Top Header of Record */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                            {isProfileEditRecord ? '📝 Profile & Qualification Update Request' : '🎓 Higher Secondary Certificate (HSC) Verification'}
                          </span>
                        </div>
                        <span style={{ 
                          fontSize: 10, 
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: v.status === 'Approved' ? 'rgba(0,255,136,0.15)' : 'rgba(255,214,0,0.15)', 
                          color: v.status === 'Approved' ? 'var(--green)' : 'var(--yellow)',
                          border: `1px solid ${v.status === 'Approved' ? 'var(--green)' : 'var(--yellow)'}`,
                          fontWeight: 800,
                          textTransform: 'uppercase'
                        }}>
                          {v.status === 'Approved' ? '✓ APPROVED & VALID' : '⏳ PENDING APPROVAL'}
                        </span>
                      </div>

                      {/* HSC & Identity Core Credentials Grid */}
                      {!isProfileEditRecord && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: 12,
                          background: 'rgba(255,255,255,0.02)',
                          padding: 14,
                          borderRadius: 12,
                          border: '1px solid var(--border-subtle)',
                          marginBottom: 16
                        }}>
                          {(v.nid_number || activeDispatcher.nid_number) && (
                            <div>
                              <label style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>National ID (NID)</label>
                              <div style={{ fontSize: 13.5, fontWeight: 800, marginTop: 2, color: '#38bdf8' }}>{v.nid_number || activeDispatcher.nid_number}</div>
                            </div>
                          )}
                          <div>
                            <label style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Board</label>
                            <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{v.hsc_board || 'N/A'}</div>
                          </div>
                          <div>
                            <label style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Passing Year</label>
                            <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{v.hsc_year || 'N/A'}</div>
                          </div>
                          <div>
                            <label style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Registration No.</label>
                            <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{v.hsc_reg_no || 'N/A'}</div>
                          </div>
                          <div>
                            <label style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Roll No.</label>
                            <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{v.hsc_roll_no || 'N/A'}</div>
                          </div>
                        </div>
                      )}

                      {/* Additional Degree/Certificate Listing */}
                      {extraList && extraList.length > 0 && (
                        <div>
                          <h4 style={{ 
                            fontSize: 12.5, 
                            fontWeight: 800, 
                            margin: '0 0 10px 0', 
                            color: 'var(--text-secondary)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 6 
                          }}>
                            <Award size={15} color="var(--orange)" /> Higher Degrees & Professional Certificates
                          </h4>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                            {extraList.map((eq, eIdx) => {
                              const isBachelor = (eq.type === 'Bachelor' || eq.title?.toLowerCase().includes('bachelor') || eq.degree_name?.toLowerCase().includes('bachelor'));
                              const title = eq.title || eq.degree_name || eq.certificate_name || (isBachelor ? "Bachelor's Degree" : (eq.type || 'Course Certificate'));
                              const institute = eq.institute || eq.issuing_authority || 'Institutional Record';
                              const idNum = eq.serial_or_student_id || eq.roll_no || eq.serial_no || 'N/A';

                              return (
                                <div key={eIdx} style={{ 
                                  padding: '12px 14px', 
                                  borderRadius: 12, 
                                  background: 'var(--bg-card)', 
                                  border: `1px solid ${isBachelor ? 'rgba(255,214,0,0.3)' : 'var(--border-subtle)'}`,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 6,
                                  position: 'relative'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                      <div style={{ 
                                        fontSize: 13.5, 
                                        fontWeight: 800, 
                                        color: isBachelor ? 'var(--yellow)' : 'var(--text-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                      }}>
                                        {isBachelor && '🎓'} {title}
                                      </div>
                                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Building size={12} /> {institute}
                                      </div>
                                    </div>

                                    <span style={{ 
                                      fontSize: 9, 
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      background: v.status === 'Approved' ? 'rgba(0,255,136,0.15)' : 'rgba(255,214,0,0.15)', 
                                      color: v.status === 'Approved' ? 'var(--green)' : 'var(--yellow)',
                                      border: `1px solid ${v.status === 'Approved' ? 'var(--green)' : 'var(--yellow)'}`,
                                      fontWeight: 800
                                    }}>
                                      {v.status === 'Approved' ? 'CERTIFIED' : 'PENDING'}
                                    </span>
                                  </div>

                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: 6, marginTop: 2 }}>
                                    <span>ID / Serial: <strong style={{ color: 'var(--text-secondary)' }}>{idNum}</strong></span>
                                    {isBachelor && (
                                      <span style={{ color: 'var(--yellow)', fontWeight: 700 }}>
                                        Qualifies for Senior Rank
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '48px 24px', 
                borderRadius: 16,
                background: 'var(--bg-input)',
                border: '1px dashed var(--border-subtle)',
                color: 'var(--text-muted)' 
              }}>
                <GraduationCap size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>No Qualification Submissions on File</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Submit educational and certification documents on the Dispatcher Dashboard to begin clearance.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal (Glassmorphic Window) */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 20
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 24,
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
            width: '100%',
            maxWidth: 620,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
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
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                  Edit Dispatcher Profile & Education
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Modify personal records or submit new degrees/certifications
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 8
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 24, gap: 20 }}>
              
              {/* Admin Approval Notice Banner */}
              <div style={{
                background: 'rgba(255,214,0,0.08)',
                border: '1px solid rgba(255,214,0,0.3)',
                borderRadius: 14,
                padding: '12px 16px',
                fontSize: 12,
                color: 'var(--yellow)',
                lineHeight: 1.5
              }}>
                🛡️ <strong>Admin Verification Policy:</strong> নিরাপত্তা ও সিস্টেম অডিট স্বার্থে যেকোনো পরিবর্তন অ্যাডমিনের রিভিউ ছাড়া প্রোফাইলে যুক্ত হবে না। সাবমিট করলে পূর্ববর্তী তথ্যই দৃশ্যমান থাকবে এবং সংশ্লিষ্ট ফিল্ডে <strong>&apos;Pending&apos;</strong> ট্যাগ দেখানো হবে। অ্যাডমিন অনুমোদন করলে স্বয়ংক্রিয়ভাবে নতুন ডাটা প্রোফাইলে আপডেট হবে।
              </div>

              {editSuccessMsg && (
                <div style={{
                  background: 'rgba(0,255,136,0.12)',
                  border: '1px solid var(--green)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  color: 'var(--green)',
                  fontSize: 12.5,
                  fontWeight: 700
                }}>
                  ✓ {editSuccessMsg}
                </div>
              )}

              {editErrorMsg && (
                <div style={{
                  background: 'rgba(255,0,85,0.12)',
                  border: '1px solid var(--red)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  color: 'var(--red)',
                  fontSize: 12.5,
                  fontWeight: 700
                }}>
                  ⚠ {editErrorMsg}
                </div>
              )}

              {/* Personal Details Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  1. Official Dispatcher Details
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>Full Official Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Official Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Contact Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Add Higher Education / Degree / Course Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid var(--border-subtle)', paddingTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      2. Add Higher Degree or Skill Certificate
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      Did you complete a Bachelor&apos;s or course? Add it here to qualify for Senior promotion!
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewQual}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: 8,
                      background: 'rgba(0,240,255,0.12)',
                      color: 'var(--blue)',
                      border: '1px solid rgba(0,240,255,0.3)',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> Add New
                  </button>
                </div>

                {newQualifications.length === 0 ? (
                  <div style={{
                    padding: 16,
                    borderRadius: 12,
                    background: 'var(--bg-input)',
                    border: '1px dashed var(--border-subtle)',
                    textAlign: 'center',
                    fontSize: 12,
                    color: 'var(--text-muted)'
                  }}>
                    No new degree or certificate added. Click &quot;Add New&quot; above if you have completed additional studies.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {newQualifications.map((q, idx) => (
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
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--blue)' }}>
                            Qualification #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewQual(idx)}
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

                        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 10 }}>
                          <div>
                            <label className="form-label" style={{ fontSize: 11 }}>Type</label>
                            <select
                              className="form-input form-select"
                              style={{ fontSize: 12, height: 38 }}
                              value={q.type}
                              onChange={(e) => handleQualChange(idx, 'type', e.target.value)}
                            >
                              <option value="Bachelor">Bachelor Degree</option>
                              <option value="Certificate">Certificate / Course</option>
                              <option value="Diploma">Diploma</option>
                            </select>
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: 11 }}>Degree / Certificate Name</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. B.Sc in CSE / First Responder Training"
                              style={{ fontSize: 12, height: 38 }}
                              value={q.title}
                              onChange={(e) => handleQualChange(idx, 'title', e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label className="form-label" style={{ fontSize: 11 }}>Institution / University</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. Dhaka University / Red Crescent"
                              style={{ fontSize: 12, height: 38 }}
                              value={q.institute}
                              onChange={(e) => handleQualChange(idx, 'institute', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: 11 }}>
                              Serial / Student ID (or N/A)
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. 1902045 or CERT-7890 or N/A"
                              style={{ fontSize: 12, height: 38 }}
                              value={q.serial_or_student_id}
                              onChange={(e) => handleQualChange(idx, 'serial_or_student_id', e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
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
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={isSubmittingEdit}
                >
                  {isSubmittingEdit ? 'Submitting Application...' : 'Save & Submit to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
