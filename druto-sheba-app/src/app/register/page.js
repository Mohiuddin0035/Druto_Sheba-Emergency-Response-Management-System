"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Seamlessly redirect into unified 3D liquid origami auth portal
    router.replace('/login?mode=register');
  }, [router]);

  return (
    <div className="loading-container">
      <div className="spinner" />
    </div>
  );
}
