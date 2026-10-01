'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { 
  AlertTriangle, Truck, BedDouble, Users, Zap, RefreshCw, Clock, MessageCircle, 
  Send, X, CloudLightning, Navigation, Map as MapIcon, GraduationCap, Award, 
  Plus, Trash2, ShieldCheck, CheckCircle2, FileText, DollarSign 
} from 'lucide-react';
import { SeverityBadge, StatusBadge } from '@/components/Badges';
import { useToast } from '@/components/Toast';
import dynamic from 'next/dynamic';
import mqttService from '@/lib/mqttService';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const TrendGraph = ({ trend }) => {
  if (!trend || trend.length === 0) return null;
  const maxVal = Math.max(...trend.map(t => parseInt(t.count)), 5);
  const width = 300;
  const height = 140;
  const padding = 20;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  const points = trend.map((t, i) => {
    const count = parseInt(t.count) || 0;
    return {
      x: padding + (i * (chartWidth / (trend.length - 1 || 1))),
      y: height - padding - (maxVal > 0 ? (count / maxVal) * chartHeight : 0)
    };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaData = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div style={{ position: 'relative', width: '100%', height: height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaData} fill="url(#trendGradient)" />
        <path d={pathData} fill="none" stroke="var(--blue)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--bg-primary)" stroke="var(--blue)" strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 4px' }}>
        {trend.map((t, i) => (
          <span key={i} style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>{t.day}</span>
        ))}
      </div>
    </div>
  );
};

const SpecializationDistribution = ({ stats }) => {
  if (!stats || stats.length === 0) return null;
  const maxVal = Math.max(...stats.map(s => parseInt(s.count)), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '15px 0' }}>
      {stats.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 100, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.spec}</div>
          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${(parseInt(s.count) / maxVal) * 100}%`, height: '100%', background: 'var(--blue)', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, width: 20 }}>{s.count}</div>
        </div>
      ))}
    </div>
  );
};

export default function DispatcherDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(null);
  const [activeChatTrip, setActiveChatTrip] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [mapModal, setMapModal] = useState({ open: false, title: '', pickupCoords: null, realtimeMarker: null, driver_id: null });
  const [assignModal, setAssignModal] = useState({ open: false, request_id: null, driver_id: '', vehicle_id: '' });
  const toast = useToast();

  // MQTT Connection for real-time tracking in the Map Modal
  useEffect(() => {
    if (!mapModal.open || !mapModal.driver_id) return;

    mqttService.connect(`dispatcher-${Math.random().toString(16).substr(2, 6)}`);
    
    const unsubscribe = mqttService.subscribe((data) => {
      if (data.id === `ambulance-${mapModal.driver_id}`) {
        if (data.status === 'offline') {
          setMapModal(prev => ({ ...prev, realtimeMarker: null }));
        } else {
          setMapModal(prev => ({
            ...prev,
            realtimeMarker: {
              ...prev.realtimeMarker,
              lat: data.lat,
              lng: data.lng,
              speed: data.speed,
              acc: data.acc
            }
          }));
        }
      }
    });

    return () => {
      unsubscribe();
      mqttService.disconnect();
    };
  }, [mapModal.open, mapModal.driver_id]);

  const [advisoryActive, setAdvisoryActive] = useState(false);

  useEffect(() => {
    if (data?.advisory) {
      setAdvisoryActive(data.advisory.is_active);
    }
  }, [data]);

  const toggleAdvisory = async () => {
    const newState = !advisoryActive;
    setAdvisoryActive(newState);
    try {
      await fetch('/api/advisory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newState })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useAutoRefresh(fetchData);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: activeChatTrip.request_id, text: chatMessage, sender: 'Dispatcher' })
      });
      setChatMessage('');
      fetchData();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const [verificationData, setVerificationData] = useState(null);
  const [checkingVerification, setCheckingVerification] = useState(true);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [vNid, setVNid] = useState('');
  const [vHscYear, setVHscYear] = useState('');
  const [vHscReg, setVHscReg] = useState('');
  const [vHscRoll, setVHscRoll] = useState('');
  const [vHscBoard, setVHscBoard] = useState('Dhaka');
  const [extraQualifications, setExtraQualifications] = useState([]);

  const [showApprovedModal, setShowApprovedModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      let userId = null;
      let sessionVerificationStatus = null;
      try {
        const meRes = await fetch('/api/auth/me?portal=dispatcher', { cache: 'no-store' });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.userId) {
            userId = String(meData.userId);
            sessionVerificationStatus = meData.verification_status;
            localStorage.setItem('emergency_staff_user', userId);
          }
        }
      } catch (e) {}

      if (!userId) {
        userId = localStorage.getItem('emergency_staff_user');
      }

      let isGateLocked = sessionVerificationStatus === 'Pending' || sessionVerificationStatus === 'Rejected';
      try {
        const vUrl = (userId && userId !== 'undefined')
          ? `/api/dispatcher/verification?userId=${userId}&t=${Date.now()}`
          : `/api/dispatcher/verification?t=${Date.now()}`;
        const vRes = await fetch(vUrl, { cache: 'no-store' });
        if (vRes.ok) {
          const vData = await vRes.json();
          if (vData.success) {
            setVerificationData(vData);
            if (vData.staff?.nid_number) {
              setVNid(vData.staff.nid_number);
            }
            if (vData.staff?.user_id) {
              localStorage.setItem('emergency_staff_user', String(vData.staff.user_id));
            }
            const st = vData.staff?.verification_status;
            if (st === 'Pending' || st === 'Rejected') {
              isGateLocked = true;
            } else if (st === 'Approved' || st === 'Verified') {
              isGateLocked = false;
              // Check if celebration pop-up was already acknowledged
              const seenKey = `disp_approved_welcome_${vData.staff?.user_id}`;
              if (!localStorage.getItem(seenKey)) {
                setShowApprovedModal(true);
                localStorage.setItem(seenKey, 'true');
              }
            }
          }
        }
      } catch (e) {
        console.warn('Verification status check warning:', e);
      } finally {
        setCheckingVerification(false);
      }

      // 2. Fetch Dashboard operational data only if approved
      if (!isGateLocked) {
        await fetchData();
      } else {
        setLoading(false);
      }
    };
    init();
  }, [fetchData]);

  const handleAddQualification = () => {
    setExtraQualifications(prev => [
      ...prev,
      {
        type: 'Degree',
        degree_name: '',
        institute: '',
        roll_no: '',
        grad_year: '',
        certificate_name: '',
        issuing_authority: '',
        serial_no: '',
        batch_no: '',
        issue_date: '',
        valid_until: ''
      }
    ]);
  };

  const handleRemoveQualification = (idx) => {
    setExtraQualifications(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQualificationChange = (idx, field, value) => {
    setExtraQualifications(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    if (!vNid.trim()) {
      toast('Please enter your National ID (NID) number.', 'error');
      return;
    }
    if (!vHscYear.trim() || !vHscReg.trim() || !vHscRoll.trim() || !vHscBoard) {
      toast('Please fill in all required HSC fields (Passing Year, Board, Reg No, Roll No).', 'error');
      return;
    }

    setSubmittingVerification(true);
    let userId = localStorage.getItem('emergency_staff_user') || verificationData?.staff?.user_id;

    try {
      const cleanedQualifications = extraQualifications.map(q => {
        if (q.type === 'Degree') {
          return {
            type: 'Degree',
            degree_name: q.degree_name?.trim() || '',
            institute: q.institute?.trim() || '',
            roll_no: q.roll_no?.trim() || '',
            grad_year: q.grad_year?.trim() || ''
          };
        } else {
          return {
            type: 'Skill',
            certificate_name: q.certificate_name?.trim() || '',
            issuing_authority: q.issuing_authority?.trim() || '',
            serial_no: q.serial_no?.trim() || '',
            batch_no: q.batch_no?.trim() || '',
            issue_date: q.issue_date || '',
            valid_until: q.valid_until || ''
          };
        }
      }).filter(q => q.type === 'Degree' ? (q.degree_name || q.institute) : (q.certificate_name || q.issuing_authority));

      const res = await fetch('/api/dispatcher/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          nid_number: vNid.trim(),
          hscDetails: {
            year: vHscYear.trim(),
            reg: vHscReg.trim(),
            roll: vHscRoll.trim(),
            board: vHscBoard
          },
          extraQualifications: cleanedQualifications
        })
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        toast(resData.error || 'Failed to submit verification details.', 'error');
      } else {
        toast('Verification credentials submitted successfully! Awaiting Admin review.', 'success');
        // Refresh verification state
        const vUrl = (userId && userId !== 'undefined')
          ? `/api/dispatcher/verification?userId=${userId}&t=${Date.now()}`
          : `/api/dispatcher/verification?t=${Date.now()}`;
        const vRes = await fetch(vUrl, { cache: 'no-store' });
        if (vRes.ok) {
          const vData = await vRes.json();
          if (vData.success) setVerificationData(vData);
        }
      }
    } catch (err) {
      console.error(err);
      toast('Network error during verification submission.', 'error');
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleManualAssignSubmit = async () => {
    if (!assignModal.driver_id || !assignModal.vehicle_id) {
      toast('Please select both a driver and an ambulance', 'error');
      return;
    }
    
    try {
      const res = await fetch('/api/dispatcher/operations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: assignModal.request_id,
          driver_id: assignModal.driver_id,
          vehicle_id: assignModal.vehicle_id,
          dispatcher_id: 1
        })
      });
      const result = await res.json();
      
      if (result.success) {
        toast('Driver manually assigned successfully!', 'success');
        setAssignModal({ open: false, request_id: null, driver_id: '', vehicle_id: '' });
      } else {
        toast(result.error || 'Failed to assign driver', 'error');
      }
      fetchData();
    } catch (err) {
      toast('Network error during assignment', 'error');
    }
  };


  const handleDispatch = async (requestId) => {
    setDispatching(requestId);
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
      });
      const result = await res.json();
      
      if (result.success) {
        toast(result.message, 'success', { title: 'Dispatch Success' });
      } else {
        toast(result.message + ' — Ensure at least one driver is "On_Duty".', 'error', { title: 'Dispatch Failed' });
      }
      fetchData();
    } catch (err) {
      toast('Network error during dispatch.', 'error');
    } finally {
      setDispatching(null);
    }
  };

  const renderModernLoader = (statusText = 'Connecting to Live Command Center...') => (
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
            border: '3px solid rgba(10, 132, 255, 0.15)',
            borderTopColor: 'var(--blue)',
            animation: 'spin 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite'
          }} />
          <Navigation size={20} style={{ color: 'var(--blue)', opacity: 0.9 }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
            {statusText}
          </div>
          <div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 500 }}>
            Synchronizing nationwide fleet, telemetry & emergency queues
          </div>
        </div>
      </div>
    </div>
  );

  if (checkingVerification) {
    return renderModernLoader('Verifying dispatcher clearance credentials...');
  }

  if (verificationData && (verificationData.staff?.verification_status === 'Pending' || verificationData.staff?.verification_status === 'Rejected')) {
    const isRejected = verificationData.staff?.verification_status === 'Rejected';
    const submissions = verificationData.verifications || [];

    return (
      <div className="page-container" style={{ padding: '24px 20px', maxWidth: 960, margin: '0 auto' }}>
        {/* If Rejected Banner with User's Exact Bengali Notice */}
        {isRejected && (
          <div style={{
            padding: '20px 24px',
            borderRadius: 16,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '2px solid #ef4444',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 8px 30px rgba(239, 68, 68, 0.2)'
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              fontSize: 24,
              flexShrink: 0
            }}>
              ⚠️
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#ef4444', marginBottom: 4 }}>
                আবেদন বাতিল সংক্রান্ত বিজ্ঞপ্তি (Application Rejected Notice)
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: 600 }}>
                কোনো ত্রুটিপূর্ণ কারণবশত আপনার আবেদনটি রিজেক্ট করা হয়েছে। দয়া করে ডকুমেন্টেশন, পেমেন্ট, সবকিছু ঠিকভাবে চেক করুন এবং পুনরায় আবেদন ও ফি প্রদান করুন। যদি কোনো তথ্যের বিভ্রান্তি থেকে থাকে তবে দ্রুত সেবা অফিসে সরাসরি যোগাযোগ করুন।
              </div>
            </div>
          </div>
        )}

        {/* Top Verification Glass Banner */}
        <div style={{
          padding: 24,
          borderRadius: 20,
          border: isRejected ? '1.5px solid rgba(239, 68, 68, 0.65)' : '1.5px solid rgba(245, 158, 11, 0.65)',
          background: 'var(--bg-card)',
          boxShadow: isRejected ? '0 8px 32px rgba(239, 68, 68, 0.15)' : '0 8px 32px rgba(245, 158, 11, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: isRejected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                border: isRejected ? '1.5px solid rgba(239, 68, 68, 0.5)' : '1.5px solid rgba(245, 158, 11, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26
              }}>
                {isRejected ? '❌' : '⏳'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: isRejected ? '#ef4444' : '#f59e0b', margin: 0, letterSpacing: '-0.3px' }}>
                    {isRejected ? 'Application Rejected — Re-apply Below' : 'Profile Awaiting Admin Verification'}
                  </h2>
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: isRejected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: isRejected ? '#ef4444' : '#f59e0b',
                    border: isRejected ? '1px solid #ef4444' : '1px solid #f59e0b'
                  }}>
                    {isRejected ? 'REJECTED' : 'PENDING CLEARANCE'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 4 }}>
                  🔒 All emergency dispatch commands, emergency assignment desks, and live fleet monitoring are locked until Admin verifies your credentials.
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              Dispatcher: <strong style={{ color: 'var(--text-primary)' }}>{verificationData.staff?.name || verificationData.staff?.username}</strong> ({verificationData.staff?.email || 'Email Linked'})
            </div>
          </div>

          {/* Job Circular & Official Confirmation Box */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
            padding: 16,
            borderRadius: 14,
            background: 'rgba(10, 132, 255, 0.06)',
            border: '1px solid rgba(10, 132, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <DollarSign size={20} color="var(--green)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>Official Salary Confirmation</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Starts at <strong style={{ color: 'var(--green)' }}>20,000 BDT</strong> up to <strong style={{ color: 'var(--green)' }}>30,000 BDT</strong> (based on dispatch performance, shift dedication & evaluation).
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <GraduationCap size={20} color="var(--blue)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>Qualification Standards</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Minimum requirement: <strong style={{ color: 'var(--text-primary)' }}>HSC Pass</strong>. Extra degrees, nursing/IT diplomas & certifications receive <strong style={{ color: '#f59e0b' }}>Top Priority</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dispatcher Submission Received Notice */}
        {submissions.length > 0 && !isRejected && (
          <div style={{
            padding: '16px 20px',
            borderRadius: 14,
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1.5px solid rgba(16, 185, 129, 0.4)',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 14
          }}>
            <div style={{ fontSize: 24 }}>📬</div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#10b981', marginBottom: 2 }}>
                ভেরিফিকেশন আবেদন গৃহীত হয়েছে (Application Under Processing)
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                আপনার ডিসপ্যাচার ভেরিফিকেশন আবেদনটি সফলভাবে গৃহীত হয়েছে এবং বর্তমানে অ্যাডমিন পর্যালোচনাধীন রয়েছে। অনুগ্রহ করে ৭ দিনের মধ্যে ৫০০ টাকা ভেরিফিকেশন ফি পরিশোধ সম্পন্ন করুন (যদি ইতিমধ্যে না করে থাকেন); অন্যথায় আবেদনটি স্বয়ংক্রিয়ভাবে বাতিল হয়ে যাবে।
              </div>
            </div>
          </div>
        )}

        {/* Previously Submitted Qualifications History */}
        {submissions.length > 0 && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 18,
            padding: 22,
            marginBottom: 24,
            boxShadow: 'var(--shadow-card)'
          }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="var(--blue)" />
              Previously Submitted Credentials ({submissions.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {submissions.map((sub, sIdx) => {
                let extras = [];
                try {
                  extras = typeof sub.extra_qualifications === 'string' 
                    ? JSON.parse(sub.extra_qualifications) 
                    : (sub.extra_qualifications || []);
                } catch (e) {
                  extras = [];
                }

                return (
                  <div key={sub.id || sIdx} style={{
                    padding: 16,
                    borderRadius: 14,
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                          🎓 HSC Application Record #{sIdx + 1}
                        </span>
                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: sub.status === 'Approved' ? 'rgba(34,197,94,0.18)' : 'rgba(245,158,11,0.18)',
                          color: sub.status === 'Approved' ? 'var(--green)' : '#f59e0b',
                          border: `1px solid ${sub.status === 'Approved' ? '#22c55e' : '#f59e0b'}`
                        }}>
                          {sub.status === 'Approved' ? '✓ APPROVED' : '⏳ PENDING ADMIN REVIEW'}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {sub.created_at ? new Date(sub.created_at).toLocaleDateString('en-GB') : 'Submitted'}
                      </span>
                    </div>

                    {/* HSC & Identity summary */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(sub.nid_number || verificationData?.staff?.nid_number) && (
                        <span style={{ 
                          padding: '3px 9px', 
                          borderRadius: 6, 
                          background: 'rgba(56, 189, 248, 0.15)', 
                          color: '#38bdf8', 
                          fontSize: 12, 
                          fontWeight: 800,
                          border: '1px solid rgba(56, 189, 248, 0.3)'
                        }}>
                          🆔 NID: {sub.nid_number || verificationData?.staff?.nid_number}
                        </span>
                      )}
                      <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(10,132,255,0.1)', color: 'var(--blue)', fontSize: 12, fontWeight: 700 }}>
                        Passing Year: {sub.hsc_year}
                      </span>
                      <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(10,132,255,0.1)', color: 'var(--blue)', fontSize: 12, fontWeight: 700 }}>
                        Board: {sub.hsc_board}
                      </span>
                      <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontSize: 12 }}>
                        Roll No: {sub.hsc_roll_no}
                      </span>
                      <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontSize: 12 }}>
                        Reg No: {sub.hsc_reg_no}
                      </span>
                    </div>

                    {/* Extra Qualifications */}
                    {Array.isArray(extras) && extras.length > 0 && (
                      <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px dashed var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Additional Qualifications & Certifications:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                          {extras.map((ex, exI) => (
                            <div key={exI} style={{
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-subtle)',
                              fontSize: 12
                            }}>
                              <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                                {ex.type === 'Degree' ? (ex.degree_name || ex.title || 'Degree Qualification') : (ex.certificate_name || ex.title || 'Skill Certificate')}
                              </div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 2 }}>
                                {ex.institute || ex.issuing_authority || ex.authority}
                                {ex.grad_year ? ` • Grad: ${ex.grad_year}` : (ex.year ? ` • ${ex.year}` : '')}
                                {ex.serial_no ? ` • SN: ${ex.serial_no}` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Verification Submission Form */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border-accent)',
          borderRadius: 20,
          padding: 26,
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📝</span> Submit Verification & Qualification Documents
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>
            {submissions.length > 0
              ? 'You can add additional degrees or update your qualification profile below. Our Admin desk will re-verify all documents.'
              : 'Please enter your National ID (NID), HSC examination data, and attach any diplomas, university degrees, or skill training certificates.'}
          </p>

          <form onSubmit={handleVerificationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Identity & HSC Section */}
            <div style={{
              background: 'var(--bg-input)',
              padding: 18,
              borderRadius: 14,
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <GraduationCap size={16} color="var(--blue)" />
                Mandatory National ID & HSC Clearance (ন্যূনতম শিক্ষাগত যোগ্যতা: এইচএসসি)
              </div>

              {/* NID Field */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: 'var(--text-primary)', display: 'block', marginBottom: 5, fontWeight: 800 }}>
                  National ID (NID Number) * <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>(10, 13 or 17 digit Smart/Original NID)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1995829102941"
                  value={vNid}
                  onChange={(e) => setVNid(e.target.value.replace(/\D/g, '').slice(0, 17))}
                  className="form-input"
                  style={{ height: 42, borderRadius: 10, fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-primary)', display: 'block', marginBottom: 5, fontWeight: 700 }}>
                    HSC Passing Year *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2020"
                    value={vHscYear}
                    onChange={(e) => setVHscYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="form-input"
                    style={{ height: 42, borderRadius: 10, fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-primary)', display: 'block', marginBottom: 5, fontWeight: 700 }}>
                    Education Board *
                  </label>
                  <select
                    required
                    value={vHscBoard}
                    onChange={(e) => setVHscBoard(e.target.value)}
                    className="form-input form-select"
                    style={{ height: 42, borderRadius: 10, fontSize: 13, fontWeight: 700 }}
                  >
                    <option value="Dhaka">Dhaka Board (ঢাকা)</option>
                    <option value="Chittagong">Chittagong Board (চট্টগ্রাম)</option>
                    <option value="Rajshahi">Rajshahi Board (রাজশাহী)</option>
                    <option value="Comilla">Comilla Board (কুমিল্লা)</option>
                    <option value="Jessore">Jessore Board (যশোর)</option>
                    <option value="Barisal">Barisal Board (বরিশাল)</option>
                    <option value="Sylhet">Sylhet Board (সিলেট)</option>
                    <option value="Dinajpur">Dinajpur Board (দিনাজপুর)</option>
                    <option value="Mymensingh">Mymensingh Board (ময়মনসিংহ)</option>
                    <option value="Technical">Bangladesh Technical Education Board (কারিগরি)</option>
                    <option value="Madrasah">Madrasah Board (মাদ্রাসা)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-primary)', display: 'block', marginBottom: 5, fontWeight: 700 }}>
                    HSC Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1512839201"
                    value={vHscReg}
                    onChange={(e) => setVHscReg(e.target.value.replace(/\D/g, '').slice(0, 15))}
                    className="form-input"
                    style={{ height: 42, borderRadius: 10, fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-primary)', display: 'block', marginBottom: 5, fontWeight: 700 }}>
                    HSC Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 210839"
                    value={vHscRoll}
                    onChange={(e) => setVHscRoll(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="form-input"
                    style={{ height: 42, borderRadius: 10, fontSize: 13 }}
                  />
                </div>
              </div>
            </div>

            {/* Extra Qualifications Dynamic Section */}
            <div style={{
              background: 'var(--bg-input)',
              padding: 18,
              borderRadius: 14,
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Award size={16} color="var(--yellow)" />
                    Additional Qualifications & Certificates (ঐচ্ছিক উচ্চতর ডিগ্রি ও সার্টিফিকেট)
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Bachelor degree, Diploma, or IT/First-Aid certificates grant priority ranking and higher starting positions.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddQualification}
                  style={{
                    background: 'rgba(10, 132, 255, 0.15)',
                    color: 'var(--blue)',
                    border: '1px solid rgba(10, 132, 255, 0.35)',
                    padding: '8px 14px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s'
                  }}
                >
                  <Plus size={14} /> + Add Qualification / Certificate
                </button>
              </div>

              {extraQualifications.length === 0 && (
                <div style={{
                  padding: 16,
                  borderRadius: 10,
                  border: '1px dashed var(--border-subtle)',
                  textAlign: 'center',
                  fontSize: 12,
                  color: 'var(--text-muted)'
                }}>
                  No additional qualifications added yet. Click <strong>"+ Add Qualification / Certificate"</strong> if you have a Bachelor Degree, Polytechnic Diploma, or training certificates.
                </div>
              )}

              {extraQualifications.map((q, idx) => (
                <div key={idx} style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>
                        Qualification #{idx + 1}
                      </span>
                      <select
                        value={q.type}
                        onChange={(e) => handleQualificationChange(idx, 'type', e.target.value)}
                        className="form-input form-select"
                        style={{ height: 32, fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 8 }}
                      >
                        <option value="Degree">🎓 Bachelor / University Degree / Diploma</option>
                        <option value="Skill">📜 General Skill / Training Certificate</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQualification(idx)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 6,
                        color: 'var(--red)',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700
                      }}
                      title="Remove this qualification"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>

                  {q.type === 'Degree' ? (
                    /* Degree / Diploma Fields */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                          Degree / Diploma Title *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. BSc in Computer Science / Diploma in Nursing"
                          value={q.degree_name || ''}
                          onChange={(e) => handleQualificationChange(idx, 'degree_name', e.target.value)}
                          className="form-input"
                          style={{ height: 38, borderRadius: 8, fontSize: 12 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                          University / Institute Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. University of Dhaka / BTEB"
                          value={q.institute || ''}
                          onChange={(e) => handleQualificationChange(idx, 'institute', e.target.value)}
                          className="form-input"
                          style={{ height: 38, borderRadius: 8, fontSize: 12 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                          Student Roll / Registration No
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 180123"
                          value={q.roll_no || ''}
                          onChange={(e) => handleQualificationChange(idx, 'roll_no', e.target.value)}
                          className="form-input"
                          style={{ height: 38, borderRadius: 8, fontSize: 12 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                          Graduation / Passing Year
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 2022"
                          value={q.grad_year || ''}
                          onChange={(e) => handleQualificationChange(idx, 'grad_year', e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="form-input"
                          style={{ height: 38, borderRadius: 8, fontSize: 12 }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Skill Certificate Fields */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                          Certificate / Course Title *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Emergency Dispatch Protocol / CPR Training"
                          value={q.certificate_name || ''}
                          onChange={(e) => handleQualificationChange(idx, 'certificate_name', e.target.value)}
                          className="form-input"
                          style={{ height: 38, borderRadius: 8, fontSize: 12 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                          Issuing Authority / Organization *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Red Crescent / DGHS / Fire Service"
                          value={q.issuing_authority || ''}
                          onChange={(e) => handleQualificationChange(idx, 'issuing_authority', e.target.value)}
                          className="form-input"
                          style={{ height: 38, borderRadius: 8, fontSize: 12 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                          Serial Number / Credential ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. RC-2023-8891"
                          value={q.serial_no || ''}
                          onChange={(e) => handleQualificationChange(idx, 'serial_no', e.target.value)}
                          className="form-input"
                          style={{ height: 38, borderRadius: 8, fontSize: 12 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                          Batch Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Batch 14"
                          value={q.batch_no || ''}
                          onChange={(e) => handleQualificationChange(idx, 'batch_no', e.target.value)}
                          className="form-input"
                          style={{ height: 38, borderRadius: 8, fontSize: 12 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                          Issue Date
                        </label>
                        <input
                          type="date"
                          value={q.issue_date || ''}
                          onChange={(e) => handleQualificationChange(idx, 'issue_date', e.target.value)}
                          className="form-input"
                          style={{ height: 38, borderRadius: 8, fontSize: 12 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                          Valid Until (Expiration)
                        </label>
                        <input
                          type="date"
                          value={q.valid_until || ''}
                          onChange={(e) => handleQualificationChange(idx, 'valid_until', e.target.value)}
                          className="form-input"
                          style={{ height: 38, borderRadius: 8, fontSize: 12 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submittingVerification}
              style={{
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#ffffff',
                border: 'none',
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: '0.3px',
                cursor: submittingVerification ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 18px rgba(245, 158, 11, 0.4)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {submittingVerification ? (
                <>Submitting Credentials...</>
              ) : (
                <>📝 Submit All Verification Details to Admin</>
              )}
            </button>

            {/* Verification Payment Box (500 BDT) */}
            <div style={{
              marginTop: 4,
              padding: '16px 20px',
              borderRadius: 14,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1.5px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 800, lineHeight: 1.4 }}>
                ⚠️ Mandatory verification processing charge: 500 BDT must be paid, otherwise the application will remain pending for 7 days before automated cancellation.
              </div>
              <button
                type="button"
                onClick={() => {
                  const staffId = verificationData?.staff?.user_id || '';
                  const staffPhone = verificationData?.staff?.phone || '';
                  router.push(`/payment?purpose=Dispatcher_Verification&id=${encodeURIComponent(staffId)}&phone=${encodeURIComponent(staffPhone)}&amount=500&returnUrl=/dashboard`);
                }}
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 24px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                  transition: 'transform 0.15s ease'
                }}
              >
                💳 Pay 500 BDT Verification Charge
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return renderModernLoader('Connecting to Live Command Center...');
  }

  const s = data?.stats || {};
  const advisory = data?.advisory || {};

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Command Center</h2>
          <p className="page-header-sub">Real-time dispatch overview — Nationwide</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className={`btn btn-sm ${advisoryActive ? 'btn-primary' : 'btn-ghost'}`} onClick={toggleAdvisory} style={{ background: advisoryActive ? 'var(--orange)' : 'transparent', color: advisoryActive ? '#fff' : 'var(--orange)', borderColor: 'var(--orange)' }}>
            <CloudLightning size={14} /> Simulate Advisory
          </button>
          <button className="btn btn-secondary" onClick={() => { setLoading(true); fetchData(); }} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> {loading ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      {advisoryActive && (
        <div className="glass" style={{ padding: '16px 24px', marginBottom: 24, borderLeft: '4px solid var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'slideIn 0.3s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <AlertTriangle size={20} color="var(--orange)" />
             </div>
             <div>
               <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--orange)' }}>ACTIVE SYSTEM ADVISORY</h4>
               <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{advisory.message || 'Severe Monsoon Rain. Expect +15m delays on average dispatch routes. Drivers advised to reduce speeds.'}</p>
             </div>
          </div>
          <div style={{ textAlign: 'right' }}>
             <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800 }}>ETA IMPACT CALCULATION</div>
             <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)' }}>+{advisory.eta_impact_percent || 15}% Transit Time</div>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card red">
          <div className="stat-card-header">
            <div className="stat-card-icon"><AlertTriangle size={20} /></div>
            <span className="stat-card-label">Active Emergencies</span>
          </div>
          <div className="stat-card-value">{s.activeEmergencies || 0}</div>
          <div className="stat-card-sub">{s.pendingRequests || 0} pending · {s.activeDispatches || 0} dispatched</div>
        </div>
        <div className="stat-card green">
          <div className="stat-card-header">
            <div className="stat-card-icon"><Truck size={20} /></div>
            <span className="stat-card-label">Available Fleet</span>
          </div>
          <div className="stat-card-value">{s.availableAmbulances || 0}</div>
          <div className="stat-card-sub">{s.dispatchedAmbulances || 0} currently dispatched</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-card-header">
            <div className="stat-card-icon"><BedDouble size={20} /></div>
            <span className="stat-card-label">Hospital Beds</span>
          </div>
          <div className="stat-card-value">{(s.totalGeneralBeds || 0) + (s.totalIcuBeds || 0)}</div>
          <div className="stat-card-sub">{s.totalGeneralBeds || 0} general · {s.totalIcuBeds || 0} ICU</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-card-header">
            <div className="stat-card-icon"><Users size={20} /></div>
            <span className="stat-card-label">On-Duty Drivers</span>
          </div>
          <div className="stat-card-value">{s.onDutyDrivers || 0}</div>
          <div className="stat-card-sub">
            {s.maintenanceAlerts > 0 ? (
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>⚠️ {s.maintenanceAlerts} maintenance alerts</span>
            ) : (
              'Ready for dispatch'
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
             <div className="stat-card-icon" style={{ color: 'var(--orange)' }}><Zap size={20} /></div>
             <span className="stat-card-label">Fleet Utilization</span>
          </div>
          <div className="stat-card-value">
            {Math.round((s.dispatchedAmbulances / (s.availableAmbulances + s.dispatchedAmbulances || 1)) * 100)}%
          </div>
          <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ 
              width: `${(s.dispatchedAmbulances / (s.availableAmbulances + s.dispatchedAmbulances || 1)) * 100}%`, 
              height: '100%', 
              background: 'var(--orange)',
              boxShadow: '0 0 10px var(--orange)'
            }} />
          </div>
        </div>
      </div>

      <div className="table-wrapper" style={{ marginBottom: 20 }}>
        <div className="table-header">
          <h3><span className="pulse-dot"></span> Live Emergency Feed</h3>
        </div>
        {data?.activeView?.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Patient / Medical</th><th>Blood</th><th>Severity</th>
                <th>Status</th><th>Ambulance</th><th>Hospital</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.activeView?.map((row) => (
                <tr key={row.request_id || row.id} className={row.severity_level === 'Critical' ? 'row-glow-critical' : row.severity_level === 'High' ? 'row-glow-high' : ''}>
                  <td style={{ fontWeight: 600 }}>#{row.request_id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{row.patient_name}</div>
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                      <select 
                        className="form-input btn-sm" 
                        style={{ fontSize: 10, padding: '2px 8px', width: 'auto', background: 'rgba(255,255,255,0.05)' }}
                        value={row.primary_specialization || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          await fetch('/api/patients', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patient_id: row.patient_id, primary_specialization: val }) });
                          fetchData();
                        }}
                      >
                        <option value="">General Care</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Trauma Surgery">Trauma</option>
                        <option value="Burn Unit">Burn Unit</option>
                        <option value="Pediatrics">Pediatrics</option>
                      </select>
                      {!row.primary_specialization && row.suggested_spec && (
                        <span className="badge" style={{ fontSize: 9, background: 'rgba(10,132,255,0.1)', color: 'var(--blue)', cursor: 'help' }} title="AI Suggestion based on patient profile">
                          💡 Suggest: {row.suggested_spec}
                        </span>
                      )}
                      
                      {row.patient_lat && row.patient_lon && (
                        <button 
                          onClick={() => setMapModal({
                            open: true,
                            title: `Location: ${row.patient_name}`,
                            pickupCoords: { lat: row.patient_lat, lon: row.patient_lon },
                            driver_id: row.driver_id,
                            realtimeMarker: row.ambulance_lat && row.ambulance_lon ? {
                              lat: row.ambulance_lat,
                              lng: row.ambulance_lon,
                              id: row.assigned_ambulance,
                              title: `Ambulance ${row.assigned_ambulance}`
                            } : null
                          })}
                          style={{ fontSize: 11, color: 'var(--blue)', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 500, background: 'rgba(10,132,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}
                          title="View Live Location"
                        >
                          <Navigation size={12} /> Map
                        </button>
                      )}
                    </div>
                  </td>
                  <td><span className="badge badge-critical" style={{ fontSize: 11 }}>{row.blood_type}</span></td>
                  <td><SeverityBadge level={row.severity_level} /></td>
                  <td><StatusBadge status={row.request_status} /></td>
                  <td>
                    {row.assigned_ambulance ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{row.assigned_ambulance}</span>
                        {row.driver_name && (
                          <button 
                            onClick={() => alert(`PARAMEDIC CONTACT INFO:\n\nName: ${row.driver_name}\nPhone: ${row.driver_phone || '+8801711223344'}\nAmbulance: ${row.assigned_ambulance}\n\nCall/dispatch radio setup initialized.`)}
                            style={{ 
                              fontSize: 10, 
                              color: 'var(--blue)', 
                              background: 'none', 
                              border: 'none', 
                              cursor: 'pointer', 
                              padding: 0, 
                              textAlign: 'left', 
                              textDecoration: 'underline',
                              fontWeight: '600',
                              marginTop: 2,
                              display: 'block'
                            }}
                          >
                            📞 {row.driver_name}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {row.destination_hospital || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    {row.hospital_type && (
                      <div style={{ fontSize: 10, color: row.hospital_type === 'Government' ? 'var(--blue)' : 'var(--green)', fontWeight: 600, marginTop: 2 }}>
                        {row.hospital_type}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>

                      {row.request_status === 'Broadcast' && (
                        <button className="btn btn-primary btn-sm"
                          onClick={() => setAssignModal({ open: true, request_id: row.request_id, driver_id: '', vehicle_id: '' })}>
                          Manual Assign
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        const contact = row.emergency_contact;
                        alert(`MEDICAL PROFILE: ${row.patient_name}\n\nBlood Type: ${row.blood_type}\nConditions: ${(row.conditions || []).join(', ') || 'None reported'}\n\nSpecial Notes: ${row.special_notes || 'No special requirements'}\n\nEmergency Contact: ${contact?.name || 'Unknown'} (${contact?.relationship || 'N/A'})\nPhone: ${contact?.phone || 'N/A'}`);
                      }}>
                        Profile
                      </button>
                      {row.request_status === 'Admitted' && (
                        <button className="btn btn-sm"
                          style={{ background: 'var(--green-dim)', color: 'var(--green)', borderColor: 'var(--green-glow)' }}
                          onClick={async () => {
                            await fetch('/api/driver/accept', { 
                              method: 'POST', 
                              headers: { 'Content-Type': 'application/json' }, 
                              body: JSON.stringify({ request_id: row.request_id, action: 'Discharge' }) 
                            });
                            fetchData();
                          }}>
                          Discharge
                        </button>
                      )}
                      {row.trip_id && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setActiveChatTrip(row)}>
                          <MessageCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state"><p>No active emergencies</p></div>
        )}
      </div>

      {activeChatTrip && (
        <div className="modal-overlay" onClick={() => setActiveChatTrip(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Chat with Driver (Trip #{activeChatTrip.request_id})</h3>
              <button className="btn-ghost" onClick={() => setActiveChatTrip(null)}><X size={18}/></button>
            </div>
            <div style={{ padding: 16, height: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data?.chatMessages || []).filter(m => m.trip_id === String(activeChatTrip.request_id)).map((m) => (
                <div key={m.message_id || Math.random()} style={{ alignSelf: m.sender === 'Dispatcher' ? 'flex-end' : 'flex-start', background: m.sender === 'Dispatcher' ? 'var(--blue)' : 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: 12, maxWidth: '80%' }}>
                  <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>{m.sender}</div>
                  <div style={{ fontSize: 13 }}>{m.message_text}</div>
                </div>
              ))}
            </div>
           

            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Type a message..." 
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
              />
              <button type="submit" className="btn btn-primary"><Send size={18}/></button>
            </form>
          </div>
        </div>
      )}

      {(data?.recentTrips?.length > 0 || data?.trend?.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div className="table-wrapper">
            <div className="table-header">
              <h3><Clock size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Recent Dispatches</h3>
            </div>
            {data?.recentTrips?.length > 0 ? (
              <table>
                <thead>
                  <tr><th>Trip</th><th>Patient</th><th>Ambulance</th><th>Hospital</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {data?.recentTrips?.map((t) => (
                    <tr key={t.trip_id || t.id}>
                      <td style={{ fontWeight: 600 }}>#{t.trip_id}</td>
                      <td>{t.patient_name}</td>
                      <td>{t.license_plate}</td>
                      <td>{t.hospital_name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{new Date(t.time_dispatched).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state" style={{ padding: 40 }}><p>No recent dispatches</p></div>
            )}
          </div>

          <div className="table-wrapper">
            <div className="table-header">
              <h3><Zap size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Weekly Volume Trend</h3>
            </div>
            <div style={{ padding: '24px 16px 16px' }}>
              <TrendGraph trend={data?.trend} />
            </div>
            <div style={{ padding: 16, borderTop: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Medical Breakdown</h4>
              <SpecializationDistribution stats={data?.specializationStats} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 15, borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Peak Load</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{Math.max(...(data?.trend || []).map(t => parseInt(t.count)), 0)} Calls/Day</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Status</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>OPTIMAL</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overwork Monitoring Section */}
      <div className="table-wrapper" style={{ marginTop: 20 }}>
        <div className="table-header">
          <h3><AlertTriangle size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8, color: 'var(--red)' }} /> Driver Overwork Monitoring (Current Month)</h3>
        </div>
        {data?.overworkStats?.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Phone</th>
                <th>Total Trips</th>
                <th>Active Days</th>
                <th>Avg Duty (hrs/day)</th>
                <th>Fatigue Risk Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.overworkStats.map((row) => (
                <tr key={row.driver_id} className={row.fatigue_risk_status === 'CRITICAL_OVERLOAD' ? 'row-glow-critical' : row.fatigue_risk_status === 'OVERTIME' ? 'row-glow-high' : ''}>
                  <td style={{ fontWeight: 600 }}>{row.driver_name} <br/><span style={{fontSize: 10, color: 'var(--text-muted)'}}>EMP-{row.driver_id.toString().padStart(4, '0')}</span></td>
                  <td>{row.phone || 'N/A'}</td>
                  <td>{row.total_monthly_trips}</td>
                  <td>{row.active_duty_days}</td>
                  <td style={{ fontWeight: 700 }}>{row.avg_daily_duty_hours}h</td>
                  <td>
                    {row.fatigue_risk_status === 'CRITICAL_OVERLOAD' && <span className="badge badge-critical" style={{ fontSize: 10 }}>CRITICAL OVERLOAD</span>}
                    {row.fatigue_risk_status === 'OVERTIME' && <span className="badge badge-high" style={{ fontSize: 10 }}>OVERTIME</span>}
                    {row.fatigue_risk_status === 'NORMAL' && <span className="badge" style={{ fontSize: 10, background: 'var(--green-dim)', color: 'var(--green)' }}>NORMAL</span>}
                  </td>
                  <td>
                    {parseFloat(row.avg_daily_duty_hours) >= 8 && (
                      <button 
                        className="btn btn-sm" 
                        style={{ background: 'rgba(255, 69, 58, 0.15)', color: 'var(--red)', border: '1px solid rgba(255, 69, 58, 0.3)' }}
                        onClick={async () => {
                          const conf = window.confirm(`Send rest warning to ${row.driver_name}?`);
                          if (!conf) return;
                          try {
                            const res = await fetch('/api/dispatcher/driver-warnings', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                driver_id: row.driver_id,
                                alert_type: 'OVERLOAD_WARNING',
                                title: 'Mandatory Rest Warning',
                                message: 'সতর্কবার্তা: আপনি লাগাতার অতিরিক্ত ডিউটি ও অতিরিক্ত ট্রিপ সম্পন্ন করেছেন। অবিলম্বে বিরতি নিন!'
                              })
                            });
                            if (res.ok) {
                              toast('Warning sent successfully', 'success');
                            } else {
                              toast('Failed to send warning', 'error');
                            }
                          } catch (e) {
                            toast('Network error', 'error');
                          }
                        }}
                      >
                        Send Rest Warning
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state" style={{ padding: 40 }}><p>No overwork data available</p></div>
        )}
      </div>

      {mapModal.open && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 9999 }} onClick={(e) => { if (typeof e.target.className === 'string' && e.target.className.includes('modal-overlay')) setMapModal({ ...mapModal, open: false }) }}>
          <div className="modal-content" style={{ width: '90vw', maxWidth: '1200px', height: '85vh', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}><MapIcon size={20} /> {mapModal.title}</h3>
              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setMapModal({ ...mapModal, open: false })}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <MapView 
                pickupCoords={mapModal.pickupCoords} 
                realtimeMarker={mapModal.realtimeMarker}
              />
            </div>
          </div>
        </div>
      )}

      {assignModal.open && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <h3>Manual Driver Assignment</h3>
            <p>Forcefully assign a specific driver to request #{assignModal.request_id}</p>
            
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>Select Driver</label>
              <select 
                className="form-input" 
                value={assignModal.driver_id}
                onChange={e => setAssignModal({...assignModal, driver_id: e.target.value})}
              >
                <option value="">-- Choose a driver --</option>
                {data.drivers?.filter(d => d.shift_status === 'On_Duty' || d.shift_status === 'Available').map(d => (
                  <option key={d.driver_id} value={d.driver_id}>{d.name} ({d.shift_status})</option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>Select Ambulance</label>
              <select 
                className="form-input" 
                value={assignModal.vehicle_id}
                onChange={e => setAssignModal({...assignModal, vehicle_id: e.target.value})}
              >
                <option value="">-- Choose an ambulance --</option>
                {data.ambulances?.filter(a => a.current_status === 'Available').map(a => (
                  <option key={a.vehicle_id} value={a.vehicle_id}>{a.license_plate} ({a.equipment_level})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setAssignModal({ open: false, request_id: null, driver_id: '', vehicle_id: '' })}>Cancel</button>
              <button className="btn btn-primary" onClick={handleManualAssignSubmit}>Assign Mission</button>
            </div>
          </div>
        </div>
      )}

      {/* Congratulatory Approval Pop-up Modal */}
      {showApprovedModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: 20
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid #10b981',
            borderRadius: 24,
            maxWidth: 520,
            width: '100%',
            padding: 32,
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(16, 185, 129, 0.3)',
            animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              fontSize: 36
            }}>
              🎉
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#10b981', margin: '0 0 8px 0' }}>
              অভিনন্দন! আপনার ডিসপ্যাচার একাউন্ট ভেরিফাইড
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              দ্রুত সেবা প্ল্যাটফর্মে আপনার আবেদনটি অ্যাডমিন কর্তৃক সফলভাবে অনুমোদিত ও সক্রিয় করা হয়েছে। লাইভ ইমার্জেন্সি কিউ, হাসপাতাল শয্যা বরাদ্দ এবং অ্যাম্বুলেন্স ট্র্যাকিং সিস্টেম পরিচালনা করার জন্য আপনি প্রস্তুত। সর্বদা দ্রুত ও নির্ভুল সেবাদানে সচেষ্ট থাকুন।
            </p>

            <button
              onClick={() => setShowApprovedModal(false)}
              style={{
                width: '100%',
                height: 46,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                fontSize: 14,
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
              }}
            >
              কমান্ড সেন্টারে প্রবেশ করুন ➔
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
