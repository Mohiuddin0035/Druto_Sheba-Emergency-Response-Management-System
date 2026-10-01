'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { 
  Mail, Send, Search, UserCheck, ShieldAlert, AlertTriangle, 
  FileText, CheckCircle2, RefreshCw, Loader2, Sparkles, Clock, History, User
} from 'lucide-react';

export default function AdminMailPage() {
  const [data, setData] = useState({ drivers: [], patients: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form states
  const [recipientType, setRecipientType] = useState('DRIVER'); // 'DRIVER' | 'PATIENT'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [category, setCategory] = useState('WARNING');
  const [selectedPresetId, setSelectedPresetId] = useState(null);

  const fetchDirectory = useCallback(() => {
    fetch(`/api/admin/mail?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setData(d);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  useAutoRefresh(fetchDirectory);

  // Reset selected recipient when changing recipient type
  const handleTypeChange = (type) => {
    setRecipientType(type);
    setSelectedRecipient(null);
    setSearchQuery('');
    setCategory(type === 'DRIVER' ? 'WARNING' : 'GENERAL');
  };

  // Filter recipient candidates by username (primary) and name/phone
  const candidateList = recipientType === 'DRIVER' ? data.drivers : data.patients;
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidateList.slice(0, 10);
    const q = searchQuery.toLowerCase().trim();
    return candidateList.filter(c => 
      (c.username && c.username.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    ).slice(0, 10);
  }, [candidateList, searchQuery]);

  // Presets definition
  const driverPresets = useMemo(() => [
    {
      id: 'd_polite_7',
      label: '7-Day Overdue (Company Ambulance)',
      category: 'WARNING',
      priority: 'HIGH',
      subject: 'গুরুত্বপূর্ণ — Payment ও Druto Sheba Ambulance ফেরত দেওয়ার অনুরোধ',
      getBody: (rec) => {
        const name = rec?.name || '{DRIVER_NAME}';
        const due = rec?.cumulative_due ? `৳${parseFloat(rec.cumulative_due).toLocaleString()}` : '৳{TOTAL_DUE}';
        return `প্রিয় ${name},\n\nআপনার account-এর payment গত ৭ দিন ধরে বকেয়া রয়েছে। আপনার বর্তমান মোট বকেয়া ${due}।\n\nযেহেতু আপনার কাছে থাকা ambulanceটি Druto Sheba-এর নিজস্ব সম্পত্তি, তাই বিষয়টি দ্রুত সমাধান করা প্রয়োজন।\n\nআপনাকে অনুরোধ করা হচ্ছে নির্ধারিত সময়ের মধ্যে:\n• মোট বকেয়া ${due} এবং প্রযোজ্য ৳500 penalty পরিশোধ করতে\n• Druto Sheba office-এ এসে payment সম্পন্ন করতে\n• কোম্পানির ambulance এবং এর keys যথাযথভাবে ফেরত দিতে\n\nকোনো কারণে আপনার payment amount নিয়ে কোনো সমস্যা বা ভুল মনে হলে, অনুগ্রহ করে নির্ধারিত সময়ের মধ্যে Druto Sheba Administration-এর সঙ্গে যোগাযোগ করুন।\n\nআমরা আশা করি বিষয়টি আপনার সহযোগিতায় সুন্দরভাবে সমাধান হবে।\n\nDruto Sheba Administration`;
      }
    },
    {
      id: 'd_legal_9',
      label: '9-11 Days Overdue (Legal Demand)',
      category: 'LEGAL_NOTICE',
      priority: 'URGENT',
      subject: 'আইনি পদক্ষেপের নোটিশ — Druto Sheba Ambulance ফেরত দিন',
      getBody: (rec) => {
        const name = rec?.name || '{DRIVER_NAME}';
        const due = rec?.cumulative_due ? `৳${parseFloat(rec.cumulative_due).toLocaleString()}` : '৳{TOTAL_DUE}';
        const days = rec?.consecutive_days_overdue || '৯';
        return `প্রিয় ${name},\n\nআপনার account-এ মোট বকেয়া ${due} গত ${days} দিন ধরে অপরিশোধিত রয়েছে। পূর্ববর্তী নোটিশের পরেও আপনি Druto Sheba-এর কোম্পানি অ্যাম্বুলেন্স ফেরত দেননি বা পাওনা পরিশোধ করেননি।\n\nআপনাকে অবিলম্বে Druto Sheba অফিসে যোগাযোগ করে অ্যাম্বুলেন্স এবং এর চাবি হস্তান্তর করার নির্দেশ দেওয়া হচ্ছে। ব্যর্থতায় আপনার বিরুদ্ধে যানবাহন আত্মসাৎ ও চুক্তি ভঙ্গের অভিযোগে যথাযথ আইনি ব্যবস্থা গ্রহণ করা হবে।\n\nDruto Sheba Administration`;
      }
    },
    {
      id: 'd_final_12',
      label: '12+ Days Final Notice (Legal & Recovery)',
      category: 'LEGAL_NOTICE',
      priority: 'URGENT',
      subject: 'FINAL NOTICE — বকেয়া Payment ও Company Ambulance ফেরত',
      getBody: (rec) => {
        const name = rec?.name || '{DRIVER_NAME}';
        const due = rec?.cumulative_due ? `৳${parseFloat(rec.cumulative_due).toLocaleString()}` : '৳{TOTAL_DUE}';
        return `প্রিয় ${name},\n\nএটি আপনার বকেয়া payment এবং Druto Sheba-এর মালিকানাধীন ambulance ফেরত দেওয়ার বিষয়ে চূড়ান্ত নোটিশ।\n\nআপনার account-এর বর্তমান মোট বকেয়া ${due} এবং প্রযোজ্য ৳500 penalty এখনো পরিশোধ করা হয়নি। একইসঙ্গে Druto Sheba-এর ambulance ও keys-ও ফেরত দেওয়া হয়নি।\n\nআপনাকে শেষবারের মতো অনুরোধ করা হচ্ছে নির্ধারিত সময়ের মধ্যে:\n১. মোট বকেয়া ও প্রযোজ্য penalty পরিশোধ করতে।\n২. Druto Sheba office-এ এসে ambulance ও keys ফেরত দিতে।\n\nনির্ধারিত সময়ের মধ্যে বিষয়টি সমাধান না হলে, Druto Sheba কোম্পানির পাওনা অর্থ এবং সম্পত্তি ফেরত পাওয়ার জন্য প্রযোজ্য আইন অনুযায়ী পরবর্তী আইনগত ব্যবস্থা গ্রহণ করতে বাধ্য হতে পারে।\n\nএটি Druto Sheba platform-এর মাধ্যমে প্রদান করা আপনার চূড়ান্ত নোটিশ।\n\nDruto Sheba Administration`;
      }
    },
    {
      id: 'd_suspension_own',
      label: 'Own Ambulance Account Suspension',
      category: 'SUSPENSION',
      priority: 'URGENT',
      subject: 'Druto Sheba Driver Account বাতিলের নোটিশ',
      getBody: (rec) => {
        const name = rec?.name || '{DRIVER_NAME}';
        return `প্রিয় ${name},\n\nআপনার Druto Sheba account-এর নির্ধারিত payment গত ৭ দিন ধরে বকেয়া রয়েছে এবং এ বিষয়ে আপনাকে নিয়মিত reminder প্রদান করা হয়েছে।\n\nনির্ধারিত সময়ের মধ্যে payment সম্পন্ন না হওয়ায় আপনার Driver Account Druto Sheba platform থেকে বাতিল করা হয়েছে। এখন থেকে আপনি এই account ব্যবহার করে Druto Sheba-এর মাধ্যমে কোনো ambulance service প্রদান করতে পারবেন না।\n\nযেহেতু ambulanceটি আপনার নিজস্ব, তাই Druto Sheba-এর কোনো vehicle বা property ফেরত দেওয়ার প্রয়োজন নেই।\n\nআপনার account বাতিলের সঙ্গে এই outstanding platform commission-এর জন্য আপনার কাছ থেকে আর কোনো payment দাবি করা হবে না।\n\nধন্যবাদ Druto Sheba-এর সঙ্গে কাজ করার জন্য।\n\nDruto Sheba Administration`;
      }
    },
    {
      id: 'd_partial_reject',
      label: 'Verification Partial Fee Rejection & Refund',
      category: 'PAYMENT_REMINDER',
      priority: 'HIGH',
      subject: 'ভেরিফিকেশন আবেদন বাতিল ও ৪৮ ঘণ্টার রিফান্ড নোটিশ',
      getBody: (rec) => {
        const name = rec?.name || '{DRIVER_NAME}';
        return `প্রিয় ${name},\n\nআপনার ভেরিফিকেশন ফি সম্পূর্ণ (৳৫০০) পরিশোধ না করায় আবেদনটি সাময়িকভাবে বাতিল করা হয়েছে। আপনার প্রেরিত অর্থ আগামী ৪৮ ঘণ্টার মধ্যে আপনার পেমেন্টকৃত মোবাইল নম্বরে রিফান্ড করে দেওয়া হবে। অনুগ্রহ করে পরবর্তীতে সঠিক ও সম্পূর্ণ ফি প্রদান করে আবেদন সম্পন্ন করুন।\n\nধন্যবাদ,\nDruto Sheba Administration`;
      }
    },
    {
      id: 'd_welcome_active',
      label: 'Account Verified & Activated Welcome Msg',
      category: 'GENERAL',
      priority: 'NORMAL',
      subject: 'অভিনন্দন! আপনার ড্রাইভার অ্যাকাউন্ট সক্রিয় করা হয়েছে',
      getBody: (rec) => {
        const name = rec?.name || '{DRIVER_NAME}';
        return `প্রিয় ${name},\n\nঅভিনন্দন! দ্রুত সেবা প্ল্যাটফর্মে আপনার ড্রাইভার অ্যাকাউন্টটি সফলভাবে ভেরিফাইড ও সক্রিয় করা হয়েছে। অনুগ্রহ করে প্ল্যাটফর্মের সকল ট্রাফিক ও সুরক্ষা নীতিমালা মেনে চলুন এবং আপনার দৈনিক কমিশন নিয়মিত পরিশোধ রাখুন। যেকোনো প্রয়োজনে আমাদের হটলাইনে যোগাযোগ করুন। দ্রুত সেবা পরিবারের সাথে আপনার একটি নিরাপদ ও সমৃদ্ধ যাত্রা কামনা করছি।\n\nDruto Sheba Administration`;
      }
    }
  ], []);

  const patientPresets = useMemo(() => [
    {
      id: 'p_refund_notice',
      label: 'Appointment Cancelled & 48h Refund Notice',
      category: 'REFUND_NOTICE',
      priority: 'HIGH',
      subject: '⚠️ অ্যাপয়েন্টমেন্ট বাতিল ও ৪৮ ঘণ্টার রিফান্ড নোটিশ',
      getBody: (rec) => {
        const name = rec?.name || '{PATIENT_NAME}';
        return `প্রিয় ${name},\n\nআপনার ডক্টর অ্যাপয়েন্টমেন্টের পেমেন্ট ভেরিফিকেশন সম্পন্ন না হওয়ায় বা আংশিক হওয়ায় অ্যাপয়েন্টমেন্টটি বাতিল করা হয়েছে। আপনি বিকাশ/রকেটে যে অর্থ প্রদান করেছিলেন, তা আগামী ৪৮ ঘণ্টার মধ্যে আপনার প্রেরক মোবাইল নম্বরে রিফান্ড করে দেওয়া হবে। কোনো জিজ্ঞাসার জন্য দ্রুত সেবা হেল্পলাইনে যোগাযোগ করুন।\n\nDruto Sheba Administration`;
      }
    },
    {
      id: 'p_appointment_confirmed',
      label: 'Appointment Confirmed Official Success',
      category: 'APPOINTMENT_CONFIRMED',
      priority: 'HIGH',
      subject: '✅ Doctor Appointment Confirmed',
      getBody: (rec) => {
        const name = rec?.name || '{PATIENT_NAME}';
        return `প্রিয় ${name},\n\nআপনার অ্যাপয়েন্টমেন্ট কনফার্মেশন ফি (৳১০০) সফলভাবে ভেরিফাইড হয়েছে এবং ডাক্তারের সাথে আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত করা হয়েছে। নির্ধারিত সময়ের ১৫ মিনিট পূর্বে হাসপাতালে উপস্থিত থাকার অনুরোধ করা হচ্ছে।\n\nDruto Sheba Medical Services`;
      }
    },
    {
      id: 'p_urgent_medical_alert',
      label: 'Important Medical Schedule Update',
      category: 'GENERAL',
      priority: 'HIGH',
      subject: 'জরুরি নোটিশ — ডক্টর অ্যাপয়েন্টমেন্ট শিডিউল পরিবর্তন',
      getBody: (rec) => {
        const name = rec?.name || '{PATIENT_NAME}';
        return `প্রিয় ${name},\n\nঅনিবার্য কারণবশত আপনার নির্ধারিত ডক্টর অ্যাপয়েন্টমেন্টের শিডিউলে পরিবর্তন আনা হয়েছে। বিস্তারিত সময়সূচি জানতে আপনার পেশেন্ট পোর্টালের 'My Appointments' সেকশন ভিজিট করুন অথবা আমাদের মেডিকেল সাপোর্ট ডেস্কে কল করুন।\n\nDruto Sheba Administration`;
      }
    }
  ], []);

  const activePresets = recipientType === 'DRIVER' ? driverPresets : patientPresets;

  const handleApplyPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setSubject(preset.subject);
    setCategory(preset.category);
    setPriority(preset.priority);
    setBody(preset.getBody(selectedRecipient));
  };

  const handleSelectRecipient = (rec) => {
    setSelectedRecipient(rec);
    setSearchQuery(rec.username);
    // If a preset was already selected, update the body with this recipient's variables
    if (selectedPresetId) {
      const p = activePresets.find(x => x.id === selectedPresetId);
      if (p) {
        setBody(p.getBody(rec));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecipient) {
      alert(`Please search and select a specific ${recipientType === 'DRIVER' ? 'driver' : 'patient'} username first.`);
      return;
    }
    if (!subject.trim() || !body.trim()) {
      alert('Please fill out Subject and Message Body.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/admin/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_type: recipientType,
          recipient_id: recipientType === 'DRIVER' ? selectedRecipient.driver_id : selectedRecipient.patient_id,
          title: subject,
          body,
          priority,
          category
        })
      });

      if (res.ok) {
        alert(`Notice successfully delivered to ${selectedRecipient.name} (@${selectedRecipient.username})!`);
        setSubject('');
        setBody('');
        setSelectedRecipient(null);
        setSearchQuery('');
        setSelectedPresetId(null);
        fetchDirectory();
      } else {
        const err = await res.json();
        alert('Failed: ' + err.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2>Official Mail & Correspondence Desk</h2>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 12, background: 'rgba(0, 122, 255, 0.15)', color: 'var(--blue)' }}>
              CENTRAL DISPATCH
            </span>
          </div>
          <p className="page-header-sub">
            Directly send warnings, legal notices, verification confirmations, and refund notices to Driver or Patient inboxes.
          </p>
        </div>

        <button 
          onClick={fetchDirectory} 
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Directory
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1.4fr) minmax(300px, 1fr)', gap: 24 }}>
        
        {/* Left Column: Composer Form */}
        <div className="card" style={{ padding: 24, borderRadius: 16 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* Recipient Type Selector */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8 }}>
                1. Select Recipient Portal
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => handleTypeChange('DRIVER')}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 10, fontWeight: 800, fontSize: 14,
                    border: recipientType === 'DRIVER' ? '2px solid var(--blue)' : '1px solid var(--border-subtle)',
                    background: recipientType === 'DRIVER' ? 'rgba(0, 122, 255, 0.1)' : 'var(--bg-secondary)',
                    color: recipientType === 'DRIVER' ? 'var(--blue)' : 'var(--text-muted)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}
                >
                  <UserCheck size={18} /> Driver Portal
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('PATIENT')}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 10, fontWeight: 800, fontSize: 14,
                    border: recipientType === 'PATIENT' ? '2px solid #ff2d55' : '1px solid var(--border-subtle)',
                    background: recipientType === 'PATIENT' ? 'rgba(255, 45, 85, 0.1)' : 'var(--bg-secondary)',
                    color: recipientType === 'PATIENT' ? '#ff2d55' : 'var(--text-muted)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}
                >
                  <User size={18} /> Patient Portal
                </button>
              </div>
            </div>

            {/* Unique Username Search & Selection */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8 }}>
                2. Search By Unique Username (e.g. {recipientType === 'DRIVER' ? 'karimahmed1, driver102' : 'saikat103, riazkhan2'})
              </label>
              
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder={`Search ${recipientType.toLowerCase()} unique username...`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (selectedRecipient && selectedRecipient.username !== e.target.value) {
                      setSelectedRecipient(null);
                    }
                  }}
                  style={{
                    width: '100%', padding: '12px 14px 12px 40px', borderRadius: 10,
                    border: selectedRecipient ? '2px solid var(--green)' : '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)', fontSize: 14, fontWeight: 600
                  }}
                />
                {selectedRecipient && (
                  <span style={{ position: 'absolute', right: 12, top: 10, fontSize: 11, fontWeight: 800, background: 'rgba(52, 199, 89, 0.15)', color: 'var(--green)', padding: '4px 8px', borderRadius: 6 }}>
                    ✓ SELECTED
                  </span>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {!selectedRecipient && searchQuery.trim() && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 10,
                  background: 'var(--bg-primary)', border: '1px solid var(--border-accent)', borderRadius: 10,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.3)', maxHeight: 220, overflowY: 'auto'
                }}>
                  {filteredCandidates.length === 0 ? (
                    <div style={{ padding: 12, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                      No {recipientType.toLowerCase()} found matching "{searchQuery}"
                    </div>
                  ) : (
                    filteredCandidates.map(c => (
                      <div
                        key={c.driver_id || c.patient_id}
                        onClick={() => handleSelectRecipient(c)}
                        style={{
                          padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>
                            @{c.username}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {c.name} • {c.phone}
                          </div>
                        </div>
                        {recipientType === 'DRIVER' && c.cumulative_due > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--red)' }}>
                            Due: ৳{parseFloat(c.cumulative_due).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Selected Details Card */}
              {selectedRecipient && (
                <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(52, 199, 89, 0.08)', borderRadius: 8, border: '1px solid rgba(52, 199, 89, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13 }}>
                    Recipient: <strong>{selectedRecipient.name}</strong> (@{selectedRecipient.username}) | Phone: <strong>{selectedRecipient.phone}</strong>
                    {recipientType === 'DRIVER' && (
                      <span style={{ marginLeft: 8, color: selectedRecipient.cumulative_due > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
                        {selectedRecipient.cumulative_due > 0 ? `Total Due: ৳${parseFloat(selectedRecipient.cumulative_due).toLocaleString()}` : 'No Dues'}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRecipient(null);
                      setSearchQuery('');
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Quick Presets Buttons */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Sparkles size={14} color="var(--yellow)" />
                <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>
                  3. Quick Message Presets (Auto-fills Subject & Body)
                </label>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {activePresets.map(preset => {
                  const isActive = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        border: isActive ? '1.5px solid var(--blue)' : '1px solid var(--border-subtle)',
                        background: isActive ? 'rgba(0, 122, 255, 0.15)' : 'var(--bg-secondary)',
                        color: isActive ? 'var(--blue)' : 'var(--text-secondary)',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject Field */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 6 }}>
                Subject / Title
              </label>
              <input
                required
                type="text"
                placeholder="Enter official notice subject..."
                value={subject}
                onChange={e => setSubject(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontSize: 14, fontWeight: 600 }}
              />
            </div>

            {/* Body Textarea */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 6 }}>
                Message Body
              </label>
              <textarea
                required
                rows={9}
                placeholder="Type your official notice or warning message here..."
                value={body}
                onChange={e => setBody(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontSize: 13, lineHeight: 1.6, resize: 'vertical' }}
              />
            </div>

            {/* Priority & Category Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Notice Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontSize: 13 }}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High (Important)</option>
                  <option value="URGENT">Urgent (Red Alert)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Classification</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontSize: 13 }}
                >
                  <option value="GENERAL">General Notice</option>
                  <option value="WARNING">Official Warning</option>
                  <option value="LEGAL_NOTICE">Legal Notice</option>
                  <option value="SUSPENSION">Account Suspension</option>
                  <option value="PAYMENT_REMINDER">Payment / Refund</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={sending}
              className="btn btn-primary"
              style={{ padding: 14, fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {sending ? 'Dispatching Notice...' : `Send Official Notice to ${recipientType}`}
            </button>

          </form>
        </div>

        {/* Right Column: Dispatch History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
              <History size={18} color="var(--blue)" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Recent Official Dispatches</h3>
            </div>

            {data.history.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No recent official mail dispatches recorded.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 600, overflowY: 'auto' }}>
                {data.history.map(item => (
                  <div 
                    key={item.message_id} 
                    style={{ 
                      padding: 14, borderRadius: 10, background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-subtle)', borderLeft: item.priority === 'URGENT' ? '4px solid var(--red)' : item.priority === 'HIGH' ? '4px solid var(--orange)' : '4px solid var(--blue)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ 
                          fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, 
                          background: item.recipient_type === 'DRIVER' ? 'rgba(0, 122, 255, 0.15)' : 'rgba(255, 45, 85, 0.15)',
                          color: item.recipient_type === 'DRIVER' ? 'var(--blue)' : '#ff2d55'
                        }}>
                          {item.recipient_type}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>
                          {item.recipient_name} (@{item.recipient_username})
                        </span>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {item.title}
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
