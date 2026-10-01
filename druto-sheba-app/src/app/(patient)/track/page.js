'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigation, PhoneCall, Truck, AlertTriangle, Building2, ShieldAlert, Radio, Gauge, MapPin, MessageCircle, Send, Square, Play, Layers, Clock, ChevronDown, Check, XCircle, Ban, AlertOctagon, Banknote, ShieldCheck, Info } from 'lucide-react';
import MapView from '@/components/MapView';
import { SeverityBadge } from '@/components/Badges';
import mqttService from '@/lib/mqttService';
import { useUser } from '@/lib/UserContext';

export default function PatientTrackPage() {
  const { activePatient } = useUser();
  const [activeRequests, setActiveRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [isStopped, setIsStopped] = useState(false);
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtimeMarker, setRealtimeMarker] = useState(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Advisory State
  const [advisory, setAdvisory] = useState(null);

  // Cancellation state
  const [cancellingId, setCancellingId] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [claimedAlert, setClaimedAlert] = useState(null); // { driver_name, driver_phone, message }
  const [confirmCancelModal, setConfirmCancelModal] = useState(null); // req object

  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen]);

  const fetchTrip = useCallback(async () => {
    try {
      const patientQuery = activePatient?.id ? `&patient_id=${activePatient.id}` : '';
      const selectedQuery = selectedRequestId ? `&request_id=${selectedRequestId}` : '';
      const res = await fetch(`/api/patient/track?t=${Date.now()}${patientQuery}${selectedQuery}`, { cache: 'no-store' });
      const data = await res.json();
      
      const allActive = data.active_requests || [];
      setActiveRequests(allActive);

      // When stopped, user is in the menu overview mode
      if (!isStopped) {
        if (selectedRequestId) {
          const matched = allActive.find(r => r.request_id === selectedRequestId);
          setTrip(matched || allActive[0] || null);
        } else {
          setTrip(data.active_trip || allActive[0] || null);
        }
      } else {
        setTrip(null);
      }

      setAdvisory(data.advisory?.is_active ? data.advisory : null);
      setChatMessages(data.chat_messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activePatient, selectedRequestId, isStopped]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !trip || isSending) return;
    setIsSending(true);
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: trip.trip_id, text: newMessage, sender: `Patient (${trip.patient_name || 'Self'})` })
      });
      setNewMessage('');
      fetchTrip();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    fetchTrip();
    const int = setInterval(fetchTrip, 1500);
    return () => clearInterval(int);
  }, [fetchTrip]);

  // MQTT Connection for real-time updates
  useEffect(() => {
    if (!trip) return;

    mqttService.connect(`patient-${Math.random().toString(16).substr(2, 6)}`);
    
    const unsubscribe = mqttService.subscribe((data) => {
      if (data.id === `ambulance-${trip.driver_id}`) {
        if (data.status === 'offline') {
          setRealtimeMarker(null);
        } else {
          setRealtimeMarker({
            lat: data.lat,
            lng: data.lng,
            speed: data.speed,
            acc: data.acc
          });
        }
      }
    });

    return () => {
      unsubscribe();
      mqttService.disconnect();
    };
  }, [trip]);

  // Handler for Stop Tracking button: ALWAYS stops and opens the selection menu
  const handleStopTracking = () => {
    setIsStopped(true);
    setTrip(null);
    setDropdownOpen(false);
  };

  // Handler to select and view a specific SOS
  const handleSelectSOS = (req) => {
    setSelectedRequestId(req.request_id);
    setTrip(req);
    setIsStopped(false);
    setDropdownOpen(false);
  };

  // Handler to Cancel SOS (Emergency Mission)
  const handleCancelSOS = async (reqToCancel) => {
    const target = reqToCancel || trip;
    if (!target) return;

    // Check if the mission has already been claimed by a driver
    if (target.is_claimed || ['En Route', 'Picked Up', 'Arrived'].includes(target.request_status)) {
      setClaimedAlert({
        driver_name: target.driver_name || 'Assigned Driver',
        driver_phone: target.driver_phone || '+8801711223344',
        request_id: target.request_id
      });
      setConfirmCancelModal(null);
      return;
    }

    setIsCancelling(true);
    setCancellingId(target.request_id);

    try {
      const res = await fetch('/api/patient/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: target.request_id })
      });
      const data = await res.json();

      if (!res.ok || data.claimed) {
        setClaimedAlert({
          driver_name: data.driver_name || target.driver_name || 'Assigned Driver',
          driver_phone: data.driver_phone || target.driver_phone || '+8801711223344',
          request_id: target.request_id
        });
      } else {
        // Successfully cancelled and deleted from DB
        const remaining = activeRequests.filter(r => r.request_id !== target.request_id);
        setActiveRequests(remaining);

        if (trip && trip.request_id === target.request_id) {
          if (remaining.length > 0) {
            // Automatically switch to the next remaining emergency or stopped menu
            setTrip(remaining[0]);
            setSelectedRequestId(remaining[0].request_id);
          } else {
            setTrip(null);
            setIsStopped(true);
          }
        }
        setConfirmCancelModal(null);
      }
    } catch (err) {
      console.error('Failed to cancel SOS:', err);
      alert('Network error while cancelling SOS.');
    } finally {
      setIsCancelling(false);
      setCancellingId(null);
    }
  };

  if (!activePatient) return null;
  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container dot-pattern" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px', position: 'relative' }}>
      
      {/* Background Blobs */}
      <div className="bg-blob">
        <div className="blob blob-1"></div>
        <div className="blob blob-3" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="page-header" style={{ marginBottom: 16, flexShrink: 0, position: 'relative', zIndex: 9999, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 800 }}>
            Live Tracking
          </h2>
          <p className="page-header-sub">
            {activeRequests.length > 1 
              ? `${activeRequests.length} active emergency rescue units dispatched.`
              : 'Monitor your rescue unit in real-time'}
          </p>
        </div>

        {/* SOS Dropdown Menu & Stop Tracking Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 9999 }}>
          {/* Dropdown for selecting any SOS even if there are 10+ */}
          {activeRequests.length > 1 && (
            <div style={{ position: 'relative', zIndex: 9999 }} ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                <Layers size={16} style={{ color: 'var(--blue)' }} />
                <span>
                  {trip ? `Tracking: #${trip.request_id} (${trip.requested_for || 'Self'})` : `Select SOS (${activeRequests.length})`}
                </span>
                <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              {/* Responsive Scrollable Dropdown Menu for 2 to 50+ SOS requests */}
              {dropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '320px',
                  maxHeight: '380px',
                  overflowY: 'auto',
                  background: 'rgba(18, 18, 26, 0.98)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px',
                  padding: '10px',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
                  zIndex: 100000
                }}>
                  <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 }}>
                    All Active Emergencies ({activeRequests.length})
                  </div>
                  {activeRequests.map((req, idx) => {
                    const isSelected = trip && trip.request_id === req.request_id;
                    return (
                      <div
                        key={req.request_id}
                        onClick={() => handleSelectSOS(req)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: isSelected ? 'rgba(255,45,85,0.12)' : 'transparent',
                          border: isSelected ? '1px solid rgba(255,45,85,0.3)' : '1px solid transparent',
                          cursor: 'pointer',
                          marginBottom: 4,
                          transition: 'all 0.15s'
                        }}
                        onMouseOver={e => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseOut={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? 'var(--red)' : '#fff' }}>
                              #{idx + 1} Trip {req.request_id}
                            </span>
                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', fontWeight: 700 }}>
                              {req.requested_for || 'Self'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                            🏥 {req.hospital_name || 'Hospital Selected'}
                          </div>
                        </div>
                        {isSelected && <Check size={16} style={{ color: 'var(--red)' }} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {trip && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={handleStopTracking}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 18px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 69, 58, 0.4)',
                  background: 'rgba(255, 69, 58, 0.15)',
                  color: '#ff453a',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.25)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.15)'}
              >
                <Square size={14} fill="#ff453a" />
                <span>STOP TRACKING</span>
              </button>

              <button
                onClick={() => setConfirmCancelModal(trip)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 18px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 45, 85, 0.5)',
                  background: 'linear-gradient(135deg, rgba(255,45,85,0.25) 0%, rgba(255,69,58,0.35) 100%)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(255,45,85,0.25)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255, 45, 85, 0.45)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,45,85,0.25) 0%, rgba(255,69,58,0.35) 100%)'; e.currentTarget.style.transform = 'none'; }}
              >
                <XCircle size={15} />
                <span>CANCEL SOS</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* When user clicks STOP TRACKING, it enters the Menu Overview Mode */}
      {(!trip || isStopped) ? (
        activeRequests.length === 0 ? (
          <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
            <div className="animate-float">
              <ShieldAlert size={64} style={{ color: 'var(--red)', opacity: 0.3, marginBottom: 24 }} />
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700 }}>No Active Emergencies</h3>
            <p style={{ maxWidth: 400, margin: '12px auto' }}>You don&apos;t have any active SOS requests. In case of emergency, use the SOS button on your dashboard.</p>
          </div>
        ) : (
          /* Multi-SOS Selection Panel when tracking is stopped */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
            <div className="glass" style={{ maxWidth: 680, width: '100%', padding: 32, borderRadius: 24, border: '1px solid var(--border-subtle)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,149,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff9500' }}>
                  <Layers size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Active Emergency Dispatches ({activeRequests.length})</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Tracking stopped. Select any emergency below to track on the live radar:</p>
                </div>
              </div>

              {/* Scrollable List for handling even 10+ SOS requests cleanly */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16, overflowY: 'auto', paddingRight: 6 }}>
                {activeRequests.map((req, index) => (
                  <div 
                    key={req.request_id}
                    onClick={() => handleSelectSOS(req)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderRadius: '16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--blue)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,45,85,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', fontWeight: 900, fontSize: 14 }}>
                        #{index + 1}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 800 }}>Trip #{req.request_id}</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(10,132,255,0.15)', color: '#0a84ff', fontWeight: 700 }}>
                            For: {req.requested_for || 'Self'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span>🏥 {req.hospital_name || 'Hospital Selected'}</span>
                          <span>•</span>
                          <span><Clock size={11} style={{ display: 'inline', verticalAlign: -1 }}/> {new Date(req.time_dispatched).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <SeverityBadge level={req.severity_level} />
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSelectSOS(req); }}
                        className="btn btn-primary btn-sm" 
                        style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Play size={12} fill="#fff" /> Track Now
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmCancelModal(req); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          border: '1px solid rgba(255, 69, 58, 0.3)',
                          background: 'rgba(255, 69, 58, 0.1)',
                          color: '#ff453a',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.25)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.1)'}
                      >
                        <XCircle size={13} /> Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="track-layout">
          
          {/* Left Panel: Details */}
          <div className="track-sidebar">
            
            {/* Advisory Banner for Patient */}
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
                <AlertTriangle size={18} style={{ flexShrink: 0 }} /> 
                <span style={{ lineHeight: 1.4 }}>Weather is bad, driver might take approx {advisory.eta_impact_percent || 15}% more time to reach. Be patient, Allah(God) is merciful, InshaAllah everything will be fine.</span>
              </div>
            )}

            <div className="glass" style={{ padding: 24, borderLeft: '4px solid var(--red)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--red)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                      {trip.request_status === 'Pending' || trip.request_status === 'Active' ? 'Unit Assigned' : 
                       trip.request_status === 'En Route' ? 'Unit Is Arriving' :
                       trip.request_status === 'Picked Up' ? 'Transporting' : 'Arrived'}
                    </span>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', fontWeight: 800 }}>
                      FOR: {trip.requested_for || 'SELF'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 32, fontWeight: 900, marginTop: 4 }}>Trip #{trip.trip_id || trip.request_id || 'Req'}</h3>
                </div>
                <SeverityBadge level={trip.severity_level} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div style={{ padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,149,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--yellow)', flexShrink: 0 }}>
                    <Truck size={24} />
                  </div>
                  <div>
                    <label style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>AMBULANCE ID</label>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{trip.license_plate || 'Unassigned'}</div>
                  </div>
                </div>

                {/* Driver Official Cash Fare Box */}
                <div style={{ 
                  padding: '14px 16px', 
                  borderRadius: 14, 
                  background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.12), rgba(0, 0, 0, 0.35))', 
                  border: '1px solid rgba(52, 199, 89, 0.35)',
                  boxShadow: '0 8px 24px rgba(52, 199, 89, 0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 19, background: 'rgba(52, 199, 89, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
                        <Banknote size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                          Official Driver Fare (দূরত্ব অনুযায়ী ভাড়া)
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 1 }}>
                          <span>৳{trip.driver_fare || 620}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase' }}>
                            {trip.distance_km ? `(${trip.distance_km} KM)` : 'Cash on Arrival'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ 
                        fontSize: 10, 
                        fontWeight: 800, 
                        padding: '4px 8px', 
                        borderRadius: 6, 
                        background: 'rgba(52, 199, 89, 0.2)', 
                        color: 'var(--green)',
                        border: '1px solid rgba(52, 199, 89, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <ShieldCheck size={12} /> Hand-to-Hand Cash
                      </span>
                    </div>
                  </div>

                  {/* Distance & Fuel Breakdown */}
                  <div style={{ 
                    marginTop: 8, 
                    padding: '6px 10px', 
                    borderRadius: 8, 
                    background: 'rgba(255,255,255,0.04)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: 10, 
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 600 
                  }}>
                    <span>বেস ফেয়ার: ৳{trip.base_fare ? parseInt(trip.base_fare) : 750}</span>
                    <span>দূরত্ব: {trip.distance_km || 2.5} KM</span>
                    <span>পেট্রোল/কিমি: ৳{trip.per_km_charge ? parseInt(trip.per_km_charge) : 25}/কিমি</span>
                  </div>

                  <div style={{ 
                    marginTop: 8, 
                    paddingTop: 8, 
                    borderTop: '1px dashed rgba(52, 199, 89, 0.25)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 6, 
                    fontSize: 11, 
                    color: 'rgba(255, 255, 255, 0.8)' 
                  }}>
                    <Info size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
                    <span>দূরত্ব অনুযায়ী নির্ধারিত ভাড়া। ড্রাইভারকে এর চেয়ে বেশি টাকা দেওয়া নিষেধ।</span>
                  </div>
                </div>

                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, borderLeft: '3px solid var(--red)' }}>
                  <label style={{ fontSize: 9, color: 'var(--red)', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={10}/> Pickup Point</label>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>GPS: {Number(trip.patient_lat || 0).toFixed(4)}, {Number(trip.patient_lon || 0).toFixed(4)}</div>
                </div>

                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, borderLeft: '3px solid var(--blue)' }}>
                  <label style={{ fontSize: 9, color: 'var(--blue)', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={10}/> Destination</label>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{trip.hospital_name || 'Selected Destination'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, height: 50, borderRadius: 14, fontSize: 14, fontWeight: 800, boxShadow: '0 10px 20px rgba(255,45,85,0.2)' }}
                  onClick={() => {
                    if (trip.driver_name) {
                      setShowDriverModal(true);
                    } else {
                      alert('Driver has not been assigned yet.');
                    }
                  }}
                >
                   <PhoneCall size={16} /> CONTACT DRIVER
                </button>

                <button
                  onClick={() => setConfirmCancelModal(trip)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '0 18px',
                    height: 50,
                    borderRadius: 14,
                    fontSize: 13,
                    fontWeight: 800,
                    border: '1px solid rgba(255, 69, 58, 0.4)',
                    background: 'rgba(255, 69, 58, 0.12)',
                    color: '#ff453a',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.25)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.12)'}
                  title="Cancel this emergency dispatch"
                >
                  <Ban size={16} /> CANCEL
                </button>
              </div>
              
              {showDriverModal && (
                <div style={{ marginTop: 16, padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800 }}>Driver Information</h4>
                    <button onClick={() => setShowDriverModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Close</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
                        {trip.driver_name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>{trip.driver_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assigned First Responder</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1 }}>{trip.driver_phone || 'N/A'}</div>
                      <a href={`tel:${trip.driver_phone}`} className="btn btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 20 }}>Call Now</a>
                    </div>
                    <div style={{ padding: '10px 12px', background: 'rgba(52, 199, 89, 0.12)', borderRadius: 8, border: '1px solid rgba(52, 199, 89, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>Payable to Driver (Cash)</span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>৳{trip.driver_fare || 850}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Telemetry Status */}
            <div className="glass" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Driver Telemetry</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                 <div style={{ padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <Gauge size={16} style={{ color: 'var(--blue)' }} />
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>SPEED</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{realtimeMarker?.speed || '0.0'} km/h</div>
                    </div>
                 </div>
                 <div style={{ padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <Radio size={16} style={{ color: 'var(--green)' }} />
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>SIGNAL</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{realtimeMarker ? 'EXCELLENT' : 'CONNECTING'}</div>
                    </div>
                 </div>
              </div>
            </div>

            {/* In-Transit Medical Support Chat (Styled exactly like Driver Emergency Dispatch Chat) */}
            <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: 250, border: 'none', marginTop: 16 }}>
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageCircle size={16} style={{ color: 'var(--blue)' }} />
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>Emergency Dispatch Chat</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chatMessages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    Direct line with emergency dispatch & ambulance unit active.
                  </div>
                ) : (
                  chatMessages.map((m, i) => {
                    const isSelf = (m.sender || '').toLowerCase().includes('patient');
                    const text = m.message_text || m.text || '';
                    return (
                      <div 
                        key={i} 
                        style={{ 
                          alignSelf: isSelf ? 'flex-end' : 'flex-start', 
                          background: isSelf 
                            ? 'linear-gradient(135deg, rgba(10, 132, 255, 0.25), rgba(0, 110, 230, 0.2))' 
                            : 'var(--bg-secondary, rgba(255, 255, 255, 0.08))', 
                          padding: '10px 14px', 
                          borderRadius: 16, 
                          maxWidth: '85%', 
                          border: isSelf 
                            ? '1px solid rgba(10, 132, 255, 0.4)' 
                            : '1px solid var(--border-subtle, rgba(0, 240, 255, 0.15))',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                        }}
                      >
                        <div style={{ 
                          fontSize: 9.5, 
                          fontWeight: 800, 
                          color: isSelf ? 'var(--blue, #00b4d8)' : 'var(--text-muted, #94a3b8)', 
                          marginBottom: 4, 
                          letterSpacing: 0.4 
                        }}>
                          {(m.sender || 'DISPATCH').toUpperCase()}
                        </div>
                        <div style={{ 
                          fontSize: 13.5, 
                          lineHeight: 1.4, 
                          color: 'var(--text-primary, #0f172a)',
                          fontWeight: 500
                        }}>
                          {text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <form onSubmit={handleSendMessage} style={{ padding: 12, display: 'flex', gap: 8, background: 'rgba(0,0,0,0.3)' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ fontSize: 13, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12, width: '100%' }}
                  placeholder="Type message..." 
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <button 
                  type="submit" 
                  disabled={isSending} 
                  className="btn btn-primary" 
                  style={{ padding: '0 16px', borderRadius: 12, opacity: isSending ? 0.7 : 1 }}
                >
                  {isSending ? (
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel: Map */}
          <div className="track-map">
             <MapView 
                pickupCoords={{ lat: Number(trip.patient_lat || 23.7771), lon: Number(trip.patient_lon || 90.3994) }} 
                hospitals={[{ hospital_id: 1, name: trip.hospital_name || 'Selected Destination', lat: Number(trip.hospital_lat || 23.7771), lon: Number(trip.hospital_lon || 90.3994), general_beds: 'Destination', icu_beds: 'Secured' }]}
                requestStatus={trip.request_status}
                realtimeMarker={realtimeMarker}
                initialAmbulanceLocation={{ lat: Number(trip.ambulance_lat || 23.7771), lon: Number(trip.ambulance_lon || 90.3994) }}
             />
             
             {/* Map Status Overlay */}
             <div className="glass" style={{ padding: 20, position: 'absolute', top: 24, left: 24, right: 24, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 16 }}>
                 <div className="animate-pulse" style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,45,85,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}>
                    <Navigation size={24} />
                 </div>
                 <div style={{ flex: 1 }}>
                     <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Mission Status</div>
                     <div style={{ fontSize: 16, fontWeight: 700 }}>
                        {trip.request_status === 'Pending' || trip.request_status === 'Active' ? 'Ambulance is confirmed and preparing to leave.' : 
                         trip.request_status === 'En Route' ? 'Ambulance is moving towards your location.' :
                         trip.request_status === 'Picked Up' ? 'Transporting to hospital safely.' : 
                         'Arrived safely. Stand by for medical handover.'}
                     </div>
                 </div>
             </div>

             {/* Live Connection Tag */}
             <div className="glass" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, position: 'absolute', bottom: 24, left: 24, zIndex: 1000 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: realtimeMarker ? 'var(--green)' : 'var(--text-muted)' }} />
                <span style={{ fontSize: 10, fontWeight: 800 }}>{realtimeMarker ? 'LIVE SYSTEM LINK' : 'ESTABLISHING LINK...'}</span>
             </div>
          </div>

        </div>
      )}

      {/* Confirmation Modal to Cancel SOS */}
      {confirmCancelModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000000,
          padding: 20
        }}>
          <div className="glass" style={{
            maxWidth: 480,
            width: '100%',
            padding: 30,
            borderRadius: 24,
            border: '1px solid rgba(255,69,58,0.3)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
            textAlign: 'center'
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(255,69,58,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ff453a' }}>
              <AlertTriangle size={28} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Cancel Emergency Dispatch?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
              Are you sure you want to cancel Trip <strong style={{ color: '#fff' }}>#{confirmCancelModal.request_id}</strong> (For: {confirmCancelModal.requested_for || 'Self'})?
              This will remove the dispatch immediately from the emergency network and database.
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setConfirmCancelModal(null)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 12,
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Keep Active
              </button>
              <button
                onClick={() => handleCancelSOS(confirmCancelModal)}
                disabled={isCancelling}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #ff2d55 0%, #ff3b30 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 20px rgba(255,45,85,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel SOS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Claimed Alert Modal: Shown when user tries to cancel after driver already claimed */}
      {claimedAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.82)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000000,
          padding: 20
        }}>
          <div className="glass" style={{
            maxWidth: 520,
            width: '100%',
            padding: 32,
            borderRadius: 24,
            border: '1px solid rgba(255,149,0,0.4)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.9)',
            textAlign: 'center'
          }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: 'rgba(255,149,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ff9500' }}>
              <AlertOctagon size={32} />
            </div>

            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: '#ff9500', textTransform: 'uppercase' }}>
              Cancellation Locked
            </span>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0 12px', color: '#fff' }}>
              Mission Already Claimed!
            </h3>

            <div style={{
              background: 'rgba(255,149,0,0.08)',
              border: '1px solid rgba(255,149,0,0.2)',
              borderRadius: 16,
              padding: '16px 20px',
              margin: '16px 0 20px',
              textAlign: 'left'
            }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                Mission already claimed by <strong style={{ color: '#fff' }}>{claimedAlert.driver_name}</strong> ({claimedAlert.driver_phone}).
                Direct cancellation is restricted because the rescue team is en route. Please contact him via message or call to cancel or for further actions.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setClaimedAlert(null)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 12,
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
              <a
                href={`tel:${claimedAlert.driver_phone}`}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #0a84ff 0%, #0070e0 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 14,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 8px 20px rgba(10,132,255,0.35)'
                }}
              >
                <PhoneCall size={16} /> Call Driver
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
