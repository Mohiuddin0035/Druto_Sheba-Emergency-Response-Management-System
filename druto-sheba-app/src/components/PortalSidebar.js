import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, User, ArrowLeftRight, ChevronUp, UserPlus, Check, Truck, Droplet, LogOut, HardHat } from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import CreateUserModal from './CreateUserModal';
import UnderConstructionModal from './UnderConstructionModal';

export default function PortalSidebar({ portalName, portalColor, portalIcon: PortalIcon, navItems }) {
  const pathname = usePathname();
  const { activeDriver, setDriver, availableDrivers, activePatient, setPatient, availablePatients, refreshUserContext, patientLogout, driverLogout, dbConnected, dbError } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [constructionFeature, setConstructionFeature] = useState(null);
  const menuRef = useRef(null);
  const router = useRouter();

  const [pendingCount, setPendingCount] = useState(0);
  const [driverUnreadCount, setDriverUnreadCount] = useState(0);
  const [patientUnreadCount, setPatientUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  // Load current user for role bypass and verification check
  useEffect(() => {
    const portal = portalName === 'Admin Portal' ? 'admin' : portalName === 'Dispatcher Portal' ? 'dispatcher' : 'patient';
    fetch(`/api/auth/me?portal=${portal}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.username) {
          setCurrentUser(data);
        }
      })
      .catch(() => {});
  }, [portalName]);

  // Poll for pending SOS count for the admin bulb alert
  useEffect(() => {
    if (portalName !== 'Admin Portal') return;
    
    const checkPending = async () => {
      try {
        const res = await fetch('/api/admin/pending-count');
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.count || 0);
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, [portalName]);

  // Poll for driver unread inbox messages to display glowing notification badge
  useEffect(() => {
    if (portalName !== 'Driver Portal' || !activeDriver?.id) return;

    const checkDriverInbox = async () => {
      try {
        const res = await fetch(`/api/driver/inbox?driver_id=${activeDriver.id}&t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setDriverUnreadCount(data.unread_count || 0);
        }
      } catch (err) {
        console.error('Error fetching driver unread inbox count:', err);
      }
    };

    checkDriverInbox();
    const interval = setInterval(checkDriverInbox, 5000);
    return () => clearInterval(interval);
  }, [portalName, activeDriver?.id]);

  // Poll for patient unread inbox messages to display glowing notification badge
  useEffect(() => {
    if (portalName !== 'Patient Portal' || !activePatient?.id) return;

    const checkPatientInbox = async () => {
      try {
        const res = await fetch(`/api/patient/inbox?patient_id=${activePatient.id}&t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setPatientUnreadCount(data.unread_count || 0);
        }
      } catch (err) {
        console.error('Error fetching patient unread inbox count:', err);
      }
    };

    checkPatientInbox();
    const interval = setInterval(checkPatientInbox, 5000);
    return () => clearInterval(interval);
  }, [portalName, activePatient?.id]);

  const handleLogout = async () => {
    try {
      const portalParam = portalName === 'Admin Portal' ? 'admin' : 'dispatcher';
      
      if (portalParam === 'dispatcher') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('emergency_staff_user');
        }
      }

      await fetch(`/api/auth/logout?portal=${portalParam}`, { method: 'POST' });
      if (portalParam === 'dispatcher') {
        window.location.href = '/login?portal=dispatcher';
      } else if (portalParam === 'admin') {
        window.location.href = '/login?portal=admin';
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const getDisplayName = () => {
    if (portalName === 'Driver Portal') return activeDriver?.name || 'Loading...';
    if (portalName === 'Patient Portal') return activePatient?.name || 'Loading...';
    if (portalName === 'Dispatcher Portal') {
      if (currentUser?.username?.startsWith('Bypass Dispatcher:')) {
        return currentUser.username;
      }
      return currentUser?.name || currentUser?.username || 'Dispatcher Officer';
    }
    if (portalName === 'Admin Portal') return currentUser?.name || currentUser?.username || 'Chief Administrator';
    return 'User';
  };

  const getDisplayRole = () => {
    if (portalName === 'Driver Portal') return activeDriver?.role || 'Emergency Driver';
    if (portalName === 'Patient Portal') return `Blood Group: ${activePatient?.blood_type || 'N/A'}`;
    if (portalName === 'Dispatcher Portal') {
      if (currentUser?.verification_status === 'Pending') {
        return 'Pending Verification ⏳';
      }
      if (currentUser?.username?.startsWith('Bypass Dispatcher:')) {
        return 'Admin Bypass Mode';
      }
      if (currentUser?.level) {
        return `${currentUser.level} Dispatcher`;
      }
      return 'Emergency Command';
    }
    if (portalName === 'Admin Portal') return currentUser?.role || 'System Control';
    return 'Portal Access';
  };

  const handleSelectUser = (id, type) => {
    if (type === 'patient') setPatient(id);
    else setDriver(id);
    setMenuOpen(false);
  };

  const handleUserCreated = async () => {
    await refreshUserContext();
  };

  const isPatientPortal = portalName === 'Patient Portal';
  const isDriverPortal = portalName === 'Driver Portal';
  // With real authentication (login/register), users must not be able to freely switch to arbitrary other accounts from the sidebar
  const hasMenu = false;
  const users = isPatientPortal ? availablePatients : isDriverPortal ? availableDrivers : [];
  const activeUser = isPatientPortal ? activePatient : isDriverPortal ? activeDriver : null;
  const userType = isPatientPortal ? 'patient' : 'driver';

  return (
    <>
      <style>{`
        .user-menu-panel {
          position: absolute; bottom: 100%; left: 0; right: 0;
          background: rgba(18, 18, 24, 0.98);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; margin-bottom: 8px;
          box-shadow: 0 -12px 40px rgba(0,0,0,0.5);
          backdrop-filter: blur(20px);
          max-height: 340px; overflow-y: auto;
          opacity: 0; transform: translateY(8px);
          transition: opacity 0.2s ease, transform 0.2s ease;
          pointer-events: none; z-index: 100;
          scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        .user-menu-panel.open {
          opacity: 1; transform: translateY(0);
          pointer-events: all;
        }
        .user-menu-header {
          padding: 14px 16px 10px; font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 1.5px;
          color: var(--text-muted); border-bottom: 1px solid rgba(255,255,255,0.05);
          position: sticky; top: 0; background: rgba(18,18,24,0.98);
          backdrop-filter: blur(20px); z-index: 1;
        }
        .user-menu-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 16px; cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .user-menu-item:hover { background: rgba(255,255,255,0.05); }
        .user-menu-item.active { background: rgba(255,255,255,0.04); }
        .user-menu-avatar {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; flex-shrink: 0;
        }
        .user-menu-info { flex: 1; overflow: hidden; }
        .user-menu-name {
          font-size: 13px; font-weight: 700;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .user-menu-meta {
          font-size: 10px; color: var(--text-muted); margin-top: 1px;
        }
        .user-menu-check {
          width: 20px; height: 20px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .user-menu-register {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 16px; cursor: pointer;
          font-size: 13px; font-weight: 700;
          transition: background 0.15s;
          position: sticky; bottom: 0;
          background: rgba(18,18,24,0.98);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .user-menu-register:hover { background: rgba(255,255,255,0.05); }

        .user-card-trigger {
          display: flex; align-items: center; gap: 12px;
          cursor: pointer; padding: 8px 10px; border-radius: 12px;
          transition: background 0.15s; width: 100%;
        }
        .user-card-trigger:hover { background: rgba(255,255,255,0.04); }

        .ambulance-siren-active {
          animation: realSirenFlash 0.5s infinite alternate;
        }
        @keyframes realSirenFlash {
          0% {
            color: #ff3b30;
            filter: drop-shadow(0 0 8px #ff3b30);
          }
          100% {
            color: #007aff;
            filter: drop-shadow(0 0 8px #007aff);
          }
        }

        .notification-red-dot-glow {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #ff3b30;
          border: 1.5px solid #1a1a24;
          box-shadow: 0 0 10px #ff3b30, 0 0 4px #ff453a;
          animation: redDotGlowPulse 1.6s infinite cubic-bezier(0.4, 0, 0.6, 1);
        }

        @keyframes redDotGlowPulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.8), 0 0 8px #ff3b30;
          }
          70% {
            transform: scale(1.15);
            box-shadow: 0 0 0 8px rgba(255, 59, 48, 0), 0 0 14px #ff3b30;
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(255, 59, 48, 0), 0 0 8px #ff3b30;
          }
        }
      `}</style>

      <aside className="sidebar">
        <div className="sidebar-header" style={{ position: 'relative' }}>
          <div className="sidebar-logo" style={{ background: `${portalColor}22` }}>
            <PortalIcon size={20} style={{ color: portalColor }} />
          </div>
          <div className="sidebar-brand">
            <h1 style={{ display: 'flex', alignItems: 'center', margin: 0, fontSize: '16px', fontWeight: 800, whiteSpace: 'nowrap' }}>
              Druto Sheba
              {portalName === 'Admin Portal' && (
                <svg 
                  viewBox="0 0 24 24" 
                  width="18" 
                  height="18" 
                  className={pendingCount > 0 ? 'ambulance-siren-active' : ''} 
                  style={{ 
                    color: pendingCount > 0 ? '#ff3b30' : 'rgba(255,255,255,0.25)',
                    transition: 'color 0.3s ease, filter 0.3s ease',
                    marginLeft: '8px',
                    flexShrink: 0
                  }}
                  title={pendingCount > 0 ? `${pendingCount} pending SOS requests!` : 'No pending SOS requests'}
                >
                  <path d="M4 19h16v2H4z" fill="#444" />
                  <path d="M6 18c0-5 3-7 6-7s6 2 6 7H6z" fill="currentColor" />
                  <circle cx="12" cy="14" r="3" fill="#fff" opacity="0.4" />
                </svg>
              )}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: '2px' }}>
              <span style={{ color: portalColor, fontSize: '11px', fontWeight: 600 }}>{portalName}</span>
              <button 
                type="button"
                onClick={() => {
                  if (!dbConnected) {
                    alert(`🔴 DATABASE CONNECTION ERROR DETAILS:\n\n${dbError || 'Could not connect to PostgreSQL database. Please check your credentials or internet connection.'}`);
                  }
                }}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                  background: dbConnected ? 'rgba(48, 209, 88, 0.12)' : 'rgba(255, 69, 58, 0.15)',
                  border: dbConnected ? '1px solid rgba(48, 209, 88, 0.3)' : '1px solid rgba(255, 69, 58, 0.35)',
                  color: dbConnected ? '#30d158' : '#ff453a',
                  cursor: dbConnected ? 'default' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
                title={dbConnected ? 'Direct PostgreSQL Connection Active (Supabase Cloud)' : `Database Disconnected: Click to view details (${dbError || 'Network/Auth Error'})`}
              >
                <span 
                  style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: dbConnected ? '#30d158' : '#ff453a',
                    boxShadow: dbConnected ? '0 0 6px #30d158' : '0 0 6px #ff453a',
                    animation: dbConnected ? 'pulse 2s infinite' : 'none'
                  }} 
                />
                {dbConnected ? 'LIVE DB' : 'OFFLINE'}
              </button>
            </div>
            {!dbConnected && dbError && (
              <div style={{
                marginTop: '6px',
                padding: '5px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 69, 58, 0.1)',
                border: '1px solid rgba(255, 69, 58, 0.25)',
                color: '#ff453a',
                fontSize: '10px',
                lineHeight: '1.3',
                wordBreak: 'break-word'
              }}>
                <strong>DB Error:</strong> {dbError.length > 80 ? dbError.substring(0, 80) + '...' : dbError}
              </div>
            )}
          </div>
        </div>
        <nav className="sidebar-nav">
          <Link href="/" className="nav-link" style={{ opacity: 0.6, fontSize: 13, marginBottom: 8 }}>
            <Home size={16} />
            <span className="nav-label">← All Portals</span>
          </Link>
          {navItems.map(({ href, label, icon: Icon, underConstruction }) => {
            if (underConstruction) {
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setConstructionFeature(label)}
                  className="nav-link"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    opacity: 0.7,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <Icon size={20} />
                  <span className="nav-label" style={{ flex: 1 }}>{label}</span>
                  <span style={{
                    fontSize: '9px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(255, 149, 0, 0.15)',
                    color: '#ff9500',
                    border: '1px solid rgba(255, 149, 0, 0.3)',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>Soon</span>
                </button>
              );
            }
            const isDriverInboxLink = isDriverPortal && label === 'Inbox' && driverUnreadCount > 0;
            const isPatientInboxLink = isPatientPortal && label === 'Inbox' && patientUnreadCount > 0;
            const hasUnreadInbox = isDriverInboxLink || isPatientInboxLink;
            const unreadCount = isDriverInboxLink ? driverUnreadCount : patientUnreadCount;
            const isLockedForVerification = 
              (portalName === 'Dispatcher Portal' && (currentUser?.verification_status === 'Pending' || currentUser?.verification_status === 'Rejected') && href !== '/dashboard' && href !== '/dispatcher-profile') ||
              (isDriverPortal && (activeDriver?.verification_status === 'Pending' || activeDriver?.verification_status === 'Rejected') && href !== '/duty' && href !== '/settings' && href !== '/inbox');

            if (isLockedForVerification) {
              return (
                <div
                  key={href}
                  className="nav-link"
                  style={{
                    opacity: 0.45,
                    cursor: 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                  title={isDriverPortal ? "Locked: Driver credentials awaiting Admin verification" : "Locked: Dispatcher credentials awaiting Admin verification"}
                >
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} />
                  </div>
                  <span className="nav-label" style={{ flex: 1 }}>{label}</span>
                  <span style={{ fontSize: '11px' }}>🔒</span>
                </div>
              );
            }

            return (
              <Link key={href} href={href} className={`nav-link ${pathname === href ? 'active' : ''}`}>
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} />
                  {hasUnreadInbox && (
                    <span 
                      className="notification-red-dot-glow" 
                      title={`${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`}
                    />
                  )}
                </div>
                <span className="nav-label">{label}</span>
                {hasUnreadInbox && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '10px',
                    fontWeight: 800,
                    background: 'rgba(255, 59, 48, 0.2)',
                    color: '#ff453a',
                    border: '1px solid rgba(255, 59, 48, 0.4)',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    lineHeight: '1.4'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer" style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }} ref={menuRef}>

          {/* Slide-up user menu */}
          {hasMenu && (
            <div className={`user-menu-panel ${menuOpen ? 'open' : ''}`}>
              <div className="user-menu-header">
                {isPatientPortal ? `${users.length} Registered Patients` : `${users.length} Registered Drivers`}
              </div>
              {users.map((u) => {
                const isActive = String(activeUser?.id) === String(u.id);
                const initials = u.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
                return (
                  <div
                    key={u.id}
                    className={`user-menu-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectUser(u.id, userType)}
                  >
                    <div className="user-menu-avatar" style={{
                      background: isActive ? `${portalColor}22` : 'rgba(255,255,255,0.05)',
                      color: isActive ? portalColor : 'var(--text-muted)',
                      border: isActive ? `1.5px solid ${portalColor}44` : '1.5px solid transparent',
                    }}>
                      {initials}
                    </div>
                    <div className="user-menu-info">
                      <div className="user-menu-name" style={{ color: isActive ? '#fff' : 'var(--text-secondary)' }}>
                        {u.name}
                      </div>
                      <div className="user-menu-meta">
                        {isPatientPortal && u.blood_type
                          ? <><Droplet size={8} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} />{u.blood_type}</>
                          : isDriverPortal && u.status
                            ? <><Truck size={8} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} />{u.status === 'On_Duty' ? 'On Duty' : 'Off Duty'}</>
                            : `ID: ${u.id}`
                        }
                      </div>
                    </div>
                    <div className="user-menu-check" style={{
                      background: isActive ? `${portalColor}22` : 'transparent',
                    }}>
                      {isActive && <Check size={14} style={{ color: portalColor }} />}
                    </div>
                  </div>
                );
              })}
              <div
                className="user-menu-register"
                style={{ color: portalColor }}
                onClick={() => { setCreateType(userType); setShowCreateModal(true); setMenuOpen(false); }}
              >
                <UserPlus size={16} />
                {isPatientPortal ? 'Register New Patient' : 'Register New Driver'}
              </div>
            </div>
          )}

          {/* User card trigger */}
          {hasMenu ? (
            <div
              className="user-card-trigger"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${portalColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} style={{ color: portalColor }} />
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getDisplayName()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {getDisplayRole()}
                </div>
              </div>
              <ChevronUp size={14} style={{
                color: 'var(--text-muted)', flexShrink: 0,
                transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }} />
            </div>
          ) : (isPatientPortal && availablePatients.length === 0) ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${portalColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} style={{ color: portalColor }} />
              </div>
              <button
                onClick={() => { setCreateType('patient'); setShowCreateModal(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: portalColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <UserPlus size={14} /> Register as Patient
              </button>
            </div>
          ) : (isDriverPortal && availableDrivers.length === 0) ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${portalColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} style={{ color: portalColor }} />
              </div>
              <button
                onClick={() => { setCreateType('driver'); setShowCreateModal(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: portalColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <UserPlus size={14} /> Register as Driver
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${portalColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} style={{ color: portalColor }} />
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {getDisplayName()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {getDisplayRole()}
                </div>
              </div>
            </div>
          )}



          { isPatientPortal && activePatient && (
            <button 
              onClick={patientLogout} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 8, 
                padding: '8px 10px', 
                background: 'rgba(239, 68, 68, 0.08)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                borderRadius: 8, 
                color: '#ef4444', 
                fontSize: 12, 
                fontWeight: 600, 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <LogOut size={13} /> Sign Out ({activePatient.name?.split(' ')[0]})
            </button>
          )}

          { isDriverPortal && activeDriver && (
            <button 
              onClick={driverLogout} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 8, 
                padding: '8px 10px', 
                background: 'rgba(239, 68, 68, 0.08)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                borderRadius: 8, 
                color: '#ef4444', 
                fontSize: 12, 
                fontWeight: 600, 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <LogOut size={13} /> Sign Out Driver ({activeDriver.name?.split(' ')[0]})
            </button>
          )}

          { (portalName === 'Admin Portal' || portalName === 'Dispatcher Portal') && (
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 'auto' }}>
              <LogOut size={14} /> Logout
            </button>
          )}
        </div>
      </aside>

      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {navItems.slice(0, 5).map(({ href, label, icon: Icon }, idx) => {
            const isMobileLocked = 
              (portalName === 'Dispatcher Portal' && currentUser?.verification_status === 'Pending' && href !== '/dashboard' && href !== '/dispatcher-profile') ||
              (isDriverPortal && activeDriver?.verification_status === 'Pending' && href !== '/duty' && href !== '/settings' && href !== '/inbox');

            if (isMobileLocked) {
              return (
                <div key={`${href}-${label}-${idx}`} className="mobile-nav-link" style={{ opacity: 0.35, cursor: 'not-allowed' }}>
                  <Icon />
                  <span>🔒 {label}</span>
                </div>
              );
            }

            return (
              <Link key={`${href}-${label}-${idx}`} href={href} className={`mobile-nav-link ${pathname === href ? 'active' : ''}`}>
                <Icon />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {showCreateModal && (
        <CreateUserModal
          type={createType}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleUserCreated}
        />
      )}

      <UnderConstructionModal
        isOpen={Boolean(constructionFeature)}
        onClose={() => setConstructionFeature(null)}
        featureName={constructionFeature}
      />
    </>
  );
}
