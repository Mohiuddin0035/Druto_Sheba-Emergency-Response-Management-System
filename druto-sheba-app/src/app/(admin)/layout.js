'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PortalSidebar from '@/components/PortalSidebar';
import { Activity, Building2, ClipboardList, ShieldCheck, Wrench, Settings, Route, Star, Mail, Stethoscope } from 'lucide-react';

const navItems = [
  { href: '/control', label: 'Control', icon: Settings },
  { href: '/analytics', label: 'Analytics', icon: Activity },
  { href: '/admin-reviews', label: 'Ratings', icon: Star },
  { href: '/logs', label: 'Trip Logs', icon: Route },
  { href: '/hospitals', label: 'Hospitals', icon: Building2 },
  { href: '/billing', label: 'Billing', icon: ClipboardList },
  { href: '/admin-verifications', label: 'Verifications', icon: ShieldCheck },
  { href: '/admin-mail', label: 'Official Mail', icon: Mail },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/doctors', label: 'Doctors', icon: Stethoscope },
];

import StaffChatWidget from '@/components/StaffChatWidget';
import GlobalSosAlert from '@/components/GlobalSosAlert';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me?portal=admin');
        if (!res.ok) {
          router.replace('/login?portal=admin');
          return;
        }
        const data = await res.json();
        if (!data.role || !data.role.toLowerCase().includes('admin')) {
          router.replace('/dashboard');
        } else {
          // Only clear the dispatcher cookie if it belongs to a bypassed admin session
          const dispRes = await fetch('/api/auth/me?portal=dispatcher');
          if (dispRes.ok) {
            const dispData = await dispRes.json();
            if (dispData.username && dispData.username.startsWith('Bypass Dispatcher:')) {
              await fetch('/api/auth/logout?portal=dispatcher', { method: 'POST' }).catch(() => {});
            }
          }
          setAuthorized(true);
        }
      } catch (err) {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="app-layout">
      <GlobalSosAlert />
      <PortalSidebar
        portalName="Admin Portal"
        portalColor="#30d158"
        portalIcon={ShieldCheck}
        navItems={navItems}
      />
      <main className="main-content">{children}</main>
      <StaffChatWidget />
    </div>
  );
}
