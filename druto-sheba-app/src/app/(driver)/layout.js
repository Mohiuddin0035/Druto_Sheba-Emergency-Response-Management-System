'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import PortalSidebar from '@/components/PortalSidebar';
import { Navigation, CalendarClock, UserCog, History, CreditCard, Bell, ArrowRight } from 'lucide-react';
import { BroadcastProvider } from '@/lib/BroadcastContext';
import { useUser } from '@/lib/UserContext';

const navItems = [
  { href: '/duty', label: 'Active Duty', icon: Navigation },
  { href: '/bill-pay', label: 'Bill Pay', icon: CreditCard },
  { href: '/inbox', label: 'Inbox', icon: Bell },
  { href: '/schedule', label: 'Shift Schedule', icon: CalendarClock },
  { href: '/driver-history', label: 'Trip History', icon: History },
  { href: '/settings', label: 'Profile', icon: UserCog },
];

export default function DriverLayout({ children }) {
  const pathname = usePathname();
  const { activeDriver } = useUser();



  return (
    <BroadcastProvider>
      <div className="app-layout">
        <PortalSidebar
          portalName="Driver Portal"
          portalColor="#ff9f0a"
          portalIcon={Navigation}
          navItems={navItems}
        />
        <main className="main-content">
          {children}
        </main>
      </div>
    </BroadcastProvider>
  );
}

