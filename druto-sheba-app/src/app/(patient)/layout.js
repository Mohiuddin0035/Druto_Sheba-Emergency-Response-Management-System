'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PortalSidebar from '@/components/PortalSidebar';
import { Siren, MapPin, History, User, Receipt, Calendar, Mail } from 'lucide-react';

const navItems = [
  { href: '/sos', label: '🚨 Emergency SOS', icon: Siren },
  { href: '/track', label: 'Track Ambulance', icon: MapPin },
  { href: '/profile', label: 'Medical Profile', icon: User },
  { href: '/book-doctor', label: 'Book Doctor', icon: Calendar },
  { href: '/appointments', label: 'My Appointments', icon: Calendar },
  { href: '/patient-inbox', label: 'Inbox', icon: Mail },
  { href: '/history', label: 'Emergency History', icon: History },
  { href: '/bills', label: 'My Invoices & Bills', icon: Receipt },
];

import { useUser } from '@/lib/UserContext';

export default function PatientLayout({ children }) {
  const router = useRouter();
  const { activePatient, loading: userLoading } = useUser();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const res = await fetch('/api/auth/patient/me', { cache: 'no-store' });
        const data = await res.json();
        if (!data.authenticated || !data.patient) {
          localStorage.removeItem('emergency_active_patient');
          window.location.replace('/login?portal=patient');
          return;
        }
        if (isMounted) setCheckingAuth(false);
      } catch (e) {
        localStorage.removeItem('emergency_active_patient');
        window.location.replace('/login?portal=patient');
      }
    };

    verifySession();

    // Check on bfcache back-navigation
    const handlePageShow = (event) => {
      verifySession();
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      isMounted = false;
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [router]);

  if (checkingAuth || userLoading || !activePatient) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Verifying Patient Credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <PortalSidebar
        portalName="Patient Portal"
        portalColor="#ff2d55"
        portalIcon={Siren}
        navItems={navItems}
      />
      <main className="main-content">{children}</main>
    </div>
  );
}
