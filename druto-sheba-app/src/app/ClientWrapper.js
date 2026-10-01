'use client';
import { useEffect } from 'react';
import { UserProvider } from '@/lib/UserContext';
import { ToastProvider } from '@/components/Toast';

import MobileDeviceNotice from '@/components/MobileDeviceNotice';

export default function ClientWrapper({ children }) {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Enforce strict tab session isolation for admin and dispatcher
    const path = window.location.pathname;
    if (path.startsWith('/control') || path.startsWith('/dashboard') || path.startsWith('/analytics')) {
      if (!sessionStorage.getItem('staff_session_active')) {
        // This is a fresh tab/browser launch, wipe any restored cookies
        fetch('/api/auth/logout', { method: 'POST' }).then(() => {
          window.location.href = '/login?portal=admin';
        });
      }
    }
  }, []);

  return (
    <ToastProvider>
      <UserProvider>
        <MobileDeviceNotice />
        {children}
      </UserProvider>
    </ToastProvider>
  );
}
