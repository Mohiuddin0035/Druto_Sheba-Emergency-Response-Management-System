"use client";

import { useState, Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Lock, User, AlertCircle, Loader2, HeartPulse, ShieldAlert, 
  ArrowRight, Home, KeyRound, PhoneCall, AlertTriangle, CheckCircle2,
  Volume2, VolumeX, Phone, Droplet, Eye, EyeOff, Navigation, Truck,
  Fingerprint, Sparkles
} from 'lucide-react';
import Link from 'next/link';

function AuthPortalForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portalParam = searchParams.get('portal') || 'patient'; // Default to patient login
  const registered = searchParams.get('registered');
  const prefillId = searchParams.get('id');

  const modeParam = searchParams.get('mode');
  const isDriver = portalParam === 'driver';
  const isDispatcher = portalParam === 'dispatcher';
  const isAdmin = portalParam === 'admin';
  const isPatient = !isDriver && !isDispatcher && !isAdmin;

  // Active view: 'login' or 'register' (Admin cannot register online)
  const [viewMode, setViewMode] = useState(isAdmin ? 'login' : (modeParam === 'register' ? 'register' : 'login'));

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Login States
  const [authMode, setAuthMode] = useState('password'); // 'password' or 'emergency_pin'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);
  
  // 4-digit emergency PIN array
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const pinInputRefs = useRef([]);

  // Real-time emergency quota status state
  const [quotaData, setQuotaData] = useState(null);
  const [isCheckingQuota, setIsCheckingQuota] = useState(false);

  // Fingerprint / Biometric States
  const [regBiometricId, setRegBiometricId] = useState(null);
  const [isEnrollingBiometric, setIsEnrollingBiometric] = useState(false);
  const [isAuthenticatingBiometric, setIsAuthenticatingBiometric] = useState(false);

  // Register States
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBloodType, setRegBloodType] = useState('O+');
  const [regLicenseNo, setRegLicenseNo] = useState('');
  const [regNidNumber, setRegNidNumber] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmergencyPin, setRegEmergencyPin] = useState('');
  const [regEmail, setRegEmail] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Modal state when emergency quota > 3 is reached
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaAdminPhone, setQuotaAdminPhone] = useState('+999-01711-EMERGENCY');

  // Sync with site-wide active theme from document / localStorage
  useEffect(() => {
    const checkTheme = () => {
      const active = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark';
      setCurrentTheme(active);
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Auto-populate from registration redirect
  useEffect(() => {
    if (prefillId) {
      setIdentifier(prefillId);
    }
    if (registered) {
      setSuccessMsg('Account created successfully! Please sign in with your password or 4-digit Emergency PIN.');
    }
  }, [prefillId, registered]);

  // Check if already authenticated (skip if just registered so user can sign in)
  useEffect(() => {
    if (registered) {
      setIsCheckingAuth(false);
      return;
    }

    if (isPatient) {
      fetch('/api/auth/patient/me', { cache: 'no-store' })
        .then(async (res) => {
          if (!res.ok) {
            setIsCheckingAuth(false);
            return;
          }
          const data = await res.json();
          if (data.authenticated && data.patient) {
            router.replace('/sos');
          } else {
            setIsCheckingAuth(false);
          }
        })
        .catch(() => setIsCheckingAuth(false));
    } else if (isDriver) {
      fetch('/api/auth/driver/me', { cache: 'no-store' })
        .then(async (res) => {
          if (!res.ok) {
            setIsCheckingAuth(false);
            return;
          }
          const data = await res.json();
          if (data.authenticated && data.driver) {
            router.replace('/duty');
          } else {
            setIsCheckingAuth(false);
          }
        })
        .catch(() => setIsCheckingAuth(false));
    } else if (isDispatcher) {
      fetch('/api/auth/me?portal=dispatcher', { cache: 'no-store' })
        .then(async (res) => {
          if (!res.ok) {
            setIsCheckingAuth(false);
            return;
          }
          const data = await res.json();
          if (data && data.username && data.role === 'Dispatcher') {
            router.replace('/dashboard');
          } else {
            setIsCheckingAuth(false);
          }
        })
        .catch(() => setIsCheckingAuth(false));
    } else if (portalParam === 'admin') {
      fetch('/api/auth/me?portal=admin', { cache: 'no-store' })
        .then(async (res) => {
          if (!res.ok) {
            setIsCheckingAuth(false);
            return;
          }
          const data = await res.json();
          if (data && data.username && data.role && data.role.toLowerCase().includes('admin')) {
            router.replace('/control');
          } else {
            setIsCheckingAuth(false);
          }
        })
        .catch(() => setIsCheckingAuth(false));
    } else {
      setIsCheckingAuth(false);
    }
  }, [isPatient, isDriver, isDispatcher, portalParam, router, registered]);

  // Real-time quota lookup when user types their username or phone number
  useEffect(() => {
    const clean = identifier.trim();
    if (clean.length < 3) {
      setQuotaData(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingQuota(true);
      try {
        const res = await fetch(`/api/auth/patient/emergency-quota?identifier=${encodeURIComponent(clean)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.found) {
            setQuotaData(data);
          } else {
            setQuotaData(null);
          }
        }
      } catch (err) {
        console.warn('Quota check error:', err);
      } finally {
        setIsCheckingQuota(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [identifier]);

  // Auto-play video on mount if available
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  // 3D Origami folding state: 'idle' | 'folding-out' | 'folding-in'
  const [foldPhase, setFoldPhase] = useState('folding-in'); // Starts with smooth fold-in on mount

  // Smooth switch between Login and Register with 3D folding door/origami animation
  const switchView = (targetView) => {
    if (targetView === viewMode || foldPhase === 'folding-out') return;
    setError('');
    setSuccessMsg('');
    
    // Step 1: 3D Fold out and close current card
    setFoldPhase('folding-out');
    
    setTimeout(() => {
      // Step 2: Swap form view in background
      setViewMode(targetView);
      // Step 3: 3D Unfold in with new form
      setFoldPhase('folding-in');
    }, 360);
  };

  // Handle 4-digit PIN input box typing and backspacing
  const handlePinChange = (index, value) => {
    if (!value) {
      const updated = [...pinDigits];
      updated[index] = '';
      setPinDigits(updated);
      return;
    }

    const char = value.slice(-1);
    const updated = [...pinDigits];
    updated[index] = char;
    setPinDigits(updated);

    if (index < 3 && char) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().slice(0, 4);
    if (pasted) {
      const updated = [...pinDigits];
      for (let i = 0; i < 4; i++) {
        updated[i] = pasted[i] || '';
      }
      setPinDigits(updated);
      const nextFocus = Math.min(pasted.length, 3);
      pinInputRefs.current[nextFocus]?.focus();
    }
  };

  // -------------------------------------------------------------------------
  // Biometric / Fingerprint Handlers (Patient Only - True 1-Tap Biometric Scan)
  // -------------------------------------------------------------------------
  
  // Modal state when unregistered fingerprint is scanned
  const [showBioNotRegisteredModal, setShowBioNotRegisteredModal] = useState(false);
  const [bioScanningProgress, setBioScanningProgress] = useState(false);

  // Helper to request real fingerprint scan from device sensor (WebAuthn / Windows Hello / TouchID)
  const performHardwareFingerprintScan = async () => {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      throw new Error('Biometric hardware / WebAuthn is not supported on this browser.');
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // Call native platform authenticator (triggers Windows Hello fingerprint prompt)
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: "required", // Forces device biometric prompt (fingerprint sensor)
        rpId: window.location.hostname
      }
    });

    if (assertion && assertion.id) {
      return 'webauthn_fp_' + assertion.id;
    }

    throw new Error('Biometric recognition failed or was cancelled.');
  };

  // Enroll fingerprint during registration (Strict Hardware Verification - Zero Fallback on Cancel)
  const handleEnrollFingerprint = async () => {
    setIsEnrollingBiometric(true);
    setError('');
    try {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        throw new Error('Biometric hardware / WebAuthn is not supported on this browser.');
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Druto Sheba Emergency Network", id: window.location.hostname },
          user: {
            id: userId,
            name: regPhone || regUsername || "patient_" + Date.now(),
            displayName: regName || "Emergency Patient"
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },  // ES256
            { alg: -257, type: "public-key" } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform", // Enforces built-in fingerprint reader / Windows Hello
            userVerification: "required"         // Enforces actual biometric touch
          },
          timeout: 60000,
          attestation: "none"
        }
      });

      if (!credential || !credential.id) {
        throw new Error('Biometric registration was cancelled or no sensor response.');
      }

      const bioId = 'webauthn_fp_' + credential.id;

      setRegBiometricId(bioId);
      // Save local reference only when sensor successfully verifies!
      localStorage.setItem('druto_sheba_registered_fingerprint', bioId);
      setSuccessMsg('Fingerprint sensor verified & linked successfully!');
    } catch (err) {
      // User pressed Cancel or finger failed in Windows Hello prompt
      setRegBiometricId(null);
      localStorage.removeItem('druto_sheba_registered_fingerprint');
      
      if (err.name === 'NotAllowedError') {
        setError('Fingerprint verification cancelled or recognition failed. Sensor not linked.');
      } else {
        setError(err.message || 'Biometric sensor error. Fingerprint not linked.');
      }
    } finally {
      setIsEnrollingBiometric(false);
    }
  };

  // TRUE 1-TAP FINGERPRINT LOGIN (Zero Username Needed!)
  const handleBiometricLogin = async () => {
    setIsAuthenticatingBiometric(true);
    setBioScanningProgress(true);
    setError('');

    try {
      // 1. Trigger Fingerprint Sensor Scan (Windows Hello / Touch ID / Sensor Verification)
      let scannedBioId = null;
      try {
        scannedBioId = await performHardwareFingerprintScan();
      } catch (scanErr) {
        setError(scanErr.message || 'Biometric scan was cancelled.');
        setIsAuthenticatingBiometric(false);
        setBioScanningProgress(false);
        return;
      }

      // Simulated scan animation delay so user visually feels the biometric sensor read
      await new Promise(r => setTimeout(r, 900));

      if (!scannedBioId) {
        // Pop-up warning: User didn't register fingerprint on our portal
        setShowBioNotRegisteredModal(true);
        setIsAuthenticatingBiometric(false);
        setBioScanningProgress(false);
        return;
      }

      // 2. Send scanned fingerprint credential ID directly to backend (backend matches uniquely in database)
      const res = await fetch('/api/auth/patient/biometric-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential_id: scannedBioId,
          patient_id: quotaData?.patientId || undefined,
          identifier: identifier.trim() || undefined,
          device_id: 'browser-bio-' + window.navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
        })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('emergency_active_patient', String(data.patient.id));
        setSuccessMsg(`Welcome back, ${data.patient.name}! Unlocking emergency terminal...`);
        setTimeout(() => {
          router.push('/sos');
          router.refresh();
        }, 500);
      } else {
        // If database doesn't recognize this fingerprint
        setShowBioNotRegisteredModal(true);
      }
    } catch (err) {
      setError('Biometric sensor error. Please check your hardware or use password / 4-digit PIN.');
    } finally {
      setIsAuthenticatingBiometric(false);
      setBioScanningProgress(false);
    }
  };

  // Standard Login (Password)
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isPatient) {
        const res = await fetch('/api/auth/patient/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier,
            password,
            device_id: 'browser-' + window.navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
          }),
        });

        const data = await res.json();

        if (res.ok) {
          localStorage.setItem('emergency_active_patient', String(data.patient.id));
          router.push('/sos');
          router.refresh();
        } else {
          setError(data.error || 'Invalid username/phone or password');
        }
      } else if (isDriver) {
        const res = await fetch('/api/auth/driver/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier,
            password,
            device_id: 'browser-' + window.navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
          }),
        });

        const data = await res.json();

        if (res.ok) {
          localStorage.setItem('emergency_active_driver', String(data.driver.id));
          router.push('/duty');
          router.refresh();
        } else {
          setError(data.error || 'Invalid username, phone, license, or password');
        }
      } else {
        const res = await fetch(`/api/auth/login?portal=${portalParam}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: identifier.trim(), 
            password: password.trim() 
          }),
        });

        const data = await res.json();

        if (res.ok) {
          const staffId = data.userId || data.user?.dispatcher_id || data.user?.id || data.user?.user_id;
          if (staffId) {
            localStorage.setItem('emergency_staff_user', String(staffId));
            sessionStorage.setItem('staff_session_active', 'true');
          }
          if (data.role && data.role.toLowerCase().includes('admin')) router.push('/control');
          else router.push('/dashboard');
        } else {
          setError(data.error || 'Staff authentication failed');
        }
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Emergency 4-Digit PIN Login
  const handleEmergencyPinLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const pin = pinDigits.join('');
    if (pin.length !== 4) {
      setError('Please fill in all 4 digits of your emergency secret PIN.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/patient/emergency-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          pin,
          device_id: 'browser-emergency-' + window.navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('emergency_active_patient', String(data.patient.id));
        router.push('/sos');
        router.refresh();
      } else if (res.status === 429 || data.quotaExceeded) {
        setQuotaAdminPhone(data.adminContact || '+999-01711-EMERGENCY');
        setShowQuotaModal(true);
      } else {
        setError(data.error || 'Invalid 4-digit emergency PIN or phone number');
      }
    } catch (err) {
      setError('A network error occurred during emergency verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Registration Handler
  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isDriver) {
        const res = await fetch('/api/auth/driver/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: regName,
            phone: regPhone,
            username: regUsername || undefined,
            password: regPassword,
            device_id: 'browser-driver-' + window.navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
          }),
        });

        const data = await res.json();

        if (res.ok) {
          localStorage.setItem('emergency_active_driver', String(data.driver.id));
          // Redirect directly into Driver Duty Console where qualification verification is ready
          router.push('/duty');
          router.refresh();
        } else {
          setError(data.error || 'Driver registration failed');
        }
      } else if (isDispatcher) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: regName,
            phone: regPhone,
            username: regUsername || undefined,
            password: regPassword,
            email: regEmail,
            role: 'Dispatcher'
          }),
        });

        const data = await res.json();

        if (res.ok) {
          const dispId = data.user?.dispatcher_id || data.user?.id || data.userId || data.user?.User_ID;
          if (dispId) {
            localStorage.setItem('emergency_staff_user', String(dispId));
            sessionStorage.setItem('staff_session_active', 'true');
          }
          // Redirect directly into Dispatcher Dashboard where qualification verification application is presented
          router.push('/dashboard');
          router.refresh();
        } else {
          setError(data.error || 'Dispatcher registration failed');
        }
      } else {
        const res = await fetch('/api/auth/patient/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: regName,
            phone: regPhone,
            blood_type: regBloodType,
            username: regUsername || undefined,
            password: regPassword,
            emergency_pin: regEmergencyPin.trim() || undefined,
            biometric_credential_id: regBiometricId || undefined,
            device_id: 'browser-' + window.navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setSuccessMsg('Account created successfully! Please sign in with your password or 4-digit PIN.');
          setIdentifier(data.patient?.username || regPhone);
          switchView('login');
        } else {
          setError(data.error || 'Registration failed');
        }
      }
    } catch (err) {
      setError('An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary, #060813)',
        color: 'var(--text-primary, #ffffff)',
        gap: 16
      }}>
        <div className="spinner" style={{ width: 36, height: 36, borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'var(--blue, #0070f3)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 13, color: 'var(--text-secondary, #888)', letterSpacing: 0.5 }}>Verifying session...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '24px', 
      position: 'relative',
      overflow: 'hidden',
    }}>
      
      {/* 1. Background Video (Natural Original Colors, Zero Distorting Filter) */}
      <video
        key={isDriver ? 'driver-video' : 'patient-video'}
        ref={videoRef}
        autoPlay
        loop
        muted={isMuted}
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
          filter: 'none', // Preserves exact video quality & colors
        }}
      >
        {isAdmin && <source src="/admin_bg.mp4" type="video/mp4" />}
        {isDispatcher && <source src="/dispatcher_bg.mp4" type="video/mp4" />}
        {isDriver && <source src="/driver_bg.mp4" type="video/mp4" />}
        <source src="/emergency_bg.mp4" type="video/mp4" />
      </video>

      {/* 2. Floating Audio Mute / Unmute Button (Bottom Right) */}
      <button
        type="button"
        onClick={() => {
          if (videoRef.current) {
            const nextMuted = !isMuted;
            videoRef.current.muted = nextMuted;
            if (!nextMuted) {
              videoRef.current.play().catch(() => {});
            }
            setIsMuted(nextMuted);
          }
        }}
        title={isMuted ? "Unmute Emergency Sound" : "Mute Sound"}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          zIndex: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderRadius: '30px',
          background: 'rgba(15, 17, 28, 0.7)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: isMuted ? 'rgba(255, 255, 255, 0.7)' : '#00ff88',
          fontSize: '12px',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.4)',
          transition: 'all 0.25s ease'
        }}
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        <span>{isMuted ? 'Audio Muted' : 'Sound Playing'}</span>
      </button>

      {/* 3. True Refractive Liquid Glass (liquidGL) Auth Plate with 3D Origami Folding */}
      <div 
        className={`liquid-glass-plate ${foldPhase === 'folding-out' ? 'liquid-card-fold-out' : 'liquid-card-fold-in'}`}
        onAnimationEnd={() => {
          if (foldPhase === 'folding-in') setFoldPhase('idle');
        }}
        style={{ 
          width: '100%', 
          maxWidth: viewMode === 'register' ? '480px' : '440px', 
          padding: '36px', 
          position: 'relative', 
          zIndex: 10,
        }}
      >
        
        {/* Top Header: Back to Home Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '700',
              padding: '7px 14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.3)',
              transition: 'all 0.2s'
            }}
          >
            <Home size={14} /> Back to Home
          </Link>

          {isPatient ? (
            <span style={{ 
              fontSize: '11px', 
              fontWeight: '800', 
              color: authMode === 'emergency_pin' && viewMode === 'login' ? '#ff9f0a' : 'var(--red)',
              background: authMode === 'emergency_pin' && viewMode === 'login' ? 'rgba(255, 159, 10, 0.18)' : 'rgba(255, 45, 85, 0.18)',
              padding: '6px 10px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              letterSpacing: '0.4px'
            }}>
              {viewMode === 'register' ? '📝 New Patient' : (authMode === 'emergency_pin' ? '⚡ 4-Digit PIN' : '🔒 Patient Portal')}
            </span>
          ) : isDriver ? (
            <span style={{ 
              fontSize: '11px', 
              fontWeight: '800', 
              color: '#ff9f0a',
              background: 'rgba(255, 159, 10, 0.18)',
              padding: '6px 10px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 159, 10, 0.35)',
              backdropFilter: 'blur(10px)',
              letterSpacing: '0.4px'
            }}>
              🚑 Ambulance Driver Portal
            </span>
          ) : (
            <span style={{ 
              fontSize: '11px', 
              fontWeight: '800', 
              color: '#00f0ff',
              background: 'rgba(0, 240, 255, 0.18)',
              padding: '6px 10px',
              borderRadius: '10px',
              border: '1px solid rgba(0, 240, 255, 0.35)',
              backdropFilter: 'blur(10px)',
              letterSpacing: '0.4px'
            }}>
              {isAdmin ? '🏛️ Executive Board of Trustees' : `🛡️ ${portalParam.toUpperCase()} Access`}
            </span>
          )}
        </div>

        {/* Portal Title & Medical Icon */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: viewMode === 'register'
              ? 'linear-gradient(135deg, rgba(255, 113, 133, 0.4), rgba(255, 0, 85, 0.2))'
              : (authMode === 'biometric'
                ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.4), rgba(16, 185, 129, 0.2))'
                : (authMode === 'emergency_pin' 
                  ? 'linear-gradient(135deg, rgba(253, 224, 71, 0.4), rgba(245, 158, 11, 0.2))' 
                  : (isDriver 
                    ? 'linear-gradient(135deg, rgba(255, 159, 10, 0.4), rgba(217, 119, 6, 0.2))' 
                    : (isAdmin
                      ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.4), rgba(14, 165, 233, 0.2))'
                      : (isPatient ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.4), rgba(14, 165, 233, 0.2))' : 'linear-gradient(135deg, rgba(56, 189, 248, 0.4), rgba(14, 165, 233, 0.2))'))))),
            color: viewMode === 'register' ? '#fda4af' : (authMode === 'biometric' ? '#00ff88' : (authMode === 'emergency_pin' ? '#fef08a' : (isDriver ? '#fde047' : '#7dd3fc'))),
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 8,
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.7)',
            transition: 'all 0.3s ease'
          }}>
            {viewMode === 'register' ? (
              <HeartPulse size={24} />
            ) : authMode === 'biometric' ? (
              <Fingerprint size={24} />
            ) : authMode === 'emergency_pin' ? (
              <KeyRound size={24} />
            ) : isDriver ? (
              <Navigation size={24} />
            ) : isPatient ? (
              <HeartPulse size={24} />
            ) : (
              <ShieldAlert size={24} />
            )}
          </div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '900', 
            marginBottom: '3px', 
            letterSpacing: '-0.3px',
            color: '#ffffff',
            textShadow: '0 2px 14px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 255, 255, 0.3)'
          }}>
            {viewMode === 'register' 
              ? (isDriver ? 'Driver Registration' : 'Patient Registration') 
              : (isDriver ? 'Driver Duty Terminal' : (isAdmin ? 'Admin Board Terminal' : 'Druto Sheba'))}
          </h1>
          <p style={{ 
            color: '#bae6fd', 
            fontSize: '12.5px', 
            fontWeight: 600,
            textShadow: '0 1px 6px rgba(0, 0, 0, 0.8)'
          }}>
            {viewMode === 'register' 
              ? (isDriver ? 'Create your ambulance driver account (Quick Signup)' : 'Create your emergency health profile & 4-digit PIN')
              : (authMode === 'biometric'
                ? '👆 1-Tap Biometric Fingerprint Verification'
                : (authMode === 'emergency_pin' 
                  ? '⚡ Instant 4-Digit Secret PIN Login' 
                  : (isDriver 
                    ? 'Authorized Ambulance Crew & Shift Check-In' 
                    : (isAdmin
                      ? '🔑 Secured 9-Digit Owner Complex Key Authentication'
                      : (isPatient ? 'Patient Emergency Access Portal' : `${portalParam.toUpperCase()} Control Terminal`)))))}
          </p>
        </div>

        {/* Tab Selector for Login: Standard Password vs Emergency PIN vs Fingerprint (Only in Login mode for Patient) */}
        {viewMode === 'login' && isPatient && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1.15fr', 
            gap: 6, 
            background: 'rgba(10, 15, 30, 0.45)', 
            padding: 4, 
            borderRadius: 14, 
            marginBottom: 16,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(16px)'
          }}>
            <button
              type="button"
              onClick={() => { setAuthMode('password'); setError(''); }}
              style={{
                padding: '8px 6px',
                borderRadius: 10,
                border: 'none',
                background: authMode === 'password' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.35), rgba(14, 165, 233, 0.2))' : 'transparent',
                color: authMode === 'password' ? '#e0f2fe' : 'rgba(255, 255, 255, 0.65)',
                fontWeight: 800,
                fontSize: 11,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                textShadow: authMode === 'password' ? '0 0 10px rgba(56, 189, 248, 0.6)' : 'none',
                boxShadow: authMode === 'password' ? '0 2px 8px rgba(56, 189, 248, 0.3)' : 'none'
              }}
            >
              <Lock size={12} /> Password
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('emergency_pin'); setError(''); }}
              style={{
                padding: '8px 6px',
                borderRadius: 10,
                border: 'none',
                background: authMode === 'emergency_pin' ? 'linear-gradient(135deg, rgba(253, 224, 71, 0.35), rgba(245, 158, 11, 0.25))' : 'transparent',
                color: authMode === 'emergency_pin' ? '#fef08a' : 'rgba(255, 255, 255, 0.65)',
                fontWeight: 800,
                fontSize: 11,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                textShadow: authMode === 'emergency_pin' ? '0 0 10px rgba(250, 204, 21, 0.6)' : 'none',
                boxShadow: authMode === 'emergency_pin' ? '0 2px 8px rgba(250, 204, 21, 0.3)' : 'none'
              }}
            >
              <KeyRound size={12} /> 4-Digit PIN
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('biometric'); setError(''); }}
              style={{
                padding: '8px 6px',
                borderRadius: 10,
                border: 'none',
                background: authMode === 'biometric' ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.35), rgba(16, 185, 129, 0.25))' : 'transparent',
                color: authMode === 'biometric' ? '#00ff88' : 'rgba(255, 255, 255, 0.65)',
                fontWeight: 800,
                fontSize: 11,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                textShadow: authMode === 'biometric' ? '0 0 10px rgba(52, 199, 89, 0.6)' : 'none',
                boxShadow: authMode === 'biometric' ? '0 2px 8px rgba(52, 199, 89, 0.3)' : 'none'
              }}
            >
              <Fingerprint size={12} /> Fingerprint
              <span style={{
                fontSize: '8.5px',
                fontWeight: 900,
                letterSpacing: '0.4px',
                padding: '1px 5px',
                borderRadius: '4px',
                background: authMode === 'biometric' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 255, 255, 0.12)',
                color: authMode === 'biometric' ? '#00ff88' : 'rgba(255, 255, 255, 0.7)',
                border: authMode === 'biometric' ? '1px solid rgba(0, 255, 136, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
                lineHeight: 1
              }}>
                BETA
              </span>
            </button>
          </div>
        )}

        {/* Feedback Messages */}
        {successMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(52, 199, 89, 0.2)', color: '#00ff88', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(52, 199, 89, 0.4)', marginBottom: '18px', backdropFilter: 'blur(12px)' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: '700' }}>{successMsg}</span>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 45, 85, 0.2)', color: '#ff4d6d', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(255, 45, 85, 0.4)', marginBottom: '18px', backdropFilter: 'blur(12px)' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: '700' }}>{error}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: LOGIN FORMS (PASSWORD OR EMERGENCY PIN)                            */}
        {/* ========================================================================= */}
        {viewMode === 'login' ? (
          authMode === 'password' ? (
            /* Standard Password Form */
            <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="liquid-glass-label">
                  {isPatient ? 'Username or Phone Number' : isDriver ? 'Username, Phone, or License No' : isAdmin ? 'Admin Official Username' : 'Staff Username'}
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: isDriver ? '#fde047' : isAdmin ? '#00f0ff' : '#ffffff', opacity: 0.85 }}>
                    {isDriver ? <Truck size={18} /> : <User size={18} />}
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="form-input liquid-glass-input"
                    style={{ paddingLeft: '42px', height: '46px', borderRadius: '14px', fontSize: '14px' }}
                    placeholder={isPatient ? 'e.g. sohan1 or 01811000001' : isDriver ? 'e.g. karim1, 01711000001, or LIC42254' : isAdmin ? 'e.g. admin_chairperson' : 'Enter staff username'}
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="liquid-glass-label" style={{ margin: 0 }}>
                    {isAdmin ? '9-Digit Complex Security Key' : 'Password (8+ Chars)'}
                  </label>
                  {isAdmin && (
                    <span style={{ fontSize: '11px', color: '#00f0ff', fontWeight: 800 }}>
                      Issued by Owners
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: isAdmin ? '#00f0ff' : '#ffffff', opacity: 0.8 }}>
                    {isAdmin ? <KeyRound size={18} /> : <Lock size={18} />}
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    maxLength={isAdmin ? 12 : undefined}
                    value={password}
                    onChange={(e) => setPassword(isAdmin ? e.target.value.toUpperCase().replace(/\s/g, '') : e.target.value)}
                    className="form-input liquid-glass-input"
                    style={{ 
                      paddingLeft: '42px', 
                      paddingRight: '44px', 
                      height: '46px', 
                      borderRadius: '14px', 
                      fontSize: '14px',
                      letterSpacing: isAdmin ? '2.5px' : 'normal',
                      fontFamily: isAdmin ? 'monospace' : 'inherit',
                      fontWeight: isAdmin ? '700' : 'normal'
                    }}
                    placeholder={isAdmin ? "e.g. 8TH5PV4VC" : "Enter your 8+ character password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: showPassword ? (isDriver ? '#f59e0b' : isAdmin ? '#00f0ff' : '#ff0055') : 'rgba(255, 255, 255, 0.7)',
                      background: 'none',
                      border: 'none',
                      padding: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.2s'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {isAdmin && (
                <div style={{ 
                  padding: '9px 12px', 
                  borderRadius: '10px', 
                  background: 'rgba(0, 240, 255, 0.1)', 
                  border: '1px solid rgba(0, 240, 255, 0.25)', 
                  fontSize: '11px', 
                  color: '#67e8f9', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6, 
                  backdropFilter: 'blur(8px)' 
                }}>
                  🔒 <strong>Board Credential:</strong> Requires 9-digit alphanumeric executive key issued by company founders.
                </div>
              )}

              {isPatient && (
                <div style={{ 
                  padding: '9px 12px', 
                  borderRadius: '10px', 
                  background: 'rgba(52, 199, 89, 0.12)', 
                  border: '1px solid rgba(52, 199, 89, 0.3)', 
                  fontSize: '11px', 
                  color: '#00ff88', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6, 
                  backdropFilter: 'blur(8px)' 
                }}>
                  🔒 <strong>Lifetime Access:</strong> Stays logged in indefinitely unless you login on another device.
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{ 
                  width: '100%', 
                  height: '46px',
                  borderRadius: '14px',
                  fontSize: '14px', 
                  fontWeight: 800,
                  background: isPatient 
                    ? 'linear-gradient(135deg, #ff0055, #c20042)' 
                    : isDriver 
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                      : 'linear-gradient(135deg, #00f0ff, #00a3cc)',
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 6,
                  boxShadow: isDriver 
                    ? '0 8px 24px rgba(245, 158, 11, 0.4), inset 0 1px 1px rgba(255,255,255,0.4)' 
                    : isPatient 
                      ? '0 8px 24px rgba(255, 0, 85, 0.4), inset 0 1px 1px rgba(255,255,255,0.4)' 
                      : '0 8px 24px rgba(0, 240, 255, 0.35), inset 0 1px 1px rgba(255,255,255,0.4)'
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Authenticating...
                  </>
                ) : (
                  <>
                    {isAdmin ? 'Verify Key & Access Terminal' : 'Sign In'} <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : authMode === 'emergency_pin' ? (
            /* Emergency 4-Digit PIN OTP Form */
            <form onSubmit={handleEmergencyPinLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="liquid-glass-label" style={{ margin: 0 }}>
                    Phone Number or Username
                  </label>
                  {isCheckingQuota && (
                    <span style={{ fontSize: '11px', color: '#ffbe53', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                      <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> checking quota...
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#ffffff', opacity: 0.8 }}>
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="form-input liquid-glass-input"
                    style={{ paddingLeft: '42px', height: '46px', borderRadius: '14px', fontSize: '14px' }}
                    placeholder="e.g. 01711000001 or sohan1"
                    autoFocus
                  />
                </div>
              </div>

              {/* Real-time Emergency Quota Badge */}
              {quotaData && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  background: quotaData.remainingCount > 0 ? 'rgba(255, 159, 10, 0.16)' : 'rgba(255, 45, 85, 0.2)',
                  border: `1px solid ${quotaData.remainingCount > 0 ? 'rgba(255, 159, 10, 0.4)' : 'rgba(255, 45, 85, 0.45)'}`,
                  backdropFilter: 'blur(12px)',
                  animation: 'fadeIn 0.25s ease'
                }}>
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: quotaData.remainingCount > 0 ? '#fef08a' : '#fda4af' }}>
                      Patient: {quotaData.patientName?.split(' ')[0]}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#bae6fd', marginTop: '1px' }}>
                      Used: <strong>{quotaData.usedCount}</strong> of {quotaData.maxAllowed}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: quotaData.remainingCount > 0 ? 'rgba(245, 158, 11, 0.85)' : 'rgba(225, 29, 72, 0.85)',
                    color: '#ffffff',
                    padding: '3px 8px',
                    borderRadius: '16px',
                    fontSize: '10.5px',
                    fontWeight: '800'
                  }}>
                    {quotaData.remainingCount > 0 ? (
                      <span>{quotaData.remainingCount} Left</span>
                    ) : (
                      <span>0 Quota (Exceeded)</span>
                    )}
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="liquid-glass-label amber" style={{ margin: 0, fontSize: '12.5px' }}>
                    Emergency Secret PIN (4 Digits)
                  </label>
                  {!quotaData && (
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#fef08a', 
                      fontWeight: 800, 
                      textShadow: '0 0 8px rgba(250, 204, 21, 0.5)' 
                    }}>
                      Max 3/Month
                    </span>
                  )}
                </div>

                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: 10, 
                    marginTop: 4 
                  }}
                  onPaste={handlePinPaste}
                >
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (pinInputRefs.current[idx] = el)}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      className="form-input liquid-glass-input"
                      style={{
                        width: '48px',
                        height: '46px',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: '900',
                        borderRadius: '12px',
                        padding: 0,
                        background: digit ? 'rgba(253, 224, 71, 0.28)' : 'rgba(15, 20, 35, 0.5)',
                        borderColor: digit ? '#fef08a' : 'rgba(255, 255, 255, 0.35)',
                        color: digit ? '#fef08a' : '#ffffff',
                        boxShadow: digit ? '0 0 14px rgba(250, 204, 21, 0.55)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Compact Note */}
              <div style={{ 
                padding: '8px 12px', 
                borderRadius: '10px', 
                background: 'rgba(254, 240, 138, 0.1)', 
                border: '1px solid rgba(254, 240, 138, 0.25)', 
                fontSize: '11px', 
                color: '#fef08a', 
                lineHeight: 1.4,
                backdropFilter: 'blur(8px)',
                textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                gap: 7
              }}>
                <span>⚡</span>
                <span><strong>Instant SOS:</strong> 4-digit PIN bypasses password for fast emergency dispatch.</span>
              </div>

              {quotaData && quotaData.remainingCount <= 0 ? (
                <button
                  type="button"
                  onClick={() => setShowQuotaModal(true)}
                  className="btn"
                  style={{ 
                    width: '100%', 
                    height: '46px',
                    borderRadius: '14px',
                    fontSize: '13.5px', 
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, rgba(255, 45, 85, 0.4) 0%, rgba(239, 68, 68, 0.5) 100%)',
                    border: '1px solid rgba(255, 45, 85, 0.7)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 4,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 6px 20px rgba(255, 45, 85, 0.35)'
                  }}
                >
                  <AlertTriangle size={17} /> 🚫 Quota Exceeded (Tap for Hotline Help)
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary"
                  style={{ 
                    width: '100%', 
                    height: '46px',
                    borderRadius: '14px',
                    fontSize: '14px', 
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    borderColor: 'rgba(255, 255, 255, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 4,
                    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4), inset 0 1px 1px rgba(255,255,255,0.4)'
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      Verifying Secret PIN...
                    </>
                  ) : (
                    <>
                      ⚡ Emergency Unlock & SOS <ArrowRight size={16} />
                    </>
                  )}
                </button>
              )}
            </form>
          ) : (
            /* Biometric Fingerprint Login (Balanced, Compact & matching Password/PIN proportions) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* Patient Identifier Lookup input */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="liquid-glass-label" style={{ margin: 0 }}>
                    Username or Phone Number
                  </label>
                  {isCheckingQuota && (
                    <span style={{ fontSize: '11px', color: '#00ff88', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                      <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> checking...
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ 
                    position: 'absolute', 
                    left: '14px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: (quotaData && quotaData.hasBiometric) ? '#00ff88' : '#ffffff', 
                    opacity: 0.85,
                    transition: 'color 0.2s'
                  }}>
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="form-input liquid-glass-input"
                    style={{ 
                      paddingLeft: '42px', 
                      height: '46px', 
                      borderRadius: '14px', 
                      fontSize: '14px',
                      borderColor: (quotaData && quotaData.hasBiometric) ? 'rgba(0, 255, 136, 0.5)' : undefined
                    }}
                    placeholder="e.g. sohan1 or 017xxxxxxxx"
                    autoFocus
                  />
                </div>
              </div>

              {/* Biometric Interactive Touch Plate (Well-proportioned sensor plate matching 4-Digit PIN height) */}
              <div 
                onClick={(quotaData && quotaData.hasBiometric && !isAuthenticatingBiometric) ? handleBiometricLogin : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 14px',
                  borderRadius: '14px',
                  background: (quotaData && quotaData.hasBiometric)
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.1) 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: (quotaData && quotaData.hasBiometric)
                    ? '1px solid rgba(0, 255, 136, 0.45)'
                    : '1px dashed rgba(255, 255, 255, 0.2)',
                  boxShadow: (quotaData && quotaData.hasBiometric)
                    ? '0 0 20px rgba(0, 255, 136, 0.25), inset 0 1px 1px rgba(255,255,255,0.2)'
                    : 'none',
                  cursor: (quotaData && quotaData.hasBiometric && !isAuthenticatingBiometric) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.25s ease'
                }}
              >
                {/* Fingerprint Sensor Touch Icon */}
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: (quotaData && quotaData.hasBiometric)
                    ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.35), rgba(16, 185, 129, 0.18))'
                    : 'rgba(255, 255, 255, 0.08)',
                  border: (quotaData && quotaData.hasBiometric)
                    ? '1px solid rgba(0, 255, 136, 0.6)'
                    : '1px solid rgba(255, 255, 255, 0.15)',
                  color: (quotaData && quotaData.hasBiometric) ? '#00ff88' : 'rgba(255, 255, 255, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: (quotaData && quotaData.hasBiometric) ? '0 0 14px rgba(0, 255, 136, 0.4)' : 'none'
                }}>
                  {isAuthenticatingBiometric ? (
                    <Loader2 size={24} style={{ animation: 'spin 1.2s linear infinite' }} />
                  ) : (
                    <Fingerprint size={26} />
                  )}
                </div>

                {/* Status Text inside sensor plate */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ 
                      fontSize: '12.5px', 
                      fontWeight: 800, 
                      color: (quotaData && quotaData.hasBiometric) ? '#ffffff' : 'rgba(255, 255, 255, 0.65)' 
                    }}>
                      {(quotaData && quotaData.hasBiometric) 
                        ? (isAuthenticatingBiometric ? 'Scanning Sensor...' : 'Touch Sensor to Verify') 
                        : 'Biometric Sensor'}
                    </span>
                    <span style={{ 
                      fontSize: '9.5px', 
                      fontWeight: 900, 
                      padding: '1px 6px', 
                      borderRadius: 5, 
                      background: (quotaData && quotaData.hasBiometric) ? 'rgba(0, 255, 136, 0.25)' : 'rgba(255, 255, 255, 0.12)',
                      color: (quotaData && quotaData.hasBiometric) ? '#00ff88' : 'rgba(255, 255, 255, 0.45)'
                    }}>
                      {(quotaData && quotaData.hasBiometric) ? 'READY' : 'DISABLED'}
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: '11px', 
                    color: (quotaData && quotaData.hasBiometric) ? '#a7f3d0' : 'rgba(255, 255, 255, 0.5)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {!identifier.trim()
                      ? 'Type username above to detect profile'
                      : (quotaData && quotaData.hasBiometric)
                        ? `Linked profile: ${quotaData.patientName}`
                        : quotaData
                          ? 'No fingerprint linked to this account'
                          : 'Checking database...'}
                  </span>
                </div>
              </div>

              {/* Status Notice matching 4-Digit PIN compact note */}
              <div style={{ 
                padding: '8px 12px', 
                borderRadius: '10px', 
                background: 'rgba(52, 199, 89, 0.12)', 
                border: '1px solid rgba(52, 199, 89, 0.3)', 
                fontSize: '11px', 
                color: '#00ff88', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 7, 
                backdropFilter: 'blur(8px)' 
              }}>
                🔒 <strong>Biometric Auth:</strong> Hardware fingerprint scanner verification for immediate SOS.
              </div>

              {/* 1-Tap Action Button (Exact same height and style as Password/PIN submit buttons) */}
              <button
                type="button"
                disabled={isAuthenticatingBiometric || !quotaData || !quotaData.hasBiometric}
                onClick={handleBiometricLogin}
                className="btn btn-primary"
                style={{
                  width: '100%', 
                  height: '46px',
                  borderRadius: '14px',
                  fontSize: '14px', 
                  fontWeight: 800,
                  background: (quotaData && quotaData.hasBiometric)
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'rgba(255, 255, 255, 0.08)',
                  borderColor: (quotaData && quotaData.hasBiometric)
                    ? 'rgba(0, 255, 136, 0.5)'
                    : 'rgba(255, 255, 255, 0.15)',
                  color: (quotaData && quotaData.hasBiometric) ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
                  cursor: (quotaData && quotaData.hasBiometric && !isAuthenticatingBiometric) ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 4,
                  boxShadow: (quotaData && quotaData.hasBiometric)
                    ? '0 8px 24px rgba(16, 185, 129, 0.4), inset 0 1px 1px rgba(255,255,255,0.4)'
                    : 'none',
                  transition: 'all 0.25s ease',
                  opacity: (quotaData && quotaData.hasBiometric) ? 1 : 0.6
                }}
              >
                {isAuthenticatingBiometric ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Verifying Fingerprint...
                  </>
                ) : (quotaData && quotaData.hasBiometric) ? (
                  <>
                    <Fingerprint size={18} />
                    👆 1-Tap Fingerprint Login & SOS <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <Fingerprint size={18} />
                    Fingerprint Disabled (Not Enrolled)
                  </>
                )}
              </button>
            </div>
          )
        ) : (
          /* ========================================================================= */
          /* VIEW 2: REGISTER FORM (PATIENT OR DRIVER)                                 */
          /* ========================================================================= */
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div className="form-group">
              <label className="liquid-glass-label">{isDriver ? 'Driver Full Name *' : isDispatcher ? 'Dispatcher Full Name *' : 'Full Name *'}</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: isDriver ? '#fde047' : '#ffffff', opacity: 0.85 }}>
                  {isDriver ? <Truck size={18} /> : <User size={18} />}
                </div>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="form-input liquid-glass-input"
                  style={{ paddingLeft: '42px', height: '46px', borderRadius: '14px', fontSize: '14px' }}
                  placeholder={isDriver ? 'e.g. Naimur Rahman' : 'e.g. Tanvir Hasan'}
                  autoFocus
                />
              </div>
            </div>

            {isDriver ? (
              /* Driver Simplified Signup: Phone Number & Optional Username (NID, License & Certificates moved to post-login verification portal) */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="liquid-glass-label">Phone Number *</label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ffffff', opacity: 0.8 }}>
                        <Phone size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="form-input liquid-glass-input"
                        style={{ paddingLeft: '38px', height: '46px', borderRadius: '14px', fontSize: '14px' }}
                        placeholder="017xxxxxxxx"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="liquid-glass-label">
                      Username <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="form-input liquid-glass-input"
                      style={{ height: '46px', borderRadius: '14px', fontSize: '14px' }}
                      placeholder="e.g. naimur01"
                    />
                  </div>
                </div>
              </>
            ) : isDispatcher ? (
              /* Dispatcher Specific Fields: Phone, Email, Username */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="liquid-glass-label">Phone Number *</label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ffffff', opacity: 0.8 }}>
                        <Phone size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="form-input liquid-glass-input"
                        style={{ paddingLeft: '38px', height: '46px', borderRadius: '14px', fontSize: '14px' }}
                        placeholder="017xxxxxxxx"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="liquid-glass-label">
                      Username <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="form-input liquid-glass-input"
                      style={{ height: '46px', borderRadius: '14px', fontSize: '14px' }}
                      placeholder="e.g. jdoe123"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="liquid-glass-label">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="form-input liquid-glass-input"
                    style={{ height: '46px', borderRadius: '14px', fontSize: '14px' }}
                    placeholder="dispatcher@drutosheba.com"
                  />
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)', marginTop: 4 }}>
                    Please provide a valid email. This is important for salary and company communications.
                  </div>
                </div>
              </>
            ) : (
              /* Patient Specific Fields: Phone, Blood Group, Username */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="liquid-glass-label">Phone Number *</label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ffffff', opacity: 0.8 }}>
                        <Phone size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="form-input liquid-glass-input"
                        style={{ paddingLeft: '38px', height: '46px', borderRadius: '14px', fontSize: '14px' }}
                        placeholder="017xxxxxxxx"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="liquid-glass-label">Blood Group</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={regBloodType}
                        onChange={(e) => setRegBloodType(e.target.value)}
                        className="form-input form-select liquid-glass-input"
                        style={{ height: '46px', borderRadius: '14px', fontSize: '14px', fontWeight: '700' }}
                      >
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => (
                          <option key={b} value={b} style={{ background: '#111827', color: '#ffffff' }}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="liquid-glass-label">
                    Username <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="form-input liquid-glass-input"
                    style={{ height: '46px', borderRadius: '14px', fontSize: '14px' }}
                    placeholder="e.g. tanvir99"
                  />
                </div>
              </>
            )}

            {isDriver || isDispatcher ? (
              /* Driver/Dispatcher Password Input (Full Width) */
              <div className="form-group">
                <label className="liquid-glass-label">Create Password (8+ Chars) *</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ffffff', opacity: 0.8 }}>
                    <Lock size={16} />
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="form-input liquid-glass-input"
                    style={{ paddingLeft: '38px', paddingRight: '40px', height: '46px', borderRadius: '14px', fontSize: '14px' }}
                    placeholder="e.g. Driver@2026"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    title={showRegPassword ? "Hide password" : "Show password"}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: showRegPassword ? '#f59e0b' : 'rgba(255, 255, 255, 0.7)',
                      background: 'none',
                      border: 'none',
                      padding: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.2s'
                    }}
                  >
                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ) : (
              /* Patient Password + Emergency PIN */
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="liquid-glass-label">Password (8+ Chars) *</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ffffff', opacity: 0.8 }}>
                      <Lock size={16} />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="form-input liquid-glass-input"
                      style={{ paddingLeft: '38px', paddingRight: '40px', height: '46px', borderRadius: '14px', fontSize: '14px' }}
                      placeholder="Pass@123"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      title={showRegPassword ? "Hide password" : "Show password"}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: showRegPassword ? '#ff0055' : 'rgba(255, 255, 255, 0.7)',
                        background: 'none',
                        border: 'none',
                        padding: 4,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s'
                      }}
                    >
                      {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="liquid-glass-label">
                    Secret PIN (4 Chars) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ff9f0a' }}>
                      <KeyRound size={16} />
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={regEmergencyPin}
                      onChange={(e) => setRegEmergencyPin(e.target.value.replace(/\s/g, '').slice(0, 4))}
                      className="form-input liquid-glass-input"
                      style={{ paddingLeft: '38px', height: '46px', borderRadius: '14px', letterSpacing: '3px', fontWeight: '800', fontSize: '15px' }}
                      placeholder="7421"
                    />
                  </div>
                </div>
              </div>
            )}

            {isDriver || isDispatcher ? (
              <div style={{ 
                fontSize: '11px', 
                color: '#fef08a', 
                background: 'rgba(245, 158, 11, 0.14)', 
                border: '1px dashed rgba(245, 158, 11, 0.45)', 
                padding: '9px 12px', 
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                lineHeight: 1.45
              }}>
                📋 <strong>Next Step:</strong> After registration, you will submit your qualification certificates & details for Admin verification before receiving access.
              </div>
            ) : (
              <>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#ffbe53', 
                  background: 'rgba(255, 159, 10, 0.16)', 
                  border: '1px dashed rgba(255, 159, 10, 0.5)', 
                  padding: '10px 14px', 
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)',
                  lineHeight: 1.5
                }}>
                  ⚡ <strong>Emergency PIN:</strong> Short 4-digit code (e.g. <code>7421</code>) for fast emergency login without password. Password must be 8+ chars with uppercase, lowercase, number & special char.
                </div>

                {/* Optional Biometric Fingerprint Registration (Patients Only) */}
                <div style={{
                  background: regBiometricId 
                    ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.2), rgba(16, 185, 129, 0.1))' 
                    : 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(99, 102, 241, 0.1))',
                  border: regBiometricId 
                    ? '1px solid rgba(52, 199, 89, 0.5)' 
                    : '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  backdropFilter: 'blur(12px)',
                  boxShadow: regBiometricId 
                    ? '0 4px 20px rgba(52, 199, 89, 0.2)' 
                    : '0 4px 16px rgba(0, 0, 0, 0.25)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: regBiometricId 
                        ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.35), rgba(16, 185, 129, 0.2))' 
                        : 'linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(14, 165, 233, 0.15))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: regBiometricId ? '#00ff88' : '#38bdf8',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      flexShrink: 0,
                      boxShadow: regBiometricId ? '0 0 16px rgba(52, 199, 89, 0.5)' : '0 0 12px rgba(56, 189, 248, 0.3)'
                    }}>
                      {isEnrollingBiometric ? (
                        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : regBiometricId ? (
                        <CheckCircle2 size={22} />
                      ) : (
                        <Fingerprint size={22} />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>
                          Biometric Fingerprint
                        </span>
                        <span style={{ 
                          fontSize: '8.5px', 
                          fontWeight: 900, 
                          letterSpacing: '0.4px',
                          padding: '1px 5px', 
                          borderRadius: 4, 
                          background: 'rgba(56, 189, 248, 0.22)', 
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.45)',
                          lineHeight: 1.1
                        }}>
                          BETA
                        </span>
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: '800', 
                          padding: '2px 6px', 
                          borderRadius: 6, 
                          background: regBiometricId ? 'rgba(52, 199, 89, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                          color: regBiometricId ? '#00ff88' : 'rgba(255, 255, 255, 0.75)'
                        }}>
                          {regBiometricId ? 'ENROLLED' : 'OPTIONAL'}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.3 }}>
                        {regBiometricId 
                          ? 'Unique biometric token registered & linked.' 
                          : 'Concerned about biometric privacy? You can skip this.'}
                      </span>
                    </div>
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    {regBiometricId ? (
                      <button
                        type="button"
                        onClick={() => setRegBiometricId(null)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 45, 85, 0.4)',
                          background: 'rgba(255, 45, 85, 0.15)',
                          color: '#ff4d6d',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isEnrollingBiometric}
                        onClick={handleEnrollFingerprint}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '12px',
                          border: '1px solid rgba(56, 189, 248, 0.5)',
                          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.35), rgba(14, 165, 233, 0.2))',
                          color: '#ffffff',
                          fontSize: '11.5px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 2px 10px rgba(56, 189, 248, 0.3)'
                        }}
                      >
                        <Fingerprint size={14} />
                        {isEnrollingBiometric ? 'Scanning...' : 'Scan & Link'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                height: '46px',
                borderRadius: '14px',
                fontSize: '14px', 
                fontWeight: 800,
                background: isDriver 
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                  : 'linear-gradient(135deg, #ff0055, #c20042)',
                borderColor: 'rgba(255, 255, 255, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4,
                boxShadow: isDriver
                  ? '0 8px 24px rgba(245, 158, 11, 0.4), inset 0 1px 1px rgba(255,255,255,0.4)'
                  : '0 8px 24px rgba(255, 0, 85, 0.4), inset 0 1px 1px rgba(255,255,255,0.4)'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  {isDriver ? 'Enrolling Driver...' : 'Creating Account...'}
                </>
              ) : (
                <>
                  {isDriver ? 'Register & Verify Qualifications' : 'Create Account'} <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Fluid Switcher Link Between Login & Register */}
        <div style={{ marginTop: '16px', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: 12 }}>
          {isPatient ? (
            viewMode === 'login' ? (
              <p style={{ fontSize: '13px', color: '#bae6fd', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)', margin: 0 }}>
                Don't have a patient account?{' '}
                <button
                  type="button"
                  onClick={() => switchView('register')}
                  style={{ 
                    color: '#fda4af', 
                    fontWeight: '900', 
                    cursor: 'pointer', 
                    background: 'none', 
                    border: 'none', 
                    textDecoration: 'underline',
                    textShadow: '0 0 10px rgba(251, 113, 133, 0.6)' 
                  }}
                >
                  Register here
                </button>
              </p>
            ) : (
              <p style={{ fontSize: '13px', color: '#bae6fd', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)', margin: 0 }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  style={{ 
                    color: '#38bdf8', 
                    fontWeight: '900', 
                    cursor: 'pointer', 
                    background: 'none', 
                    border: 'none', 
                    textDecoration: 'underline',
                    textShadow: '0 0 10px rgba(56, 189, 248, 0.6)' 
                  }}
                >
                  Sign in here
                </button>
              </p>
            )
          ) : isDriver ? (
            viewMode === 'login' ? (
              <p style={{ fontSize: '13px', color: '#bae6fd', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)', margin: 0 }}>
                Wanna join us?{' '}
                <button
                  type="button"
                  onClick={() => switchView('register')}
                  style={{ 
                    color: '#fef08a', 
                    fontWeight: '900', 
                    cursor: 'pointer', 
                    background: 'none', 
                    border: 'none', 
                    textDecoration: 'underline',
                    textShadow: '0 0 10px rgba(250, 204, 21, 0.6)' 
                  }}
                >
                  Register here...
                </button>
              </p>
            ) : (
              <p style={{ fontSize: '13px', color: '#bae6fd', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)', margin: 0 }}>
                Already registered as a driver?{' '}
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  style={{ 
                    color: '#38bdf8', 
                    fontWeight: '900', 
                    cursor: 'pointer', 
                    background: 'none', 
                    border: 'none', 
                    textDecoration: 'underline',
                    textShadow: '0 0 10px rgba(56, 189, 248, 0.6)' 
                  }}
                >
                  Sign in here
                </button>
              </p>
            )
          ) : isDispatcher ? (
            viewMode === 'login' ? (
              <p style={{ fontSize: '13px', color: '#bae6fd', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)', margin: 0 }}>
                Want to join as a dispatcher?{' '}
                <button
                  type="button"
                  onClick={() => switchView('register')}
                  style={{ 
                    color: '#67e8f9', 
                    fontWeight: '900', 
                    cursor: 'pointer', 
                    background: 'none', 
                    border: 'none', 
                    textDecoration: 'underline',
                    textShadow: '0 0 10px rgba(103, 232, 249, 0.6)' 
                  }}
                >
                  Register here
                </button>
              </p>
            ) : (
              <p style={{ fontSize: '13px', color: '#bae6fd', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)', margin: 0 }}>
                Already registered as a dispatcher?{' '}
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  style={{ 
                    color: '#38bdf8', 
                    fontWeight: '900', 
                    cursor: 'pointer', 
                    background: 'none', 
                    border: 'none', 
                    textDecoration: 'underline',
                    textShadow: '0 0 10px rgba(56, 189, 248, 0.6)' 
                  }}
                >
                  Sign in here
                </button>
              </p>
            )
          ) : isAdmin ? (
            <div style={{
              background: 'rgba(0, 240, 255, 0.08)',
              border: '1px solid rgba(0, 240, 255, 0.25)',
              borderRadius: '12px',
              padding: '10px 14px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '12px', color: '#67e8f9', fontWeight: 600, margin: '0 0 3px 0' }}>
                🛡️ <strong>Executive Board of Trustees Access Only</strong>
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', margin: 0, lineHeight: 1.4 }}>
                Public registration is disabled. Administrator profiles and 9-digit security keys are issued directly by company owners.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* ----------------- EMERGENCY QUOTA EXCEEDED POPUP MODAL ----------------- */}
      {showQuotaModal && (
        <div 
          className="modal-overlay" 
          style={{ 
            zIndex: 9999, 
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }} 
          onClick={() => setShowQuotaModal(false)}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: 440, 
              width: '100%',
              borderRadius: 24, 
              padding: '28px',
              border: currentTheme === 'light' ? '1px solid #D1D5DB' : '1px solid rgba(255, 255, 255, 0.2)',
              background: currentTheme === 'light' ? '#FFFFFF' : '#14141E',
              color: currentTheme === 'light' ? '#111827' : '#FFFFFF',
              boxShadow: currentTheme === 'light'
                ? '0 25px 60px rgba(0,0,0,0.25)'
                : '0 30px 80px rgba(0, 0, 0, 0.9)',
              animation: 'liquidAppear 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <ShieldAlert size={32} />
              </div>
              <h3 style={{ 
                fontSize: 19, 
                fontWeight: 800, 
                margin: 0, 
                color: currentTheme === 'light' ? '#111827' : '#FFFFFF' 
              }}>
                জরুরি কোটা সীমা শেষ
              </h3>
              <div style={{ 
                fontSize: 12, 
                color: '#EF4444', 
                fontWeight: 700, 
                marginTop: 4, 
                textTransform: 'uppercase', 
                letterSpacing: '1px' 
              }}>
                Monthly Quota Exceeded (3/3 Used)
              </div>
            </div>

            <div style={{
              background: currentTheme === 'light' ? '#F9FAFB' : 'rgba(255, 255, 255, 0.04)',
              border: currentTheme === 'light' ? '1px solid #E5E7EB' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              padding: '14px',
              fontSize: 13,
              lineHeight: 1.6,
              color: currentTheme === 'light' ? '#374151' : '#E2E8F0',
              marginBottom: 20
            }}>
              নিরাপত্তার স্বার্থে আপনি চলতি মাসে <strong>সর্বোচ্চ ৩ বার</strong> জরুরি সিক্রেট পিন দিয়ে লগইন সম্পন্ন করেছেন। আর জরুরি লগইন করা সম্ভব নয়। সাধারণ পাসওয়ার্ড দিয়ে লগইন করুন অথবা জরুরি সহায়তার জন্য আমাদের <strong>২৪/৭ হটলাইনে</strong> যোগাযোগ করুন।
            </div>

            <div style={{
              background: currentTheme === 'light' ? '#ECFDF5' : 'rgba(16, 185, 129, 0.1)',
              border: currentTheme === 'light' ? '1px solid #A7F3D0' : '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 16,
              padding: '16px',
              textAlign: 'center',
              marginBottom: 20
            }}>
              <div style={{ 
                fontSize: 11, 
                fontWeight: 800, 
                color: currentTheme === 'light' ? '#065F46' : '#34D399', 
                textTransform: 'uppercase', 
                letterSpacing: '0.8px',
                marginBottom: 6
              }}>
                Druto Sheba 24/7 Emergency Hotline
              </div>
              <a 
                href={`tel:${quotaAdminPhone}`}
                style={{
                  fontSize: 21,
                  fontWeight: 900,
                  color: currentTheme === 'light' ? '#047857' : '#10B981',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  letterSpacing: '0.5px'
                }}
              >
                <PhoneCall size={22} style={{ color: '#16A34A', filter: 'drop-shadow(0 0 6px rgba(22, 163, 74, 0.4))' }} /> 
                <span>{quotaAdminPhone}</span>
              </a>
              <div style={{ 
                fontSize: 12, 
                color: currentTheme === 'light' ? '#6B7280' : '#94A3B8', 
                marginTop: 6,
                fontWeight: 500
              }}>
                কল করুন জরুরি অ্যাম্বুলেন্স প্রেরণ ও ম্যানুয়াল এক্সেস সহায়তার জন্য
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ 
                  flex: 1, 
                  height: '44px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  color: currentTheme === 'light' ? '#374151' : 'var(--text-secondary)',
                  border: currentTheme === 'light' ? '1px solid #D1D5DB' : '1px solid var(--border-subtle)',
                  background: currentTheme === 'light' ? '#F3F4F6' : 'transparent',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setShowQuotaModal(false);
                  setAuthMode('password');
                }}
              >
                Use Password Login
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ 
                  flex: 1, 
                  height: '44px',
                  borderRadius: 12, 
                  background: 'var(--red)', 
                  borderColor: 'var(--red)',
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(255, 0, 85, 0.35)'
                }}
                onClick={() => setShowQuotaModal(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Modal when Fingerprint is NOT Registered */}
      {showBioNotRegisteredModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 25, 45, 0.95), rgba(10, 15, 30, 0.98))',
            border: '1px solid rgba(255, 45, 85, 0.5)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(255, 45, 85, 0.35)',
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '430px',
            width: '100%',
            textAlign: 'center',
            animation: 'fadeIn 0.25s ease'
          }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'rgba(255, 45, 85, 0.15)',
              border: '2px solid rgba(255, 45, 85, 0.5)',
              color: '#ff4d6d',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14
            }}>
              <Fingerprint size={32} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', marginBottom: 8 }}>
              Fingerprint Not Registered
            </h3>

            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5, marginBottom: 20 }}>
              You didn't register our portal with a fingerprint! Only patients who enrolled their biometric verification during registration can use 1-Tap Fingerprint Login.
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 12,
              padding: '12px',
              fontSize: '12px',
              color: '#fef08a',
              marginBottom: 20,
              border: '1px dashed rgba(253, 224, 71, 0.35)'
            }}>
              💡 <em>Tip: You can sign in using your standard <strong>Password</strong> or <strong>4-digit Emergency PIN</strong>.</em>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setShowBioNotRegisteredModal(false);
                  setAuthMode('password');
                }}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.35), rgba(14, 165, 233, 0.2))',
                  border: '1px solid rgba(56, 189, 248, 0.5)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                Use Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBioNotRegisteredModal(false);
                  switchView('register');
                }}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ff0055, #c20042)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                Register Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="loading-container"><div className="spinner" /></div>}>
      <AuthPortalForm />
    </Suspense>
  );
}
