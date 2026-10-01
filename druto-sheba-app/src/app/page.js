'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Ambulance,
  ArrowRight,
  Building2,
  Calendar,
  Clock3,
  Headphones,
  HeartPulse,
  History,
  LayoutDashboard,
  Moon,
  Navigation,
  Radio,
  Receipt,
  ShieldCheck,
  Siren,
  Stethoscope,
  User,
  LogIn,
  Sun,
  X,
  Zap,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import UnderConstructionModal from '@/components/UnderConstructionModal';
import TeamCards from '@/components/TeamCards';

const staffPortals = [
  {
    href: '/login?portal=driver',
    title: 'Driver Console',
    role: 'Ambulance Crew',
    description: 'Duty status, active trips, navigation telemetry, and shifts.',
    icon: Navigation,
    color: '#ff9f0a',
  },
  {
    href: '/login?portal=dispatcher',
    title: 'Dispatch Command',
    role: 'Dispatchers',
    description: 'Central city emergency intake & multi-unit coordination.',
    icon: Radio,
    color: '#0a84ff',
  },
  {
    href: '/login?portal=admin',
    title: 'Admin Control',
    role: 'System Admins',
    description: 'Fleet health, hospital resources, analytics, and billing.',
    icon: ShieldCheck,
    color: '#30d158',
  },
];

const serviceLinks = [
  { href: '/sos', label: 'Emergency request', icon: Siren },
  { href: '/track', label: 'Track ambulance', icon: Navigation },
  { href: '/profile', label: 'Patient profile', icon: HeartPulse },
  { href: '/history', label: 'Emergency history', icon: History },
  { href: '/book-doctor', label: 'Book Doctor', icon: Stethoscope },
  { href: '/appointments', label: 'My Appointments', icon: Calendar },
  { href: '/bills', label: 'Invoices & billing', icon: Receipt },
];

const metrics = [
  { value: '24/7', label: 'Coverage' },
  { value: '< 60s', label: 'Response' },
  { value: 'Live', label: 'Tracking' },
];

export default function HomePage() {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(true);
  const [accessOpen, setAccessOpen] = useState(false);
  const [constructionFeature, setConstructionFeature] = useState(null);
  const [displayText, setDisplayText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const phrases = ["Saves a Life.", "Matters Most.", "Important.", "Counts."];

  const [hasDriverSession, setHasDriverSession] = useState(false);
  const [hasPatientSession, setHasPatientSession] = useState(false);
  const [hasDispatcherSession, setHasDispatcherSession] = useState(false);
  const [hasAdminSession, setHasAdminSession] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Check if user, driver, dispatcher, or admin is already logged in to provide instant direct transitions
    if (typeof document !== 'undefined') {
      const cookies = document.cookie || '';
      if (cookies.includes('driver_session=')) {
        setHasDriverSession(true);
      }
      if (cookies.includes('patient_session=')) {
        setHasPatientSession(true);
      }
      if (cookies.includes('dispatcher_session=')) {
        setHasDispatcherSession(true);
      }
      if (cookies.includes('admin_session=')) {
        setHasAdminSession(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const typingSpeed = 100;
    const deletingSpeed = 50;
    const pauseDuration = 2000;

    const timer = setTimeout(() => {
      const currentPhrase = phrases[phraseIndex];
      if (isDeleting) {
        setDisplayText(currentPhrase.substring(0, displayText.length - 1));
        if (displayText.length === 0) {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
      } else {
        setDisplayText(currentPhrase.substring(0, displayText.length + 1));
        if (displayText.length === currentPhrase.length) {
          setTimeout(() => setIsDeleting(true), pauseDuration);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex, mounted]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };


  return (
    <main className="home-page">
      <style>{`
        .home-page {
          height: 100dvh;
          background: var(--bg-primary);
          position: relative;
          font-family: var(--font-inter), sans-serif;
          overflow-x: hidden;
          overflow-y: auto;
          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;
        }

        .snap-section {
          min-height: 100dvh;
          scroll-snap-align: start;
          position: relative;
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .main-hero-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 70% 20%, var(--blue-dim), transparent 40%),
            radial-gradient(circle at 20% 80%, var(--red-dim), transparent 40%);
          opacity: 0.6;
          pointer-events: none;
        }

        .scroll-down-indicator {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          animation: bounce 2s infinite;
          z-index: 10;
        }

        .scroll-down-indicator span {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translate(-50%, 0); }
          40% { transform: translate(-50%, -10px); }
          60% { transform: translate(-50%, -5px); }
        }

        .devs-section {
          justify-content: center;
          align-items: center;
          background: var(--bg-primary);
        }

        .devs-title {
          font-family: var(--font-outfit), sans-serif;
          font-size: 48px;
          font-weight: 900;
          color: var(--text-primary);
          margin-bottom: 24px;
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(var(--border-subtle) 1px, transparent 1px),
            linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(circle at 50% 50%, black 30%, transparent 80%);
          opacity: 0.3;
          pointer-events: none;
        }

        .home-shell {
          width: min(1200px, calc(100% - 48px));
          margin: 0 auto;
          position: relative;
          z-index: 2;
          flex: 1;
          display: flex;
          flex-direction: column;
          padding-bottom: 80px;
        }

        .home-nav {
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          margin-top: 20px;
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          background: var(--bg-glass);
          backdrop-filter: blur(20px) saturate(180%);
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .home-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .home-brand-mark {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          background: linear-gradient(135deg, #ff2d55, #d00045);
          box-shadow: 0 8px 24px rgba(255,0,85,0.4);
          position: relative;
          overflow: hidden;
        }

        .home-brand-mark::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.2), transparent);
          transform: translateX(-100%);
          animation: shine 3s infinite;
        }

        @keyframes shine {
          100% { transform: translateX(100%); }
        }

        .home-brand h1 {
          font-family: var(--font-outfit), sans-serif;
          font-size: 20px;
          font-weight: 800;
          margin: 0;
          color: var(--text-primary);
        }

        .home-brand-subtitle {
          display: block;
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .home-nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .home-icon-button,
        .staff-access-button {
          height: 44px;
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          color: var(--text-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .staff-access-button {
          padding: 0 20px;
          font-size: 14px;
          font-weight: 700;
          font-family: var(--font-outfit), sans-serif;
        }

        .home-icon-button {
          width: 44px;
        }

        .home-icon-button:hover,
        .staff-access-button:hover {
          background: var(--bg-card-hover);
          border-color: var(--blue);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px var(--blue-dim);
        }

        .hero {
          flex: 1;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: center;
          gap: 60px;
          padding: 20px 0;
          min-height: auto;
        }

        .hero-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--blue);
          background: var(--blue-dim);
          border: 1px solid var(--blue-glow);
          border-radius: 30px;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 800;
          font-family: var(--font-outfit), sans-serif;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 32px;
        }

        .hero-title {
          font-family: var(--font-outfit), sans-serif;
          font-size: clamp(40px, 5vw, 72px);
          font-weight: 900;
          line-height: 1.05;
          letter-spacing: -2px;
          margin: 0 0 24px;
          color: var(--text-primary);
        }

        .gradient-text {
          background: linear-gradient(135deg, #fff 30%, var(--blue) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        [data-theme="light"] .gradient-text {
          background: linear-gradient(135deg, #000 30%, var(--blue) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-copy {
          color: var(--text-secondary);
          font-size: 18px;
          line-height: 1.6;
          max-width: 580px;
          margin: 0 0 40px;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 48px;
        }

        .btn-sos {
          min-height: 56px;
          padding: 0 32px;
          border-radius: 16px;
          background: var(--red);
          color: #fff;
          font-weight: 800;
          font-size: 16px;
          font-family: var(--font-outfit), sans-serif;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 12px 32px var(--red-glow);
          transition: all 0.3s ease;
        }

        .btn-sos:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 48px var(--red-glow);
          filter: brightness(1.1);
        }

        .btn-track {
          min-height: 56px;
          padding: 0 28px;
          border-radius: 16px;
          background: var(--bg-glass);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          font-weight: 700;
          font-size: 15px;
          font-family: var(--font-outfit), sans-serif;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .btn-track:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-accent);
          transform: translateY(-2px);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          max-width: 480px;
        }

        .metric-card {
          padding: 16px;
          background: var(--bg-glass);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          text-align: center;
          backdrop-filter: blur(10px);
        }

        .metric-value {
          display: block;
          font-size: 24px;
          font-weight: 800;
          font-family: var(--font-outfit), sans-serif;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .metric-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .ops-card {
          background: var(--bg-glass);
          border: 1px solid var(--border-subtle);
          border-radius: 24px;
          overflow: hidden;
          backdrop-filter: blur(20px) saturate(180%);
          box-shadow: 0 24px 64px rgba(0,0,0,0.2);
          position: relative;
        }

        .ops-visual {
          height: 280px;
          background: var(--bg-primary);
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid var(--border-subtle);
        }

        .ops-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(var(--border-subtle) 1px, transparent 1px),
            linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px);
          background-size: 24px 24px;
          opacity: 0.2;
        }

        .ops-route {
          position: absolute;
          inset: 40px;
          border: 2px dashed var(--blue-glow);
          border-radius: 40px;
          mask-image: radial-gradient(circle at center, black, transparent);
        }

        .ops-marker {
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          border: 1px solid var(--border-accent);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          z-index: 5;
        }

        .ops-marker.emergency { color: var(--red); }
        .ops-marker.ambulance { color: var(--blue); }
        .ops-marker.hospital { color: var(--green); }

        .emergency-ring {
          position: absolute;
          inset: -12px;
          border-radius: 20px;
          border: 2px solid var(--red-glow);
          opacity: 0.4;
        }

        .radar-scan {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent, var(--blue-dim), transparent);
          height: 100px;
          width: 100%;
          opacity: 0.1;
          pointer-events: none;
        }

        .unit-tag {
          position: absolute;
          bottom: -24px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 8px;
          font-weight: 900;
          white-space: nowrap;
          color: var(--blue);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(255, 0, 85, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(255, 0, 85, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 0, 85, 0); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }

        .ops-status-bar {
          position: absolute;
          bottom: 16px;
          left: 16px;
          right: 16px;
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ops-status-info span {
          display: block;
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .ops-status-info strong {
          font-size: 13px;
          color: var(--text-primary);
        }

        .services-list {
          padding: 24px;
        }

        .services-list h3 {
          font-size: 12px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 16px;
          letter-spacing: 1px;
        }

        .service-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: var(--bg-glass);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          margin-bottom: 8px;
          color: var(--text-primary);
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .service-item:hover {
          background: var(--bg-card-hover);
          border-color: var(--blue);
          transform: translateX(4px);
        }

        .service-item-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-pulse {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: var(--green);
          border-radius: 50%;
          position: relative;
        }

        .pulse-dot::after {
          content: '';
          position: absolute;
          inset: -4px;
          border: 1px solid var(--green);
          border-radius: 50%;
          animation: pulse-ring 2s infinite;
        }

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        .status-text {
          font-size: 11px;
          font-weight: 900;
          color: var(--green);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .staff-drawer {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: min(440px, 100vw);
          background: var(--bg-secondary);
          border-left: 1px solid var(--border-subtle);
          z-index: 1000;
          padding: 32px;
          display: flex;
          flex-direction: column;
          box-shadow: -20px 0 60px rgba(0,0,0,0.5);
        }

        .drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          z-index: 999;
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .drawer-header h2 {
          font-family: var(--font-outfit), sans-serif;
          font-size: 28px;
          font-weight: 800;
          margin: 0;
        }

        .drawer-header p {
          color: var(--text-secondary);
          margin: 8px 0 0;
          font-size: 14px;
        }

        .portal-card {
          padding: 20px;
          background: var(--bg-glass);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .portal-card:hover {
          border-color: var(--accent-color);
          background: var(--bg-card-hover);
          transform: translateY(-2px);
        }

        .portal-icon {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
        }

        .portal-info h4 {
          margin: 0 0 4px;
          font-family: var(--font-outfit), sans-serif;
          font-size: 16px;
          font-weight: 700;
        }

        .portal-info p {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .portal-role {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
          display: block;
        }

        @media (max-width: 1024px) {
          .hero { grid-template-columns: 1fr; text-align: center; gap: 40px; }
          .hero-copy { margin: 0 auto 40px; }
          .hero-actions { justify-content: center; }
          .metrics-grid { margin: 0 auto; }
          .ops-card { max-width: 500px; margin: 0 auto; }
        }

        @media (max-width: 640px) {
          .home-nav { padding: 0 16px; }
          .home-brand h1 { font-size: 16px; }
          .staff-access-button span { display: none; }
          .hero-title { font-size: 40px; }
          .hero-actions { flex-direction: column; width: 100%; }
          .btn-sos, .btn-track { width: 100%; justify-content: center; }
        }
      `}</style>

      <section className="snap-section main-hero-section">
        <div className="grid-overlay" />

        <div className="home-shell">
        <motion.nav
          className="home-nav"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link href="/" className="home-brand">
            <span className="home-brand-mark">
              <Activity size={24} />
            </span>
            <div>
              <h1>Druto Sheba</h1>
              <span className="home-brand-subtitle">Emergency Response</span>
            </div>
          </Link>

          <div className="home-nav-actions">
            <Link href={hasPatientSession ? "/sos" : "/login?portal=patient"} style={{ textDecoration: 'none' }}>
              <motion.button
                className="staff-access-button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ background: 'rgba(255, 45, 85, 0.1)', borderColor: 'rgba(255, 45, 85, 0.3)', color: 'var(--red)' }}
              >
                <User size={16} />
                <span>{hasPatientSession ? "Patient Portal" : "Patient Login"}</span>
              </motion.button>
            </Link>
            <motion.button
              className="staff-access-button"
              onClick={() => setAccessOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LayoutDashboard size={18} />
              <span>Staff Access</span>
            </motion.button>
            <motion.button
              className="home-icon-button"
              onClick={toggleTheme}
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5 }}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </motion.button>
          </div>
        </motion.nav>

        <section className="hero">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.div 
              className="live-dispatch-badge"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                background: 'var(--bg-glass)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '30px',
                marginBottom: '32px',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <motion.div 
                animate={{ opacity: [1, 0.4, 1] }} 
                transition={{ duration: 2, repeat: Infinity }}
                style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 10px var(--red)' }} 
              />
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--red)' }}>Live Dispatch Mode</span>
            </motion.div>

            <h2 className="hero-title" style={{ minHeight: '2.2em' }}>
              Every Second <br />
              <span className="gradient-text">
                {displayText}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  style={{ borderLeft: '3px solid var(--blue)', marginLeft: '4px' }}
                />
              </span>
            </h2>

            <p className="hero-copy">
              Bangladesh&apos;s fastest emergency response network — connecting lives to critical care in minutes with precision dispatch, verified drivers, and hospital readiness.
            </p>

            <div className="hero-actions">
              <Link href="/sos">
                <motion.button
                  className="btn-sos"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Siren size={24} />
                  Emergency Request
                </motion.button>
              </Link>
              <Link href="/track">
                <motion.button
                  className="btn-track"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Navigation size={20} />
                  Track Live Unit
                </motion.button>
              </Link>
            </div>

            <div className="metrics-grid">
              {metrics.map((m, i) => (
                <motion.div
                  className="metric-card"
                  key={m.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <span className="metric-value">{m.value}</span>
                  <span className="metric-label">{m.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.aside 
            className="ops-card"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="ops-visual">
              <div className="ops-grid" />
              
              {/* Radar Scanning Effect */}
              <motion.div 
                className="radar-scan"
                animate={{ top: ['-100px', '100%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
              
              <div style={{ position: 'absolute', top: '12px', left: '16px', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
                <div className="pulse-dot" style={{ width: '6px', height: '6px' }} />
                <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-primary)' }}>Live Tracking</span>
              </div>

              {/* Realistic City Route Path */}
              <svg className="ops-route-svg" viewBox="0 0 400 280" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <linearGradient id="trailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="100%" stopColor="var(--blue)" />
                  </linearGradient>
                </defs>
                
                {/* Background Grid Path */}
                <path
                  d="M 320,220 L 320,60 L 80,60 L 160,60 L 160,140 L 320,140"
                  fill="none"
                  stroke="var(--border-subtle)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Speed Trail Animation */}
                <motion.path
                  d="M 320,220 L 320,60 L 80,60 L 160,60 L 160,140 L 320,140"
                  fill="none"
                  stroke="url(#trailGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0.1, pathOffset: 0 }}
                  animate={{ pathOffset: 1 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  filter="url(#glow)"
                />
              </svg>

              {/* Emergency Marker */}
              <motion.div 
                className="ops-marker emergency"
                style={{ top: '60px', left: '80px', transform: 'translate(-50%, -50%)', border: '1px solid var(--red-dim)' }}
                whileHover={{ scale: 1.1 }}
              >
                <motion.div 
                  className="emergency-ring"
                  animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <Siren size={20} />
              </motion.div>

              {/* Realistic Moving Ambulance with Unit Tag */}
              <motion.div 
                className="ops-marker ambulance"
                animate={{ 
                  offsetPath: "path('M 320,220 L 320,60 L 80,60 L 160,60 L 160,140 L 320,140')",
                  offsetDistance: ["0%", "100%"],
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  offsetDistance: { duration: 10, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1, repeat: Infinity }
                }}
                style={{ 
                  offsetRotate: "0deg", 
                  transform: 'translate(-50%, -50%)',
                  background: 'var(--bg-secondary)',
                  border: '2px solid var(--blue)',
                  zIndex: 10
                }}
              >
                <div className="unit-tag">UNIT A-102</div>
                
                {/* Micro-Speed Streaks */}
                <div style={{ position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {[1,2].map(i => (
                    <motion.div
                      key={i}
                      style={{ width: 8, height: 1, background: 'var(--blue)', opacity: 0.5 }}
                      animate={{ x: [-5, 0], opacity: [0, 0.5, 0] }}
                      transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
                <Ambulance size={20} />
              </motion.div>

              {/* Hospital Marker */}
              <motion.div 
                className="ops-marker hospital" 
                style={{ top: '140px', left: '320px', transform: 'translate(-50%, -50%)', border: '1px solid var(--green-dim)' }}
                animate={{ boxShadow: ["0 0 0px var(--green-dim)", "0 0 15px var(--green-dim)", "0 0 0px var(--green-dim)"] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Building2 size={20} />
              </motion.div>

              <div className="ops-status-bar">
                <div className="ops-status-info">
                  <span>Mission Status</span>
                  <strong>Unit A-102 • En Route</strong>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Activity size={18} color="var(--red)" />
                </motion.div>
              </div>
            </div>

            <div className="services-list">
              <h3>Patient Services</h3>
              {serviceLinks.map((s) => {
                if (s.underConstruction) {
                  return (
                    <div 
                      key={s.label}
                      className="service-item"
                      onClick={() => setConstructionFeature(s.label)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="service-item-left">
                        <s.icon size={18} />
                        {s.label}
                      </div>
                      <span style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(255, 149, 0, 0.15)',
                        color: '#ff9500',
                        border: '1px solid rgba(255, 149, 0, 0.3)',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>Soon</span>
                    </div>
                  );
                }
                return (
                  <Link href={s.href} key={s.href}>
                    <div className="service-item">
                      <div className="service-item-left">
                        <s.icon size={18} />
                        {s.label}
                      </div>
                      <ArrowRight size={16} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.aside>
        </section>
        
        <div className="scroll-down-indicator">
          <span>Snap down to meet the devs</span>
          <ChevronDown size={24} />
        </div>
      </div>
      </section>

      <section className="snap-section devs-section">
        <div className="grid-overlay" style={{ opacity: 0.1 }} />
        <TeamCards />
      </section>

      <AnimatePresence>
        {accessOpen && (
          <>
            <motion.div
              className="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAccessOpen(false)}
            />
            <motion.aside
              className="staff-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="drawer-header">
                <div>
                  <h2>Staff Access</h2>
                  <p>Secure entry to operational terminals.</p>
                </div>
                <button className="home-icon-button" onClick={() => setAccessOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="portals-list">
                {staffPortals.map((portal) => {
                  if (portal.underConstruction) {
                    return (
                      <div
                        key={portal.title}
                        onClick={() => {
                          setAccessOpen(false);
                          setConstructionFeature(`${portal.title} (${portal.role})`);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <motion.div
                          className="portal-card"
                          style={{ '--accent-color': portal.color, opacity: 0.75 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="portal-icon" style={{ color: portal.color, background: `${portal.color}15` }}>
                            <portal.icon size={24} />
                          </div>
                          <div className="portal-info">
                            <span className="portal-role" style={{ color: portal.color }}>{portal.role}</span>
                            <h4>{portal.title}</h4>
                            <p>{portal.description}</p>
                          </div>
                          <span style={{
                            fontSize: '10px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255, 149, 0, 0.15)',
                            color: '#ff9500',
                            border: '1px solid rgba(255, 149, 0, 0.3)',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            marginLeft: 'auto'
                          }}>Soon</span>
                        </motion.div>
                      </div>
                    );
                  }

                  let targetHref = portal.href;
                  if (portal.role === 'Ambulance Crew' && hasDriverSession) {
                    targetHref = '/duty';
                  } else if (portal.role === 'Dispatchers' && hasDispatcherSession) {
                    targetHref = '/dashboard';
                  } else if (portal.role === 'System Admins' && hasAdminSession) {
                    targetHref = '/control';
                  }

                  return (
                    <Link
                      key={portal.title}
                      href={targetHref}
                      onClick={() => setAccessOpen(false)}
                      style={{ textDecoration: 'none' }}
                    >
                      <motion.div
                        className="portal-card"
                        style={{ '--accent-color': portal.color }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="portal-icon" style={{ color: portal.color, background: `${portal.color}15` }}>
                          <portal.icon size={24} />
                        </div>
                        <div className="portal-info">
                          <span className="portal-role" style={{ color: portal.color }}>{portal.role}</span>
                          <h4>{portal.title}</h4>
                          <p>{portal.description}</p>
                        </div>
                        <ArrowRight size={20} style={{ marginLeft: 'auto', opacity: 0.7 }} />
                      </motion.div>
                    </Link>
                  );
                })}
              </div>

              <div style={{ marginTop: 'auto', padding: '20px', background: 'var(--bg-glass)', borderRadius: '16px', fontSize: '12px', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                <strong>Operational Security:</strong> All terminal access is logged. Ensure you are on a secure network before proceeding.
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <UnderConstructionModal
        isOpen={Boolean(constructionFeature)}
        onClose={() => setConstructionFeature(null)}
        featureName={constructionFeature}
      />
    </main>
  );
}
