'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import PortalSidebar from '@/components/PortalSidebar';
import { LayoutDashboard, AlertTriangle, Truck, Clock, Radio, Route, Star, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import StaffChatWidget from '@/components/StaffChatWidget';
import GlobalSosAlert from '@/components/GlobalSosAlert';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/operations', label: 'Operations', icon: Route },
  { href: '/requests', label: 'Emergencies', icon: AlertTriangle },
  { href: '/fleet', label: 'Fleet', icon: Truck },
  { href: '/shifts', label: 'Driver Shifts', icon: Clock },
  { href: '/trips', label: 'Trip Logs', icon: Clock },
  { href: '/dispatcher-reviews', label: 'Ratings', icon: Star },
  { href: '/dispatcher-profile', label: 'Profile', icon: User },
];

export default function DispatcherLayout({ children }) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me?portal=dispatcher', { cache: 'no-store' })
      .then(res => {
        if (!res.ok) {
          window.location.href = '/login?portal=dispatcher';
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && data.username) {
          setCurrentUser(data);
        }
      })
      .catch(() => {});
  }, [pathname]);



  return (
    <div className="app-layout">
      <GlobalSosAlert />
      <PortalSidebar
        portalName="Dispatcher Portal"
        portalColor="#0a84ff"
        portalIcon={Radio}
        navItems={navItems}
      />
      <main className="main-content">
        {children}
      </main>
      {currentUser?.verification_status !== 'Pending' && <StaffChatWidget />}
    </div>
  );
}


