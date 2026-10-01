'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function UnderConstructionModal({ isOpen, onClose, featureName = 'This Feature' }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '460px',
            width: '100%',
            background: 'rgba(18, 18, 26, 0.98)',
            border: '1px solid rgba(255, 149, 0, 0.3)',
            borderRadius: '24px',
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 149, 0, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: 'var(--font-outfit), system-ui, sans-serif',
            color: '#ffffff'
          }}
        >
          {/* Striped Top Hazard Bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'repeating-linear-gradient(45deg, #ff9500, #ff9500 12px, #1a1a24 12px, #1a1a24 24px)'
          }} />

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>

          {/* Animated Construction Barrier & Traffic Cones Illustration (SVG) */}
          <div style={{ margin: '8px auto 20px', display: 'flex', justifyContent: 'center' }}>
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="200" height="135" viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="110" cy="142" rx="90" ry="6" fill="rgba(0,0,0,0.5)" />
                <rect x="36" y="55" width="8" height="85" rx="3" fill="#9ca3af" />
                <polygon points="28,140 52,140 44,125 36,125" fill="#6b7280" />
                <rect x="176" y="55" width="8" height="85" rx="3" fill="#9ca3af" />
                <polygon points="168,140 192,140 184,125 176,125" fill="#6b7280" />
                <line x1="40" y1="75" x2="180" y2="135" stroke="#9ca3af" strokeWidth="4" />
                <line x1="40" y1="135" x2="180" y2="75" stroke="#9ca3af" strokeWidth="4" />

                {/* Board 1 */}
                <g>
                  <rect x="20" y="45" width="180" height="26" rx="4" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
                  <path d="M30 45 L50 71 H35 L15 45 Z" fill="#ff6b00" />
                  <path d="M60 45 L80 71 H65 L45 45 Z" fill="#ff6b00" />
                  <path d="M90 45 L110 71 H95 L75 45 Z" fill="#ff6b00" />
                  <path d="M120 45 L140 71 H125 L105 45 Z" fill="#ff6b00" />
                  <path d="M150 45 L170 71 H155 L135 45 Z" fill="#ff6b00" />
                  <path d="M180 45 L200 71 H185 L165 45 Z" fill="#ff6b00" />
                </g>

                {/* Board 2 */}
                <g>
                  <rect x="20" y="78" width="180" height="26" rx="4" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
                  <path d="M30 78 L50 104 H35 L15 78 Z" fill="#ff6b00" />
                  <path d="M60 78 L80 104 H65 L45 78 Z" fill="#ff6b00" />
                  <path d="M90 78 L110 104 H95 L75 78 Z" fill="#ff6b00" />
                  <path d="M120 78 L140 104 H125 L105 78 Z" fill="#ff6b00" />
                  <path d="M150 78 L170 104 H155 L135 78 Z" fill="#ff6b00" />
                  <path d="M180 78 L200 104 H185 L165 78 Z" fill="#ff6b00" />
                </g>

                {/* UNDER CONSTRUCTION Sign */}
                <g>
                  <rect x="44" y="52" width="132" height="46" rx="6" fill="#facc15" stroke="#1f2937" strokeWidth="2.5" />
                  <rect x="47" y="55" width="126" height="40" rx="4" fill="none" stroke="#1f2937" strokeWidth="1.5" strokeDasharray="3 2" />
                  <text x="110" y="72" textAnchor="middle" fill="#000000" fontWeight="900" fontSize="13" letterSpacing="1.2" fontFamily="sans-serif">UNDER</text>
                  <text x="110" y="88" textAnchor="middle" fill="#000000" fontWeight="900" fontSize="11" letterSpacing="0.8" fontFamily="sans-serif">CONSTRUCTION</text>
                </g>

                {/* Left Traffic Cone */}
                <motion.g
                  animate={{ rotate: [-2, 2, -2] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  style={{ transformOrigin: '18px 140px' }}
                >
                  <ellipse cx="18" cy="138" rx="14" ry="4" fill="#ff6b00" />
                  <polygon points="18,102 9,136 27,136" fill="#ff6b00" />
                  <polygon points="18,114 13,124 23,124" fill="#ffffff" />
                </motion.g>

                {/* Right Warning Sign Post */}
                <g>
                  <rect x="195" y="25" width="3" height="115" fill="#9ca3af" />
                  <g transform="translate(196, 42) rotate(45)">
                    <rect x="-16" y="-16" width="32" height="32" rx="4" fill="#facc15" stroke="#000000" strokeWidth="2" />
                    <text x="0" y="6" textAnchor="middle" fill="#000000" fontWeight="900" fontSize="18" fontFamily="sans-serif">!</text>
                  </g>
                </g>
              </svg>
            </motion.div>
          </div>

          <h2 style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '6px'
          }}>
            Under Construction
          </h2>

          <p style={{
            fontSize: '14px',
            color: '#ff9500',
            fontWeight: 600,
            marginBottom: '10px'
          }}>
            {featureName}
          </p>

          <p style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.65)',
            lineHeight: '1.5',
            marginBottom: '24px'
          }}>
            This feature is currently under construction and will be available in future updates.
          </p>

          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #ff9500, #ff5e00)',
              color: '#000000',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            Got it
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
