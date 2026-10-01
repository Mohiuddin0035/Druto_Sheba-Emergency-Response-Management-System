'use client';

import { useState, useEffect } from 'react';
import { Monitor, Smartphone, Check, X, ShieldAlert } from 'lucide-react';

export default function MobileDeviceNotice() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Only detect on client-side
    const checkMobile = () => {
      const isMobileWidth = window.innerWidth <= 768;
      const isMobileAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const dismissed = sessionStorage.getItem('mobile_view_dismissed');

      if ((isMobileWidth || isMobileAgent) && !dismissed) {
        setShowModal(true);
      }
    };

    checkMobile();
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('mobile_view_dismissed', 'true');
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      background: 'rgba(3, 3, 10, 0.88)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'var(--font-inter), sans-serif',
      animation: 'fadeInNotice 0.3s ease-out'
    }}>
      <style>{`
        @keyframes fadeInNotice {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'linear-gradient(145deg, rgba(20, 24, 38, 0.95), rgba(10, 12, 22, 0.98))',
        border: '1px solid rgba(0, 240, 255, 0.25)',
        borderRadius: '24px',
        padding: '28px 24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(0, 240, 255, 0.15)',
        color: '#F0F5FF',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Top Glow & Badge */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(255, 0, 85, 0.2), rgba(0, 240, 255, 0.2))',
          border: '1px solid rgba(0, 240, 255, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: '#00F0FF',
          boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)'
        }}>
          <Monitor size={28} />
        </div>

        <h3 style={{
          fontSize: '20px',
          fontWeight: 800,
          marginBottom: '8px',
          color: '#ffffff',
          letterSpacing: '-0.3px',
          fontFamily: 'var(--font-outfit), sans-serif'
        }}>
          Desktop Experience Recommended
        </h3>

        <p style={{
          fontSize: '13.5px',
          lineHeight: '1.6',
          color: '#9BA4B5',
          marginBottom: '20px',
          fontWeight: 400
        }}>
          <b style={{ color: '#00F0FF' }}>Druto Sheba</b>-এর লাইভ রাডার ম্যাপ, কমান্ড ডিসপ্যাচ ও স্পেশিয়াল অ্যানালিটিক্স পিসি/ডেস্কটপ স্ক্রিনের জন্য অপ্টিমাইজড।
        </p>

        {/* Suggestion Card */}
        <div style={{
          background: 'rgba(0, 240, 255, 0.05)',
          border: '1px dashed rgba(0, 240, 255, 0.2)',
          borderRadius: '14px',
          padding: '12px 14px',
          marginBottom: '22px',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#E2E8F0' }}>
            <span style={{ color: '#00FF88', display: 'flex' }}>✔</span> 
            <span>মোবাইলে ব্রাউজারের <b>&quot;Desktop Site&quot;</b> মোড অন করুন</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#E2E8F0' }}>
            <span style={{ color: '#00F0FF', display: 'flex' }}>✔</span> 
            <span>অথবা সম্পূর্ণ অভিজ্ঞতার জন্য ল্যাপটপ/পিসিতে ব্যবহার করুন</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleDismiss}
          style={{
            width: '100%',
            padding: '13px 18px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #00F0FF, #0088FF)',
            border: 'none',
            color: '#03030A',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: '0.2s transform',
            boxShadow: '0 6px 20px rgba(0, 240, 255, 0.4)',
            letterSpacing: '0.2px'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Proceed as it is (মোবাইলেই চলুন) →
        </button>
      </div>
    </div>
  );
}
