'use client';
import { useState, useEffect, useRef } from 'react';
import { Phone, MapPin, Siren, Clock, Building2, Truck, Banknote, ShieldAlert, CheckCircle, Loader2, AlertTriangle, Radio, User, Droplet, Activity, ChevronRight, Navigation } from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const INCIDENT_TYPES = {
  Accident: 'High',
  Cardiac: 'Critical',
  Maternity: 'Critical',
  General: 'Medium',
};

function getAccuratePosition(timeoutMs = 15000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: null, lon: null, accuracy: null, source: 'unavailable' });
      return;
    }
    let resolved = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (resolved) return;
        resolved = true;
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy), source: 'gps' });
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (resolved) return;
            resolved = true;
            resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy), source: 'gps' });
          },
          async () => {
            if (resolved) return;
            try {
              const ipRes = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
              if (ipRes.ok) {
                const ipData = await ipRes.json();
                if (ipData && ipData.latitude && ipData.longitude) {
                  resolved = true;
                  resolve({ lat: ipData.latitude, lon: ipData.longitude, accuracy: 5000, source: 'ip' });
                  return;
                }
              }
            } catch {}
            resolved = true;
            resolve({ lat: null, lon: null, accuracy: null, source: 'failed' });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

export default function SOSPage() {
  const { activePatient } = useUser();
  const [phase, setPhase] = useState('ready'); // ready | loading_recs | recommendations | dispatching | result
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationSource, setLocationSource] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [severity, setSeverity] = useState('Critical');
  const [incidentType, setIncidentType] = useState('Accident');
  const [primarySpec, setPrimarySpec] = useState(null);
  const [requestFor, setRequestFor] = useState('Self');
  const [overrideLocation, setOverrideLocation] = useState(false);
  const [manualCoords, setManualCoords] = useState({ lat: '', lon: '' });
  const [dispatchTimer, setDispatchTimer] = useState(0);
  const [profile, setProfile] = useState(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState(null);
  const timerRef = useRef(null);
  const watchRef = useRef(null);

  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');

  useEffect(() => {
    if (activePatient?.id) {
      fetch(`/api/patients?patient_id=${activePatient.id}&t=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setProfile(Array.isArray(data) ? data[0] : data);
          }
        })
        .catch(() => {});
    }
  }, [activePatient]);

  useEffect(() => {
    fetch('/api/zones').then(r => r.json()).then(data => {
      setZones(data.zones || []);
      if (data.zones && data.zones.length > 0) setSelectedZone(data.zones[0].name);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setGpsLoading(true);
    getAccuratePosition(15000).then((result) => {
      if (cancelled) return;
      setGpsLoading(false);
      if (result.source !== 'failed' && result.source !== 'unavailable') {
        setLocation({ lat: result.lat, lon: result.lon });
        setLocationSource(result.source);
        setGpsAccuracy(result.accuracy);
        if (result.source === "ip") setLocationError("📍 Using approximate IP location.");
      } else {
        setLocationError('Could not determine location. Please enable GPS.');
      }
    });

    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return;
          const { latitude, longitude, accuracy } = pos.coords;
          if (!gpsAccuracy || accuracy < gpsAccuracy) {
            setLocation({ lat: latitude, lon: longitude });
            setLocationSource('gps');
            setGpsAccuracy(Math.round(accuracy));
            setGpsLoading(false);
            setLocationError(null);
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    }
    return () => {
      cancelled = true;
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setSeverity(INCIDENT_TYPES[incidentType] || 'Medium');
  }, [incidentType]);

  const triggerSOS = async () => {
    setPhase('loading_recs');
    setLocationError(null);

    let coords = overrideLocation
      ? { lat: Number(manualCoords.lat), lon: Number(manualCoords.lon) }
      : location;

    if (overrideLocation && (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lon))) {
      setLocationError('Enter valid coordinates for the dependent pickup location.');
      setPhase('ready');
      return;
    }

    if (!coords || locationSource === 'ip') {
      const freshPos = await getAccuratePosition(12000);
      if (freshPos.source !== 'failed' && freshPos.source !== 'unavailable') {
        coords = { lat: freshPos.lat, lon: freshPos.lon };
        setLocation(coords);
        setLocationSource(freshPos.source);
        setGpsAccuracy(freshPos.accuracy);
      } else if (!coords) {
        setLocationError('❌ Cannot acquire location. Please enable GPS.');
        setPhase('ready');
        return;
      }
    }

    try {
      const payload = { ...coords, severity, emergency_type: incidentType, patient_id: activePatient?.id || 1 };
      const res = await fetch('/api/hospitals/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error('Failed to fetch recommendations');
      }
      const data = await res.json();
      setHospitals(data.hospitals || []);
      setPrimarySpec(data.primary_specialization || null);
      setPhase('recommendations');
    } catch (err) {
      setLocationError('Network error fetching hospitals.');
      setPhase('ready');
    }
  };

  const confirmDispatch = async (hospitalId) => {
    setPhase('dispatching');
    setDispatchTimer(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      setDispatchTimer(((Date.now() - start) / 1000).toFixed(1));
    }, 100);

    try {
      const payload = {
        lat: overrideLocation ? Number(manualCoords.lat) : location.lat,
        lon: overrideLocation ? Number(manualCoords.lon) : location.lon,
        severity, emergency_type: incidentType,
        primary_specialization: primarySpec,
        requested_for: requestFor || 'Self',
        hospital_id: hospitalId,
        patient_id: activePatient?.id || 1,
        name: activePatient?.name || 'Omar Begum',
        phone: profile?.phone || '01711000000',
        blood_type: activePatient?.blood_type || 'O-',
        zone_name: selectedZone
      };
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      clearInterval(timerRef.current);
      setResult(data);
      setPhase('result');
    } catch (err) {
      clearInterval(timerRef.current);
      setLocationError('Network error. Please try again.');
      setPhase('ready');
    }
  };

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  if (!activePatient) return null;

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <style>{`
        .sos-wrapper {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 75vh; gap: 30px; text-align: center; position: relative; z-index: 10;
        }
        .sos-btn {
          width: 240px; height: 240px; border-radius: 50%; border: none; cursor: pointer;
          background: radial-gradient(circle, #ff2d55 0%, #cc0033 70%);
          color: white; font-size: 28px; font-weight: 900; letter-spacing: 4px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 0 0 0 rgba(255,45,85,0.7);
          animation: sosPulse 1.5s infinite; transition: transform 0.2s; position: relative; z-index: 2;
        }
        .sos-btn:hover { transform: scale(1.08); }
        .sos-btn:active { transform: scale(0.95); }
        @keyframes sosPulse {
          0% { box-shadow: 0 0 0 0 rgba(255,45,85,0.7); }
          70% { box-shadow: 0 0 0 50px rgba(255,45,85,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,45,85,0); }
        }
        .sos-ring {
          position: absolute; border-radius: 50%; border: 2px solid rgba(255,45,85,0.15); 
          animation: ringPulse 2s infinite; pointer-events: none;
        }
        .ring-1 { width: 300px; height: 300px; }
        .ring-2 { width: 380px; height: 380px; animation-delay: 0.5s; }
        .ring-3 { width: 460px; height: 460px; animation-delay: 1s; }
        @keyframes ringPulse { 0% { opacity: 0.6; transform: scale(0.95); } 100% { opacity: 0; transform: scale(1.15); } }
        .severity-row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
        .sev-pill {
          padding: 10px 28px; border-radius: 24px; cursor: pointer; font-weight: 800; font-size: 13px;
          border: 2px solid var(--border-subtle); background: var(--bg-glass);
          color: var(--text-muted); transition: all 0.25s; letter-spacing: 0.5px;
        }
        .sev-pill.active-Critical { background: rgba(255,45,85,0.15); border-color: var(--red); color: var(--red); }
        .sev-pill.active-High { background: rgba(255,159,10,0.15); border-color: var(--yellow); color: var(--yellow); }
        .sev-pill.active-Medium { background: rgba(10,132,255,0.15); border-color: var(--blue); color: var(--blue); }
        .patient-card {
          display: flex; align-items: center; gap: 20px; padding: 16px 24px;
          background: var(--bg-card); border: 1px solid var(--border-subtle);
          border-radius: 16px; text-align: left; width: 100%; max-width: 480px;
        }
        .patient-card .avatar {
          width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, rgba(10,132,255,0.15), rgba(255,45,85,0.15));
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .gps-badge {
          display: inline-flex; align-items: center; gap: 6px; padding: 8px 20px; border-radius: 24px; font-size: 12px; font-weight: 700;
        }
        .gps-locked { background: rgba(48,209,88,0.1); border: 1px solid rgba(48,209,88,0.3); color: var(--green); }
        .gps-searching { background: rgba(255,159,10,0.1); border: 1px solid rgba(255,159,10,0.3); color: var(--yellow); }
        .gps-error { background: rgba(255,45,85,0.1); border: 1px solid rgba(255,45,85,0.3); color: var(--red); }
        .dispatch-overlay { display: flex; flex-direction: column; align-items: center; gap: 28px; }
        .dispatch-spinner {
          width: 120px; height: 120px; border-radius: 50%; border: 4px solid rgba(255,45,85,0.1); border-top-color: var(--red);
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .dispatch-timer {
          font-size: 48px; font-weight: 900; font-family: 'JetBrains Mono', monospace;
          color: var(--red);
        }
        .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; width: 100%; max-width: 540px; }
        .result-card {
          padding: 24px; border-radius: 16px; display: flex; flex-direction: column; gap: 8px;
          background: var(--bg-card); border: 1px solid var(--border-subtle); text-align: left;
        }
        .result-card-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); font-weight: 800; display: flex; align-items: center; gap: 6px; }
        .result-card-value { font-size: 22px; font-weight: 900; color: var(--text-primary); }
        .result-card-sub { font-size: 12px; color: var(--text-secondary); }
        
        .hospital-list { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 540px; }
        .hospital-item {
          display: flex; align-items: center; justify-content: space-between; padding: 16px 20px;
          background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px;
          cursor: pointer; transition: all 0.2s; text-align: left;
        }
        .hospital-item:hover { background: var(--bg-card-hover); border-color: var(--blue); transform: translateY(-2px); }
        .hospital-item.best-match { border-color: rgba(48,209,88,0.4); background: rgba(48,209,88,0.05); }

        @media (max-width: 600px) {
          .sos-btn { width: 140px; height: 140px; font-size: 20px; }
          .result-grid { grid-template-columns: 1fr; }
          .patient-card { flex-direction: column; text-align: center; }
          .hospital-item { flex-direction: column; gap: 12px; align-items: flex-start; }
          .floating-bottom-card { left: 16px; right: 16px; bottom: 16px; width: auto; padding: 20px; }
          .uber-layout { margin: 0; border-radius: 0; }
        }
        .uber-layout {
          position: relative;
          height: 100vh;
          width: 100%;
          overflow: hidden;
          background: var(--bg-primary);
        }
        .map-background {
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        .floating-top-card {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-subtle);
          border-radius: 40px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: var(--shadow-card);
        }
        .floating-bottom-card {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          background: linear-gradient(180deg, var(--bg-card), rgba(0,0,0,0.9));
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: 20px;
          width: 94%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.6);
        }
        .hospital-list-container {
          width: 100%;
          max-height: 280px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .hospital-list-container::-webkit-scrollbar { width: 4px; }
        .hospital-list-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .quick-field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          width: 100%;
        }
        .override-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border: 1px solid var(--border-accent);
          border-radius: 12px;
          background: var(--bg-primary);
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .override-toggle:hover {
          border-color: var(--blue);
        }

      `}</style>

      <div className="uber-layout">
        
        {/* Full Screen Map Background */}
        <div className="map-background">
          <MapView 
            hospitals={phase === 'recommendations' ? hospitals : []} 
            pickupCoords={overrideLocation && manualCoords.lat ? {lat: Number(manualCoords.lat), lon: Number(manualCoords.lon)} : location} 
            requestStatus={phase === 'result' ? 'Dispatched' : 'Pending'}
            selectedHospitalId={selectedHospitalId}
            onHospitalClick={(h) => setSelectedHospitalId(h.hospital_id)}
            isDraggable={overrideLocation}
            onPickupDrag={overrideLocation ? (c) => setManualCoords({ lat: c.lat, lon: c.lon }) : null}
          />
        </div>

        {/* Floating Top Indicator */}
        <div className="floating-top-card">
          <div className={`gps-badge ${overrideLocation ? 'gps-locked' : location ? (locationSource === 'gps' ? 'gps-locked' : 'gps-searching') : (gpsLoading ? 'gps-searching' : 'gps-error')}`} style={{ background: 'transparent', border: 'none', padding: 0 }}>
            {gpsLoading && !overrideLocation ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
            {overrideLocation && manualCoords.lat 
              ? `MANUAL • ${Number(manualCoords.lat).toFixed(4)}, ${Number(manualCoords.lon).toFixed(4)}` 
              : gpsLoading 
                ? 'Acquiring GPS...' 
                : location 
                  ? `${locationSource.toUpperCase()} • ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` 
                  : 'Location Unavailable'}
          </div>
        </div>

        {/* Floating Bottom Interaction Card */}
        <div className="floating-bottom-card">
          
          {phase === 'ready' && (
            <>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Emergency SOS</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tap the button below to summon an ambulance immediately.</p>
              </div>

              <div className="severity-row">
                {Object.keys(INCIDENT_TYPES).map(type => (
                  <div key={type} className={`sev-pill ${incidentType === type ? `active-${INCIDENT_TYPES[type]}` : ''}`} onClick={() => setIncidentType(type)} style={{ padding: '8px 14px', fontSize: 12 }}>
                    {type}
                  </div>
                ))}
              </div>

              <div className="quick-field-grid">
                <input
                  className="form-input"
                  style={{ height: 42, fontSize: 13, background: 'var(--bg-primary)', border: '1px solid var(--border-accent)', borderRadius: 12, padding: '0 14px', fontWeight: 600, color: 'var(--text-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                  value={requestFor}
                  onChange={e => setRequestFor(e.target.value)}
                  placeholder="Self / family member"
                />
                <select
                  className="form-input form-select"
                  style={{ height: 42, fontSize: 13, background: 'var(--bg-primary)', border: '1px solid var(--border-accent)', borderRadius: 12, padding: '0 14px', fontWeight: 600, color: 'var(--text-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                  value={severity}
                  onChange={e => setSeverity(e.target.value)}
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <div style={{ gridColumn: '1 / -1' }}>
                  <input
                    className="form-input"
                    list="patient-zones"
                    style={{ height: 42, width: '100%', fontSize: 13, background: 'var(--bg-primary)', border: '1px solid var(--border-accent)', borderRadius: 12, padding: '0 14px', fontWeight: 600, color: 'var(--text-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    value={selectedZone}
                    onChange={e => setSelectedZone(e.target.value)}
                    placeholder="Search or select your Zone/Location"
                  />
                  <datalist id="patient-zones">
                    {zones.map(z => (
                      <option key={z.zone_id} value={z.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <button type="button" className="override-toggle" onClick={() => {
                if (!overrideLocation && location) {
                  setManualCoords({ lat: location.lat, lon: location.lon });
                }
                setOverrideLocation(!overrideLocation);
              }}>
                <span>Request for another location</span>
                <span style={{ color: overrideLocation ? 'var(--blue)' : 'var(--text-muted)' }}>{overrideLocation ? 'ON' : 'OFF'}</span>
              </button>

              {overrideLocation && (
                <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 12, border: '1px solid var(--border-accent)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  👆 Drag the <span style={{color: 'var(--red)'}}>red emergency pin</span> on the map to set your exact pickup location.
                </div>
              )}

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px 0' }}>
                <div className="sos-ring ring-1" style={{ width: 180, height: 180 }} />
                <div className="sos-ring ring-2" style={{ width: 220, height: 220 }} />
                <button className="sos-btn" onClick={triggerSOS} style={{ width: 140, height: 140, fontSize: 22, cursor: 'pointer' }}>
                  <Siren size={36} /> SOS
                </button>
              </div>
              {locationError && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: -10 }}>{locationError}</p>}
            </>
          )}

          {phase === 'loading_recs' && (
            <div className="dispatch-overlay" style={{ padding: '40px 0' }}>
              <div className="dispatch-spinner" style={{ width: 80, height: 80, borderWidth: 3 }} />
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Analyzing Situation...</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>Finding the best hospital for your condition.</p>
            </div>
          )}

          {phase === 'recommendations' && (
            <div style={{ width: '100%' }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12, textAlign: 'center' }}>Select Destination</h3>
              <div className="hospital-list-container">
                <div className="hospital-list">
                  {hospitals.map((h) => (
                    <div key={h.hospital_id} 
                      className={`hospital-item ${h.spec_match ? 'best-match' : ''}`} 
                      onClick={() => {
                        if (selectedHospitalId === h.hospital_id) {
                          confirmDispatch(h.hospital_id);
                        } else {
                          setSelectedHospitalId(h.hospital_id);
                        }
                      }} 
                      style={{ 
                        padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 12,
                        borderColor: selectedHospitalId === h.hospital_id ? 'var(--blue)' : 'var(--border-subtle)',
                        background: selectedHospitalId === h.hospital_id ? 'var(--bg-primary)' : 'var(--bg-card)',
                        boxShadow: selectedHospitalId === h.hospital_id ? '0 4px 16px rgba(10,132,255,0.1)' : 'none'
                      }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 900, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <span>{h.name}</span>
                          {h.type === "Government" && <span style={{ fontSize: 9, background: "rgba(191,90,242,0.1)", color: "var(--purple)", padding: "2px 6px", borderRadius: 4, fontWeight: 900, border: "1px solid rgba(191,90,242,0.2)" }}>🏛️ GOVT</span>}
                          {h.type === "Private" && <span style={{ fontSize: 9, background: "rgba(10,132,255,0.1)", color: "var(--blue)", padding: "2px 6px", borderRadius: 4, fontWeight: 900, border: "1px solid rgba(10,132,255,0.2)" }}>🏥 PRIVATE</span>}
                          {h.spec_match && <span style={{ fontSize: 9, background: 'var(--green-dim)', color: 'var(--green)', padding: '2px 6px', borderRadius: 4, fontWeight: 900, border: '1px solid rgba(0,255,136,0.2)' }}>MATCHED</span>}
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '8px 0' }}>
                          {h.specializations?.slice(0, 3).map(s => (
                            <span key={s} style={{ fontSize: 10, background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-accent)', fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>{s}</span>
                          ))}
                        </div>
                        
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, display: 'flex', gap: 12 }}>
                          <span>🛏️ General: <span style={{ color: h.general_beds > 0 ? "var(--green)" : "var(--red)" }}>{h.general_beds}</span></span>
                          <span>❤️ ICU: <span style={{ color: h.icu_beds > 0 ? "var(--green)" : "var(--red)" }}>{h.icu_beds}</span></span>
                        </div>
  
                        <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Navigation size={12} /> {h.distance_km} km</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {h.eta_minutes} min</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--yellow)", fontWeight: 800 }}>৳{h.estimated_fare}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <ChevronRight size={18} style={{ color: selectedHospitalId === h.hospital_id ? 'var(--blue)' : 'var(--text-muted)' }} />
                        {selectedHospitalId === h.hospital_id && <span style={{ fontSize: 8, fontWeight: 800, color: 'var(--blue)' }}>CONFIRM</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button style={{ width: '100%', marginTop: 12, height: 44, fontSize: 13, fontWeight: 700, borderRadius: 12, background: 'var(--bg-primary)', color: 'var(--red)', border: '1px solid rgba(255, 45, 85, 0.3)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer' }} onClick={() => setPhase('ready')}>Cancel Request</button>
            </div>
          )}

          {phase === 'dispatching' && (
            <div className="dispatch-overlay" style={{ padding: '40px 0' }}>
              <div className="dispatch-spinner" style={{ width: 80, height: 80, borderWidth: 3 }} />
              <div className="dispatch-timer" style={{ fontSize: 32 }}>{dispatchTimer}s</div>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Dispatching Ambulance...</h3>
            </div>
          )}

          {phase === 'result' && result && (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(48,209,88,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={24} style={{ color: 'var(--green)' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--green)' }}>Dispatched!</h2>
                  <p style={{ color: "var(--text-muted)", fontSize: 12 }}>Request #{result.request_id} • ৳{result.estimated_fare}</p>
                </div>
              </div>

              <div className="result-grid">
                <div className="result-card" style={{ padding: 12, borderColor: 'rgba(48,209,88,0.3)', background: 'rgba(48,209,88,0.04)' }}>
                  <span className="result-card-label"><Clock size={12} /> ETA</span>
                  <span className="result-card-value" style={{ fontSize: 18 }}>{result.eta_minutes} min</span>
                </div>
                <div className="result-card" style={{ padding: 12 }}>
                  <span className="result-card-label"><Building2 size={12} /> Hospital</span>
                  <span className="result-card-value" style={{ fontSize: 14 }}>{result.nearest_hospital}</span>
                </div>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', height: 48, borderRadius: 12, fontSize: 14, fontWeight: 800, marginTop: 16 }} onClick={() => window.location.href = '/track'}>
                <Radio size={16} /> GO TO LIVE TRACKING
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
