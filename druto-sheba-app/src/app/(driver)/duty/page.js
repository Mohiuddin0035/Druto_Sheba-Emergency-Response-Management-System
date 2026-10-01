'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Navigation, PhoneCall, Truck, AlertTriangle, Building2, CheckCircle, Clock, MessageCircle, Send, Radio, MapPin, Gauge, PackageCheck, Save, Banknote, Plus, Trash2, Calendar, Lock, ShieldAlert, Bell, X } from 'lucide-react';
import MapView from '@/components/MapView';
import { SeverityBadge } from '@/components/Badges';
import { useUser } from '@/lib/UserContext';
import { useBroadcast } from '@/lib/BroadcastContext';

export default function DriverDutyPage() {
  const router = useRouter();
  const { activeDriver } = useUser();
  const { isBroadcasting, gpsError, speed, accuracy, uptime, realtimeMarker, startBroadcasting, stopBroadcasting } = useBroadcast();
  const [trip, setTrip] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [broadcastRequests, setBroadcastRequests] = useState([]);
  const [advisory, setAdvisory] = useState(null);
  const [shiftSummary, setShiftSummary] = useState(null);
  const [equipmentLog, setEquipmentLog] = useState({ oxygen: 75, defibrillator: 'Ready', supplies: 'Stocked' });
  const [equipmentSaving, setEquipmentSaving] = useState(false);
  const initialEquipmentPopulated = useRef(false);

  const [panicLoading, setPanicLoading] = useState(false);
  const panicTimer = useRef(null);

  // Verification & Qualification States (Post-Login Profile Verification)
  const [verificationData, setVerificationData] = useState(null);
  const [vNid, setVNid] = useState('');
  const [vLicenseNo, setVLicenseNo] = useState('');
  const [certificates, setCertificates] = useState([
    { certificate_name: '', serial_number: '', batch_number: '', issuing_authority: '', issue_date: '', valid_until: '' }
  ]);
  const [hasOwnAmbulance, setHasOwnAmbulance] = useState(false);
  const [ambulancePlate, setAmbulancePlate] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [verificationSuccessMsg, setVerificationSuccessMsg] = useState('');

  const handleAddCertificate = () => {
    setCertificates(prev => [
      ...prev,
      { certificate_name: '', serial_number: '', batch_number: '', issuing_authority: '', issue_date: '', valid_until: '' }
    ]);
  };

  const handleRemoveCertificate = (idx) => {
    if (certificates.length <= 1) {
      setCertificates([{ certificate_name: '', serial_number: '', batch_number: '', issuing_authority: '', issue_date: '', valid_until: '' }]);
      return;
    }
    setCertificates(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCertChange = (idx, field, value) => {
    setCertificates(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const initialFormPopulated = useRef(false);

  const fetchVerification = useCallback(async () => {
    if (!activeDriver?.id) return;
    try {
      const res = await fetch(`/api/driver/verification?driver_id=${activeDriver.id}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setVerificationData(data);
        // Only prepopulate empty fields on initial load without overwriting what user is actively typing
        if (!initialFormPopulated.current) {
          if (data.driver?.nid_number) {
            setVNid(data.driver.nid_number);
          }
          if (data.driver?.license_no && !data.driver.license_no.startsWith('PENDING-')) {
            setVLicenseNo(data.driver.license_no);
          }
          if (data.driver?.own_ambulance_plate) {
            setHasOwnAmbulance(true);
            setAmbulancePlate(data.driver.own_ambulance_plate);
          }
          initialFormPopulated.current = true;
        }
      }
    } catch (e) {
      console.warn('Verification status check warning:', e);
    }
  }, [activeDriver]);

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    if (hasOwnAmbulance && !ambulancePlate.trim()) {
      alert('Please enter your Ambulance License Plate Number.');
      return;
    }

    setSubmittingVerification(true);
    setVerificationSuccessMsg('');
    try {
      // Filter out completely blank certificates
      const validCerts = certificates.filter(c => 
        c.certificate_name?.trim() || c.serial_number?.trim() || c.issuing_authority?.trim() || c.issue_date || c.valid_until
      );

      const res = await fetch('/api/driver/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: activeDriver.id,
          nid_number: vNid.trim() || null,
          license_no: vLicenseNo.trim() || null,
          certificates: validCerts.length > 0 ? validCerts : undefined,
          has_own_ambulance: hasOwnAmbulance,
          ambulance_license_plate: hasOwnAmbulance ? ambulancePlate.trim() : null
        })
      });
      const resData = await res.json();
      if (!res.ok) {
        alert(resData.error || 'Failed to submit verification details.');
      } else {
        setVerificationSuccessMsg('Verification details & certificates submitted successfully! Your application is awaiting Admin verification.');
        setCertificates([{ certificate_name: '', serial_number: '', batch_number: '', issuing_authority: '', issue_date: '', valid_until: '' }]);
        await fetchVerification();
      }
    } catch (err) {
      console.error(err);
      alert('Network error while submitting verification.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  const fetchTrip = useCallback(async () => {
    if (!activeDriver?.id) return;
    fetchVerification();
    try {
      const latParam = realtimeMarker?.lat ? `&lat=${realtimeMarker.lat}&lng=${realtimeMarker.lng}` : '';
      const [res, shiftRes] = await Promise.all([
        fetch(`/api/driver/duty?driver_id=${activeDriver.id}${latParam}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/driver/shift-log?driver_id=${activeDriver.id}&t=${Date.now()}`, { cache: 'no-store' })
      ]);
      const data = await res.json();
      const shiftData = await shiftRes.json();
      setTrip(data.active_trip);
      setAdvisory(data.advisory?.is_active ? data.advisory : null);
      if (data.active_trip && !isBroadcasting) {
        startBroadcasting();
      }
      // ONLY accept broadcast missions if live broadcast is ON and GPS coordinates are active
      const hasLiveGps = isBroadcasting && !!realtimeMarker?.lat;
      setBroadcastRequests(hasLiveGps ? (data.broadcast_requests || []) : []);
      setChatMessages(data.chat_messages || []);
      if (!shiftData.error) setShiftSummary(shiftData);
      
      const vehicleId = data.active_trip?.vehicle_id || 1;
      const invRes = await fetch(`/api/ambulances/inventory?vehicle_id=${vehicleId}&t=${Date.now()}`, { cache: 'no-store' });
      if (invRes.ok) {
        const invData = await invRes.json();
        if (invData && invData.length > 0 && !initialEquipmentPopulated.current) {
          const oxy = invData.find(i => i.item_name === 'Oxygen Level (%)');
          const defib = invData.find(i => i.item_name === 'Defibrillator');
          const supp = invData.find(i => i.item_name === 'Basic Supplies');
          
          setEquipmentLog(prev => ({
            oxygen: oxy ? oxy.quantity : prev.oxygen,
            defibrillator: defib ? (defib.quantity > 0 ? 'Ready' : 'Needs Service') : prev.defibrillator,
            supplies: supp ? (supp.quantity > 0 ? 'Stocked' : 'Low') : prev.supplies
          }));
          initialEquipmentPopulated.current = true;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeDriver, isBroadcasting, realtimeMarker]);

  useAutoRefresh(fetchTrip);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !trip || isSending) return;
    
    setIsSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: trip.trip_id, text: newMessage, sender: `Driver (${activeDriver.name})` })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert('Failed to send message: ' + (errData.error || res.statusText));
      } else {
        setNewMessage('');
        fetchTrip();
      }
    } catch (err) {
      console.error(err);
      alert('Network error while sending message.');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!activeDriver?.id) {
        setLoading(false);
        return;
      }
      await fetchTrip();
    };
    init();
  }, [activeDriver, fetchTrip]);

  const handleAction = async (action, reqId = null) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/driver/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          request_id: reqId || trip.request_id, 
          action,
          driver_id: activeDriver.id 
        }),
      });
      const result = await res.json();
      if (result.success) {
        if (action === 'Complete') {
          stopBroadcasting();
          setTrip(null);
        } else if (action === 'Accept') {
          startBroadcasting();
          fetchTrip();
        } else {
          fetchTrip();
        }
      } else {
        alert('Action failed: ' + result.error);
      }
    } catch (err) {
      alert('Network error.');
    } finally {
      setActionLoading(false);
    }
  };

  const updateDriverStatus = async (shift_status) => {
    setActionLoading(true);
    try {
      await fetch('/api/drivers', { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ driver_id: activeDriver.id, shift_status }) 
      });
      window.location.reload();
    } catch (e) {
      alert('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const saveEquipmentLog = async () => {
    const vehicleId = trip?.vehicle_id || 1;
    setEquipmentSaving(true);
    try {
      const items = [
        { item_name: 'Oxygen Level (%)', quantity: Number(equipmentLog.oxygen) || 0 },
        { item_name: 'Defibrillator', quantity: equipmentLog.defibrillator === 'Ready' ? 1 : 0 },
        { item_name: 'Basic Supplies', quantity: equipmentLog.supplies === 'Stocked' ? 1 : 0 },
      ];
      await Promise.all(items.map((item) => fetch('/api/ambulances/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: vehicleId, ...item }),
      })));
      setTimeout(() => alert('Equipment checklist saved.'), 100);
    } catch {
      setTimeout(() => alert('Failed to save equipment checklist.'), 100);
    } finally {
      setEquipmentSaving(false);
    }
  };

  const handlePanicPress = async () => {
    const isCurrentlySos = activeDriver?.status === 'EMERGENCY_SOS';

    if (isCurrentlySos) {
      if (!window.confirm("Cancel and turn off SOS Emergency Protocol? This will clear the emergency alert and set your status back to Available.")) {
        return;
      }

      setPanicLoading(true);
      try {
        await fetch('/api/driver/panic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driver_id: activeDriver.id, action: 'off' })
        });
        window.location.reload();
      } catch (err) {
        alert('Failed to turn off panic signal.');
      } finally {
        setPanicLoading(false);
      }
      return;
    }
    
    if (!window.confirm("URGENT: Trigger SOS Emergency Protocol? This will instantly alert all dispatchers.")) {
      return;
    }
    
    setPanicLoading(true);
    try {
      await fetch('/api/driver/panic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: activeDriver.id, location: 'Current GPS Location' })
      });
      window.location.reload();
    } catch (err) {
      alert('Panic signal failed to send.');
    } finally {
      setPanicLoading(false);
    }
  };

  if (!activeDriver || loading) {
    return (
      <div className="page-container" style={{ minHeight: 'calc(100vh - 100px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: '36px 48px',
          background: 'var(--bg-card)',
          borderRadius: 24,
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
          textAlign: 'center'
        }}>
          <div style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '3px solid rgba(245, 158, 11, 0.15)',
              borderTopColor: '#f59e0b',
              animation: 'spin 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite'
            }} />
            <Truck size={22} style={{ color: '#f59e0b', opacity: 0.95 }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              Connecting to Driver Duty Station...
            </div>
            <div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 500 }}>
              Synchronizing vehicle telemetry, shift roster & dispatch queues
            </div>
          </div>
        </div>
      </div>
    );
  }


  const isPending = verificationData?.isPending || activeDriver?.verification_status === 'Pending' || activeDriver?.verification_status === 'Rejected';

  return (
    <div className="page-container dot-pattern" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px', position: 'relative' }}>
      
      {/* Background Blobs */}
      <div className="bg-blob">
        <div className="blob blob-1"></div>
        <div className="blob blob-2" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="page-header" style={{ marginBottom: 16, flexShrink: 0, position: 'relative', zIndex: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800 }}>
              Active Duty
            </h2>
            {isPending && (
              <span style={{
                fontSize: 11,
                fontWeight: 900,
                padding: '4px 10px',
                borderRadius: 8,
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}>
                <Lock size={12} /> ACCOUNT LOCKED (AWAITING VERIFICATION)
              </span>
            )}
          </div>
          <p className="page-header-sub">
            {isPending ? 'Verification Required Before Going Live on Duty' : 'Emergency Real-Time Dispatch'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* COMPACT MANUAL BROADCAST TOGGLE (Allows updating current location to DB anytime) */}
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (isPending) return;
              if (isBroadcasting) {
                stopBroadcasting();
              } else {
                startBroadcasting();
              }
            }}
            className="btn"
            style={{
              padding: '6px 14px',
              height: 38,
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: isPending 
                ? 'rgba(255, 255, 255, 0.03)' 
                : (isBroadcasting ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 255, 255, 0.06)'),
              border: isPending 
                ? '1px solid rgba(255, 255, 255, 0.1)' 
                : (isBroadcasting ? '1.5px solid var(--green)' : '1px solid var(--border-accent)'),
              color: isPending ? 'rgba(255, 255, 255, 0.3)' : (isBroadcasting ? 'var(--green)' : 'var(--text-muted)'),
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.45 : 1,
              transition: 'all 0.2s ease',
              fontSize: 12,
              fontWeight: 800
            }}
            title={isPending ? "Locked: Account must be verified by Admin first" : (isBroadcasting ? "Click to Stop Live Location Broadcast" : "Click to Start Live Location Broadcast (Update GPS to DB)")}
          >
            <div style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: isPending ? '#64748b' : (isBroadcasting ? 'var(--green)' : 'var(--text-muted)'),
              boxShadow: (!isPending && isBroadcasting) ? '0 0 8px var(--green)' : 'none',
              animation: (!isPending && isBroadcasting) ? 'pulse 1.2s infinite' : 'none'
            }} />
            <span>{isPending ? 'BROADCAST LOCKED' : (isBroadcasting ? 'STOP BROADCAST' : 'START BROADCAST')}</span>
          </button>
          <select
            className="form-input form-select"
            value={activeDriver?.status || 'Offline'}
            onChange={e => updateDriverStatus(e.target.value)}
            disabled={isPending || actionLoading}
            style={{ 
              width: 150, 
              height: 38, 
              borderRadius: 20, 
              fontSize: 12, 
              fontWeight: 800,
              opacity: isPending ? 0.45 : 1,
              cursor: isPending ? 'not-allowed' : 'pointer',
              background: isPending ? 'rgba(255, 255, 255, 0.05)' : undefined
            }}
            title={isPending ? "Locked until Admin verifies account" : ""}
          >
            <option value="Available">Available</option>
            <option value="Dispatched">Dispatched</option>
            <option value="On_Trip">On-Trip</option>
            <option value="Offline">Offline</option>
            <option value="On_Duty">On Duty</option>
            <option value="Off_Duty">Off Duty</option>
            {activeDriver?.status === 'EMERGENCY_SOS' && <option value="EMERGENCY_SOS">EMERGENCY SOS</option>}
          </select>
          
          <button
            onClick={handlePanicPress}
            disabled={isPending || panicLoading}
            style={{
               background: isPending 
                ? 'rgba(255, 255, 255, 0.03)' 
                : (activeDriver?.status === 'EMERGENCY_SOS' ? 'var(--red)' : 'rgba(255,45,85,0.1)'),
               border: isPending ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid var(--red)`,
               color: isPending ? 'rgba(255, 255, 255, 0.3)' : (activeDriver?.status === 'EMERGENCY_SOS' ? '#fff' : 'var(--red)'),
               padding: '8px 16px',
               borderRadius: 20,
               fontSize: 12,
               fontWeight: 800,
               display: 'flex',
               alignItems: 'center',
               gap: 6,
               cursor: isPending ? 'not-allowed' : 'pointer',
               opacity: isPending ? 0.45 : 1,
               boxShadow: (!isPending && activeDriver?.status === 'EMERGENCY_SOS') ? '0 0 30px var(--red)' : 'none',
               transition: 'all 0.2s',
               animation: (!isPending && activeDriver?.status === 'EMERGENCY_SOS') ? 'pulse 1s infinite' : 'none'
            }}
            title={isPending ? "Locked until Admin verifies account" : (activeDriver?.status === 'EMERGENCY_SOS' ? "Click to deactivate SOS Panic" : "Click to trigger SOS Emergency Protocol")}
          >
             <AlertTriangle size={14} />
             {panicLoading ? '...' : (activeDriver?.status === 'EMERGENCY_SOS' ? 'SOS ACTIVE (CLICK TO OFF)' : 'SOS PANIC')}
          </button>
        </div>
      </div>

      <div className="track-layout">
        
        {/* Left Panel: Details & Actions */}
        <div className="track-sidebar">
          {/* Driver Verification Status Banner & Qualifications Form */}
          {/* Driver Verification Status Banner & Qualifications Form */}
          {(isPending || verificationData?.driver?.verification_status === 'Pending' || activeDriver?.verification_status === 'Pending') && (
            <div style={{ 
              padding: 22, 
              borderRadius: 18, 
              border: '1.5px solid rgba(245, 158, 11, 0.6)',
              background: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: 'var(--shadow-card)',
              position: 'relative',
              zIndex: 5
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22
                }}>
                  ⏳
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#f59e0b', letterSpacing: '-0.2px' }}>
                    Profile Awaiting Admin Verification
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 2 }}>
                    🔒 All dispatch operations are locked until Admin verifies your credentials.
                  </div>
                </div>
              </div>

              {verificationSuccessMsg && (
                <div style={{ 
                  padding: '10px 14px', 
                  background: 'rgba(34, 197, 94, 0.15)', 
                  border: '1px solid #22c55e', 
                  borderRadius: 10, 
                  color: 'var(--green)', 
                  fontSize: 12.5, 
                  fontWeight: 700,
                  lineHeight: 1.4
                }}>
                  ✓ {verificationSuccessMsg}
                </div>
              )}

              {/* Previously Submitted Qualifications List */}
              {(() => {
                const validSubmissions = (verificationData?.submissions || []).filter(sub => 
                  sub.submission_type !== 'REGISTRATION' || sub.requested_license_no || sub.requested_nid || sub.certificate_name?.toLowerCase().indexOf('awaiting') === -1
                );
                if (validSubmissions.length === 0) return null;
                return (
                  <div style={{ 
                    background: 'var(--bg-input)', 
                    borderRadius: 12, 
                    padding: 14, 
                    border: '1px solid var(--border-subtle)' 
                  }}>
                    <div style={{ 
                      fontSize: 11, 
                      fontWeight: 800, 
                      textTransform: 'uppercase', 
                      color: 'var(--text-muted)', 
                      marginBottom: 10, 
                      letterSpacing: 0.8 
                    }}>
                      Submitted Records ({validSubmissions.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {validSubmissions.map((sub) => {
                      const displayNid = sub.requested_nid || verificationData?.driver?.nid_number;
                      const displayLic = sub.requested_license_no || (verificationData?.driver?.license_no?.startsWith('PENDING-') ? null : verificationData?.driver?.license_no);
                      return (
                        <div key={sub.submission_id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start', 
                          fontSize: 12.5,
                          padding: '10px 12px',
                          background: 'var(--bg-card-hover)',
                          borderRadius: 10,
                          border: '1px solid var(--border-subtle)'
                        }}>
                          <div style={{ flex: 1, paddingRight: 8 }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 13 }}>
                              {sub.certificate_name || 'Driver Verification & Credential Submission'}
                            </div>

                            {/* Identity summary: NID & License Number */}
                            {(displayNid || displayLic) && (
                              <div style={{ 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: 8, 
                                marginTop: 4,
                                fontSize: 11.5,
                                fontWeight: 700
                              }}>
                                {displayNid && (
                                  <span style={{ 
                                    padding: '2px 7px', 
                                    borderRadius: 6, 
                                    background: 'rgba(56, 189, 248, 0.12)', 
                                    color: 'var(--blue)',
                                    border: '1px solid rgba(56, 189, 248, 0.25)'
                                  }}>
                                    NID: {displayNid}
                                  </span>
                                )}
                                {displayLic && (
                                  <span style={{ 
                                    padding: '2px 7px', 
                                    borderRadius: 6, 
                                    background: 'rgba(245, 158, 11, 0.12)', 
                                    color: 'var(--yellow)',
                                    border: '1px solid rgba(245, 158, 11, 0.25)'
                                  }}>
                                    License: {displayLic}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Certificate metadata: Serial, Batch, Authority, Dates */}
                            {(sub.serial_number || sub.batch_number || sub.issuing_authority || sub.issue_date || sub.valid_until) && (
                              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                                {sub.serial_number && <span>SN: <strong>{sub.serial_number}</strong> </span>}
                                {sub.batch_number && <span>• Batch: <strong>{sub.batch_number}</strong> </span>}
                                {sub.issuing_authority && <span>• {sub.issuing_authority} </span>}
                                {sub.issue_date && <span>• Issued: {new Date(sub.issue_date).toLocaleDateString('en-GB')} </span>}
                                {sub.valid_until && <span>• Valid: {new Date(sub.valid_until).toLocaleDateString('en-GB')} </span>}
                              </div>
                            )}

                            {sub.has_own_ambulance && (
                              <div style={{ fontSize: 11.5, color: 'var(--blue)', marginTop: 4, fontWeight: 700 }}>
                                🚑 Own Vehicle: {sub.ambulance_license_plate || 'Submitted'}
                              </div>
                            )}
                          </div>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 900,
                            padding: '3px 10px',
                            borderRadius: 8,
                            background: sub.status === 'Approved' ? 'rgba(34,197,94,0.18)' : sub.status === 'Rejected' ? 'rgba(239,68,68,0.18)' : 'rgba(245,158,11,0.18)',
                            color: sub.status === 'Approved' ? 'var(--green)' : sub.status === 'Rejected' ? 'var(--red)' : '#f59e0b',
                            border: `1px solid ${sub.status === 'Approved' ? '#22c55e' : sub.status === 'Rejected' ? '#ef4444' : '#f59e0b'}`,
                            flexShrink: 0
                          }}>
                            {sub.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

              {/* Submit Verification Form (NID, License, Certificates, Own Ambulance) */}
              <form onSubmit={handleVerificationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ 
                  fontSize: 14, 
                  fontWeight: 900, 
                  color: 'var(--text-primary)', 
                  borderBottom: '1px solid var(--border-subtle)', 
                  paddingBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span>📝</span> Official Identity & Verification Form
                </div>

                {/* NID & Driving License Numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-primary)', display: 'block', marginBottom: 5, fontWeight: 700 }}>
                      National ID (NID) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 19948271629"
                      value={vNid}
                      onChange={(e) => setVNid(e.target.value.replace(/\D/g, '').slice(0, 17))}
                      style={{ 
                        width: '100%',
                        fontSize: 13, 
                        padding: '10px 12px',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        border: '1.5px solid var(--border-accent)',
                        borderRadius: 10,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#f59e0b', display: 'block', marginBottom: 5, fontWeight: 800 }}>
                      Driving License No *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. LIC92812"
                      value={vLicenseNo}
                      onChange={(e) => setVLicenseNo(e.target.value.toUpperCase())}
                      style={{ 
                        width: '100%',
                        fontSize: 13, 
                        padding: '10px 12px', 
                        fontWeight: 800,
                        background: 'var(--bg-input)',
                        color: '#f59e0b',
                        border: '1.5px solid rgba(245, 158, 11, 0.6)',
                        borderRadius: 10,
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Dynamic Professional Certificates Section */}
                <div style={{ 
                  background: 'var(--bg-input)', 
                  border: '1.5px solid var(--border-subtle)', 
                  borderRadius: 14, 
                  padding: 14, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 12 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--blue)' }}>
                      🎓 Professional Certificates ({certificates.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddCertificate}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1.5px solid rgba(56, 189, 248, 0.4)',
                        color: 'var(--blue)',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <Plus size={14} /> Add Another Certificate
                    </button>
                  </div>

                  {certificates.map((cert, idx) => (
                    <div key={idx} style={{ 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border-subtle)', 
                      borderRadius: 12, 
                      padding: 12, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 10 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>
                          Certificate #{idx + 1}
                        </span>
                        {certificates.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCertificate(idx)}
                            style={{
                              background: 'rgba(239,68,68,0.15)',
                              border: '1px solid rgba(239,68,68,0.3)',
                              borderRadius: 6,
                              color: 'var(--red)',
                              cursor: 'pointer',
                              padding: '3px 6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700
                            }}
                            title="Remove this certificate"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                          Certificate Name / Qualification
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Basic Life Support (BLS) / First Aid / EMT"
                          value={cert.certificate_name}
                          onChange={(e) => handleCertChange(idx, 'certificate_name', e.target.value)}
                          style={{ 
                            width: '100%',
                            fontSize: 12.5, 
                            padding: '8px 12px',
                            background: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 8,
                            outline: 'none'
                          }}
                        />
                      </div>

                      {/* Serial Number & Batch Number */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Serial Number</label>
                          <input
                            type="text"
                            placeholder="e.g. BLS-2024-882"
                            value={cert.serial_number}
                            onChange={(e) => handleCertChange(idx, 'serial_number', e.target.value)}
                            style={{ 
                              width: '100%',
                              fontSize: 12, 
                              padding: '8px 10px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 8,
                              outline: 'none'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Batch Number</label>
                          <input
                            type="text"
                            placeholder="e.g. BATCH-24B / 12345"
                            value={cert.batch_number}
                            onChange={(e) => handleCertChange(idx, 'batch_number', e.target.value)}
                            style={{ 
                              width: '100%',
                              fontSize: 12, 
                              padding: '8px 10px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 8,
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>

                      {/* Issuing Authority */}
                      <div>
                        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Issuing Authority (অনুমোদনকারী প্রতিষ্ঠান)</label>
                        <input
                          type="text"
                          placeholder="e.g. Red Crescent / DGHS / BRTA"
                          value={cert.issuing_authority}
                          onChange={(e) => handleCertChange(idx, 'issuing_authority', e.target.value)}
                          style={{ 
                            width: '100%',
                            fontSize: 12, 
                            padding: '8px 10px',
                            background: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 8,
                            outline: 'none'
                          }}
                        />
                      </div>

                      {/* Issue Date and Valid Until (Expiration) */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, fontWeight: 600 }}>
                            <Calendar size={13} color="var(--blue)" /> Issue Date (ইস্যুর তারিখ)
                          </label>
                          <input
                            type="date"
                            value={cert.issue_date}
                            onChange={(e) => handleCertChange(idx, 'issue_date', e.target.value)}
                            style={{ 
                              width: '100%',
                              fontSize: 12, 
                              padding: '7px 10px', 
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 8,
                              outline: 'none'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, fontWeight: 600 }}>
                            <Calendar size={13} color="var(--yellow)" /> Valid Until (মেয়াদ)
                          </label>
                          <input
                            type="date"
                            value={cert.valid_until}
                            onChange={(e) => handleCertChange(idx, 'valid_until', e.target.value)}
                            style={{ 
                              width: '100%',
                              fontSize: 12, 
                              padding: '7px 10px', 
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 8,
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Own Ambulance Checkbox & License Plate input */}
                <div style={{ 
                  padding: '12px 14px', 
                  borderRadius: 12, 
                  background: 'var(--bg-input)', 
                  border: '1.5px solid var(--border-subtle)' 
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: 800, color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={hasOwnAmbulance}
                      onChange={(e) => setHasOwnAmbulance(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#f59e0b', cursor: 'pointer' }}
                    />
                    I have my own ambulance (আমার নিজের এম্বুলেন্স আছে)
                  </label>

                  {hasOwnAmbulance && (
                    <div style={{ marginTop: 12 }}>
                      <label style={{ fontSize: 12, color: 'var(--text-primary)', display: 'block', marginBottom: 5, fontWeight: 700 }}>
                        Ambulance License Plate Number *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. DHAKA-METRO-CHA-71-2244"
                        value={ambulancePlate}
                        onChange={(e) => setAmbulancePlate(e.target.value.toUpperCase())}
                        required={hasOwnAmbulance}
                        style={{ 
                          width: '100%',
                          fontSize: 13, 
                          padding: '10px 12px', 
                          fontWeight: 800,
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          border: '1.5px solid var(--blue)',
                          borderRadius: 10,
                          outline: 'none'
                        }}
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submittingVerification}
                  style={{ 
                    marginTop: 6, 
                    fontSize: 14, 
                    padding: '13px 16px', 
                    fontWeight: 900, 
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 12,
                    cursor: submittingVerification ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 18px rgba(245, 158, 11, 0.4)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  {submittingVerification ? 'Submitting for Admin Verification...' : 'Submit All Verification Details to Admin'}
                </button>

                {/* Verification Payment Button (Dummy) */}
                <div style={{
                  marginTop: 12,
                  padding: '12px',
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  alignItems: 'center',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>
                    ⚠️ Verification charge must be paid, otherwise application will be cancelled after 7 days.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const dId = activeDriver?.id || '';
                      const dPhone = activeDriver?.phone || '';
                      router.push(`/payment?purpose=Driver_Verification&id=${encodeURIComponent(dId)}&phone=${encodeURIComponent(dPhone)}&amount=500&returnUrl=/duty`);
                    }}
                    style={{
                      padding: '10px 24px',
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: 13,
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    💳 Pay 500 BDT
                  </button>
                </div>
              </form>
            </div>
          )}

          {!trip ? (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 20, 
              width: '100%',
              position: 'relative',
              filter: isPending ? 'grayscale(1) opacity(0.4)' : 'none',
              pointerEvents: isPending ? 'none' : 'auto',
              userSelect: isPending ? 'none' : 'auto',
              transition: 'all 0.3s ease'
            }}>
              {/* Overlay banner showing Locked reason if pending */}
              {isPending && (
                <div style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 20,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(15, 23, 42, 0.92)',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  color: '#fbbf24',
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)'
                }}>
                  <Lock size={15} /> 
                  <span>Features Locked: Live dispatch & mission claiming will activate upon Admin verification.</span>
                </div>
              )}
              
              {/* Broadcasts Section (MOVED TO TOP) */}
              {isBroadcasting && realtimeMarker && broadcastRequests.length > 0 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--orange)' }}>
                    <div className="live-dot" style={{ background: 'var(--orange)' }} />
                    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>INCOMING MISSION BROADCASTS ({broadcastRequests.length})</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: '400px', paddingRight: 4 }}>
                    {broadcastRequests.map((req) => (
                      <div key={req.request_id} className="glass" style={{ padding: 16, borderLeft: '4px solid var(--orange)', transition: 'background-color 0.2s', borderRadius: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800 }}>REQUEST ID</div>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>#{req.request_id}</div>
                          </div>
                          <SeverityBadge level={req.severity_level} />
                        </div>
                        
                        {req.distance_m !== undefined && (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: 'rgba(52, 199, 89, 0.15)',
                              color: 'var(--green)',
                              border: '1px solid rgba(52, 199, 89, 0.3)'
                            }}>
                              📍 {req.distance_m < 1000 ? `${req.distance_m}m away` : `${(req.distance_m / 1000).toFixed(1)}km away`}
                            </span>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: 6,
                              background: 'rgba(255, 159, 10, 0.1)',
                              color: 'var(--orange)',
                              border: '1px solid rgba(255, 159, 10, 0.2)'
                            }}>
                              Radius: {req.current_radius_m < 1000 ? `${req.current_radius_m}m` : `${(req.current_radius_m / 1000).toFixed(1)}km`}
                            </span>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                          <MapPin size={14} style={{ color: 'var(--red)' }} />
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{req.patient_name} • {req.patient_lat.toFixed(4)}, {req.patient_lon.toFixed(4)}</div>
                        </div>
                        <button 
                          onClick={() => handleAction('Accept', req.request_id)}
                          disabled={actionLoading || isPending}
                          className="btn btn-primary"
                          style={{ width: '100%', height: 40, borderRadius: 10, fontSize: 13, fontWeight: 800, background: 'var(--orange)', borderColor: 'var(--orange)' }}
                        >
                          {actionLoading ? 'CLAIMING...' : 'CLAIM MISSION'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="glass" style={{ padding: 24, borderLeft: '4px solid var(--blue)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <div className="animate-float">
                  <Radio size={48} style={{ color: 'var(--blue)', marginBottom: 16 }} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800 }}>Scanning for Dispatch...</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>You are on the standby list. Emergency requests will appear here instantly.</p>
                
                <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, background: 'rgba(10, 132, 255, 0.1)', border: '1px solid rgba(10, 132, 255, 0.25)', color: 'var(--blue)', fontSize: 12, fontWeight: 700 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', animation: 'pulse 1.5s infinite' }} />
                  Auto-Telemetry Ready (Broadcasts on Claim)
                </div>
              </div>

              <div className="glass" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <PackageCheck size={16} style={{ color: 'var(--green)' }} />
                  <h4 style={{ fontSize: 13, fontWeight: 800 }}>Start-Shift Equipment</h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800 }}>Oxygen Level: {equipmentLog.oxygen}%</label>
                  <input type="range" min="0" max="100" value={equipmentLog.oxygen} onChange={e => setEquipmentLog({ ...equipmentLog, oxygen: e.target.value })} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <select className="form-input form-select" value={equipmentLog.defibrillator} onChange={e => setEquipmentLog({ ...equipmentLog, defibrillator: e.target.value })}>
                      <option value="Ready">Defib Ready</option>
                      <option value="Needs Service">Defib Service</option>
                    </select>
                    <select className="form-input form-select" value={equipmentLog.supplies} onChange={e => setEquipmentLog({ ...equipmentLog, supplies: e.target.value })}>
                      <option value="Stocked">Supplies Stocked</option>
                      <option value="Low">Supplies Low</option>
                    </select>
                  </div>
                  <button className="btn btn-primary" onClick={saveEquipmentLog} disabled={equipmentSaving} style={{ width: '100%', height: 38, borderRadius: 10 }}>
                    <Save size={14} /> {equipmentSaving ? 'Saving...' : 'Save Checklist'}
                  </button>
                </div>
              </div>

              <div className="glass" style={{ padding: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>Current Shift</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div style={{ 
                    background: shiftSummary?.is_overtime ? 'rgba(255, 69, 58, 0.15)' : 'rgba(10, 132, 255, 0.1)', 
                    border: shiftSummary?.is_overtime ? '1px solid rgba(255, 69, 58, 0.4)' : '1px solid rgba(10, 132, 255, 0.2)', 
                    padding: 12, 
                    borderRadius: 10, 
                    textAlign: 'center',
                    boxShadow: shiftSummary?.is_overtime ? '0 0 12px rgba(255, 69, 58, 0.25)' : 'none',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: shiftSummary?.is_overtime ? 'var(--red)' : 'var(--blue)' }}>
                      {shiftSummary?.hours_worked || 0}h
                    </div>
                    <div style={{ fontSize: 9, color: shiftSummary?.is_overtime ? 'var(--red)' : 'var(--blue)', opacity: shiftSummary?.is_overtime ? 1 : 0.8, fontWeight: 800 }}>
                      {shiftSummary?.is_overtime ? 'OVERTIME (8h+)' : 'HOURS'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(52, 199, 89, 0.1)', border: '1px solid rgba(52, 199, 89, 0.2)', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--green)' }}>{shiftSummary?.trips_completed || 0}</div>
                    <div style={{ fontSize: 9, color: 'var(--green)', opacity: 0.8, fontWeight: 800 }}>TRIPS</div>
                  </div>
                  <div style={{ background: 'rgba(255, 149, 0, 0.1)', border: '1px solid rgba(255, 149, 0, 0.2)', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--orange)' }}>৳{(shiftSummary?.todays_collection ?? shiftSummary?.estimated_earnings ?? 0).toLocaleString()}</div>
                    <div style={{ fontSize: 9, color: 'var(--orange)', opacity: 0.8, fontWeight: 800 }}>TODAY'S COLLECTION</div>
                  </div>
                </div>
              </div>

              {/* Broadcasts section moved to top */}
            </div>
          ) : (
            <>
              {/* Advisory Banner for Active Trip */}
              {advisory && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'rgba(249, 115, 22, 0.1)',
                  border: '1px solid rgba(249, 115, 22, 0.4)',
                  color: 'var(--orange)',
                  fontSize: 13,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 16
                }}>
                  <AlertTriangle size={18} /> 
                  <span>Weather is bad, please drive carefully.</span>
                </div>
              )}

              {/* Trip Card */}
              <div className="glass" style={{ padding: 24, borderLeft: '4px solid var(--orange)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--orange)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                      Active Assignment
                    </span>
                    <h3 style={{ fontSize: 32, fontWeight: 900, marginTop: 4 }}>#{trip.trip_id}</h3>
                  </div>
                  <SeverityBadge level={trip.severity_level} />
                </div>

                {/* ACTION BUTTONS */}
                <div style={{ marginBottom: 24 }}>
                  {(trip.request_status === 'Active' || trip.request_status === 'Pending') && (
                    <button 
                      onClick={() => handleAction('Accept')} 
                      disabled={actionLoading} 
                      className="btn btn-primary"
                      style={{ width: '100%', height: 56, borderRadius: 16, fontSize: 16, fontWeight: 800, letterSpacing: 1 }}
                    >
                      {actionLoading ? 'CONFIRMING...' : (trip.request_status === 'Active' ? 'START MISSION' : 'ACCEPT MISSION')}
                    </button>
                  )}
                  
                  {trip.request_status !== 'Active' && trip.request_status !== 'Pending' && trip.request_status !== 'Complete' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      
                      {/* AUTOMATIC TELEMETRY STATUS & GPS CAUTION ALERT (INTERACTIVE BUTTONS) */}
                      {gpsError ? (
                        <button
                          type="button"
                          onClick={() => startBroadcasting()}
                          title="Click to request browser location access"
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: 14,
                            background: 'rgba(255, 69, 58, 0.15)',
                            border: '1.5px solid rgba(255, 69, 58, 0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            color: '#ff453a',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s ease',
                            animation: 'pulse 2s infinite'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 800 }}>⚠️ GPS CAUTION: Location Access Issue</div>
                              <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>{gpsError}</div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#ff7b72', marginTop: 4, textDecoration: 'underline' }}>
                                👆 Tap here to request location permission
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 6, background: 'rgba(255, 69, 58, 0.25)' }}>
                            RETRY
                          </span>
                        </button>
                      ) : isBroadcasting ? (
                        <button
                          type="button"
                          onClick={() => startBroadcasting()}
                          title="Click to refresh location permission or broadcast stream"
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: 14,
                            background: 'rgba(52, 199, 89, 0.15)',
                            border: '1.5px solid rgba(52, 199, 89, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: 'var(--green)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 10px var(--green)', animation: 'pulse 1.2s infinite' }} />
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.5, display: 'block' }}>📡 LIVE BROADCASTING TO PATIENT</span>
                              <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 600 }}>Tap to refresh GPS link anytime</span>
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.95, padding: '4px 8px', borderRadius: 6, background: 'rgba(52, 199, 89, 0.2)' }}>
                            Active ●
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startBroadcasting()}
                          title="Click to start GPS broadcast"
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: 14,
                            background: 'rgba(10, 132, 255, 0.12)',
                            border: '1.5px solid rgba(10, 132, 255, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            color: 'var(--blue)',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Radio size={16} className="animate-spin" />
                            <span style={{ fontSize: 12, fontWeight: 700 }}>Connecting GPS Telemetry Satellite...</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 800, textDecoration: 'underline' }}>Tap to Connect</span>
                        </button>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {trip.request_status === 'En Route' && (
                          <button onClick={() => handleAction('ArrivedPatient')} className="btn btn-secondary" style={{ height: 48, borderRadius: 12, fontWeight: 700, borderColor: 'var(--orange)', color: 'var(--orange)' }}>ARRIVED AT PATIENT</button>
                        )}
                        {trip.request_status === 'Picked Up' && (
                          <button onClick={() => handleAction('EnRouteHospital')} className="btn btn-secondary" style={{ height: 48, borderRadius: 12, fontWeight: 700, borderColor: 'var(--blue)', color: 'var(--blue)' }}>EN ROUTE HOSPITAL</button>
                        )}
                        {trip.request_status === 'Arrived' && (
                          <button onClick={() => handleAction('Complete')} className="btn btn-primary" style={{ height: 48, borderRadius: 12, fontWeight: 700, background: 'var(--green)', borderColor: 'var(--green)', gridColumn: 'span 2' }}>COMPLETE MISSION</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Telemetry Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                  <div className="glass-dark p-3 rounded-xl text-center">
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Speed</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--blue)' }}>{speed.toFixed(1)}<span style={{ fontSize: 10, marginLeft: 2 }}>km/h</span></p>
                  </div>
                  <div className="glass-dark p-3 rounded-xl text-center">
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>GPS Acc</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: accuracy < 20 ? 'var(--green)' : 'var(--yellow)' }}>{Math.round(accuracy)}m</p>
                  </div>
                  <div className="glass-dark p-3 rounded-xl text-center">
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Time</p>
                    <p style={{ fontSize: 18, fontWeight: 800 }}>{uptime}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AlertTriangle size={20} style={{ color: 'var(--orange)' }} />
                    <div>
                      <label style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>PATIENT PROFILE</label>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{trip.patient_name} · {trip.blood_type || 'N/A'} · {trip.emergency_type || 'General'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        For: {trip.requested_for || 'Self'} · Allergies: {trip.allergies || 'None reported'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Conditions: {(trip.conditions || []).join(', ') || 'None reported'}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <MapPin size={20} style={{ color: 'var(--red)' }} />
                    <div>
                      <label style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>PICKUP LOCATION</label>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{trip.patient_lat.toFixed(4)}, {trip.patient_lon.toFixed(4)}</div>
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Building2 size={20} style={{ color: 'var(--blue)' }} />
                    <div>
                      <label style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>DESTINATION</label>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{trip.hospital_name}</div>
                    </div>
                  </div>

                  {/* Driver Cash Collection Card */}
                  <div style={{ padding: '12px 14px', background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.12), rgba(0, 0, 0, 0.3))', borderRadius: 12, border: '1px solid rgba(52, 199, 89, 0.35)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(52, 199, 89, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
                          <Banknote size={18} />
                        </div>
                        <div>
                          <label style={{ fontSize: 9, color: 'var(--green)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>COLLECT FROM PATIENT (CASH)</label>
                          <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>৳{trip.driver_fare || 620} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>({trip.distance_km || 2.5} KM)</span></div>
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: 'rgba(52, 199, 89, 0.2)', color: 'var(--green)' }}>Hand-to-Hand</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.6)', borderTop: '1px dashed rgba(52,199,89,0.2)', paddingTop: 6 }}>
                      <span>Base: ৳{trip.base_fare ? parseInt(trip.base_fare) : 750}</span>
                      <span>Distance: {trip.distance_km || 2.5} KM</span>
                      <span>Fuel/Rate: ৳{trip.per_km_charge ? parseInt(trip.per_km_charge) : 25}/KM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat with Dispatcher */}
              <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: 250, border: 'none', marginTop: 16 }}>
                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageCircle size={16} style={{ color: 'var(--blue)' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>Emergency Dispatch Chat</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {chatMessages.map((m, i) => (
                    <div key={i} style={{ alignSelf: m.sender.includes('Driver') ? 'flex-end' : 'flex-start', background: m.sender.includes('Driver') ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 16, maxWidth: '85%', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 9, fontWeight: 800, opacity: 0.5, marginBottom: 4 }}>{m.sender.toUpperCase()}</div>
                      <div style={{ fontSize: 13, lineHeight: 1.4 }}>{m.message_text}</div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} style={{ padding: 12, display: 'flex', gap: 8, background: 'rgba(0,0,0,0.3)' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ fontSize: 13, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12 }}
                    placeholder="Type message..." 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                  />
                  <button type="submit" disabled={isSending} className="btn btn-primary" style={{ padding: '0 16px', borderRadius: 12, opacity: isSending ? 0.7 : 1 }}>
                    {isSending ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <Send size={18}/>}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Right Panel: Map Navigation */}
        <div className="track-map" style={{ position: 'relative' }}>
          {isPending && (
            <div style={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 1000,
              padding: '8px 16px',
              borderRadius: 12,
              background: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              color: '#fbbf24',
              fontSize: 12,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
            }}>
              <Lock size={14} /> GPS Telemetry Offline · Pending Admin Approval
            </div>
          )}
          {trip ? (
            <>
              <MapView 
                pickupCoords={{ lat: trip.patient_lat, lon: trip.patient_lon }} 
                hospitals={[{ hospital_id: 1, name: trip.hospital_name, lat: trip.hospital_lat, lon: trip.hospital_lon, general_beds: 'Destination', icu_beds: 'Secured' }]}
                requestStatus={trip.request_status}
                realtimeMarker={realtimeMarker}
              />
              
              {/* Map Overlay Stats */}
              <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, zIndex: 1000, display: 'flex', gap: 12 }}>
                <div className="glass" style={{ flex: 1, padding: 16, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)' }}>
                        <Gauge size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Live Speed</div>
                        <div style={{ fontSize: 24, fontWeight: 900 }}>{speed.toFixed(1)} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>km/h</span></div>
                    </div>
                </div>
                <div className="glass" style={{ flex: 1, padding: 16, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(10,132,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
                        <Navigation size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Navigation</div>
                        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {trip.request_status === 'En Route' ? 'Moving to Pickup' : 'Driving to Hospital'}
                        </div>
                    </div>
                </div>
              </div>

              {/* Status Badge Over Map */}
              <div className="glass" style={{ padding: '8px 16px', position: 'absolute', top: 24, left: 24, zIndex: 1000, fontWeight: 800, fontSize: 12, color: 'var(--yellow)', border: '1px solid var(--yellow-glow)' }}>
                DISPATCHED: UNIT {trip.license_plate}
              </div>
            </>
          ) : (
            <>
              <MapView realtimeMarker={realtimeMarker} />
              <div className="glass" style={{ 
                padding: '8px 16px', 
                position: 'absolute', 
                top: 24, 
                left: 24, 
                zIndex: 1000, 
                fontWeight: 800, 
                fontSize: 12, 
                color: isPending ? '#94a3b8' : 'var(--blue)', 
                border: isPending ? '1px solid rgba(255,255,255,0.15)' : '1px solid var(--blue-glow)',
                background: isPending ? 'rgba(15, 23, 42, 0.85)' : undefined
              }}>
                {isPending ? 'OFFLINE (AWAITING APPROVAL)' : 'STANDBY POSITION'}
              </div>
            </>
          )}
        </div>

      </div>

    </div>
  );
}
