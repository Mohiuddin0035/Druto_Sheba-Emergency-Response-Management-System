import React, { useState, useEffect, useRef } from 'react';
import TiltedCard from './TiltedCard';
import { Activity, Code } from 'lucide-react';

const teamMembers = [
  {
    id: "01",
    name: "Imran-Nur Shawon",
    subtitle: "Geolocation & Telemetry",
    empId: "0112420647",
    photo: "/team/shawon.jpg"
  },
  {
    id: "02",
    name: "Md. Rubyat Simum Mahi",
    subtitle: "Frontend Architecture",
    empId: "0112330575", 
    photo: "/team/mahi.jpg"
  },
  {
    id: "03",
    name: "Afrin Fatema",
    subtitle: "Revenue & Communications",
    empId: "0112330679", 
    photo: "/team/afrin.jpg"
  },
  {
    id: "04",
    name: "Moheuddin Sikder Saikat",
    subtitle: "Core DB & Vision (Lead)",
    empId: "0112420035",
    photo: "/team/saikat.jpg"
  }
];

const SUIT_PATHS = {
  spades: "M12 3 C12 3 4 9.5 4 14 C4 16.8 6.2 19 9 19 C10.0 19 10.9 18.7 11.6 18.2 C11.1 19.5 10.2 20.6 9 21 L15 21 C13.8 20.6 12.9 19.5 12.4 18.2 C13.1 18.7 14.0 19 15 19 C17.8 19 20 16.8 20 14 C20 9.5 12 3 12 3 Z",
  hearts: "M6.979 3.074a6 6 0 0 1 4.988 1.425l.037 .033l.034 -.03a6 6 0 0 1 4.733 -1.44l.246 .036a6 6 0 0 1 3.364 10.008l-.18 .185l-.048 .041l-7.45 7.379a1 1 0 0 1 -1.313 .082l-.094 -.082l-7.493 -7.422a6 6 0 0 1 3.176 -10.215z",
  clubs: "M12 4 a3.5 3.5 0 1 1 -0.01 7 a3.5 3.5 0 0 1 0.01 -7 Z M8 10.5 a3.5 3.5 0 1 1 -0.01 7 a3.5 3.5 0 0 1 0.01 -7 Z M16 10.5 a3.5 3.5 0 1 1 -0.01 7 a3.5 3.5 0 0 1 0.01 -7 Z M10.5 16 L10.5 20 L13.5 20 L13.5 16 Z M8.5 19.5 L15.5 19.5 L15.5 21 L8.5 21 Z",
  diamonds: "M12 3 L20 12 L12 21 L4 12 Z"
};

const SuitIcon = ({ suit, size = 24 }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
    <path d={SUIT_PATHS[suit]} />
  </svg>
);

const cardMetadata = [
  { rank: "K", suit: "spades",   color: "var(--text-primary)" },
  { rank: "A", suit: "hearts",   color: "#e8192c" },
  { rank: "A", suit: "clubs",    color: "var(--text-primary)" },
  { rank: "A", suit: "spades",   color: "var(--text-primary)" }
];

export default function TeamCards() {
  const [flipped, setFlipped] = useState(new Array(teamMembers.length).fill(false));
  const containerRef = useRef(null);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [typedText, setTypedText] = useState('');
  const fullText = "MEET THE DEVS // DRUTO SHEBA";

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasRevealed) {
          setHasRevealed(true);
          teamMembers.forEach((_, idx) => {
            setTimeout(() => {
              setFlipped(prev => {
                const next = [...prev];
                next[idx] = true;
                return next;
              });
            }, 350 + idx * 220); 
          });
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [hasRevealed]);

  useEffect(() => {
    if (hasRevealed && typedText.length < fullText.length) {
      const timeout = setTimeout(() => {
        setTypedText(fullText.slice(0, typedText.length + 1));
      }, 70);
      return () => clearTimeout(timeout);
    }
  }, [hasRevealed, typedText, fullText]);

  const isTypingDone = typedText.length === fullText.length;

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '10px 20px 60px' }}>
      
      {/* Header Section */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '60px', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        gap: '12px' 
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          height: '40px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            fontFamily: "'Outfit', sans-serif",
            textShadow: '0 0 20px rgba(0, 240, 255, 0.4)'
          }}>
            {typedText}
          </h2>
          {/* Blinking Cursor */}
          <div style={{
            width: '12px',
            height: '28px',
            backgroundColor: 'var(--blue)',
            opacity: hasRevealed && !isTypingDone ? 1 : 0,
            animation: 'pulse-glow 1s infinite'
          }} />
        </div>
        
        {/* Subtitle fading in after typing */}
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: 'var(--text-secondary)',
          maxWidth: '560px',
          lineHeight: '1.6',
          opacity: isTypingDone ? 1 : 0,
          transform: isTypingDone ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.8s ease-out'
        }}>
          The visionary minds behind the project, forging ideas into reality through relentless code to build a faster, reliable emergency network.
        </p>
      </div>

      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, minmax(180px, 240px))',
          justifyContent: 'center',
          gap: '36px', 
          width: '100%' 
        }}
      >
        {teamMembers.map((member, idx) => {
          const meta = cardMetadata[idx];
          return (
            <div key={member.id} className="flip-card-container">
              <div 
                className={`flip-card-inner ${flipped[idx] ? 'is-flipped' : ''}`}
                onClick={() => {
                  setFlipped(prev => {
                    const next = [...prev];
                    next[idx] = !next[idx];
                    return next;
                  });
                }}
              >
                <div className="flip-card-front" style={{ borderRadius: '24px' }}>
                  <div className="card-foil-border-outer" />
                  <div className="card-foil-border-inner" />
                  
                  <div className="card-corner-ornament tl">✦</div>
                  <div className="card-corner-ornament tr">✦</div>
                  <div className="card-corner-ornament bl">✦</div>
                  <div className="card-corner-ornament br">✦</div>

                  <div style={{ position: 'absolute', top: '14px', left: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: meta.color, zIndex: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: '18px', fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1 }}>
                      {meta.rank}
                    </span>
                    <SuitIcon suit={meta.suit} size={13} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', zIndex: 3 }}>
                    <div className="royal-crest-container">
                      <div className="royal-ring-outer" />
                      <div className="royal-ring-middle" />
                      <div className="royal-ring-inner" />
                      <div style={{ color: meta.color, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))', zIndex: 3, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <SuitIcon suit={meta.suit} size={44} />
                      </div>
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.14em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      DEV UNIT {idx + 1}
                    </span>
                  </div>

                  <div style={{ position: 'absolute', bottom: '14px', right: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: meta.color, transform: 'rotate(180deg)', zIndex: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: '18px', fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1 }}>
                      {meta.rank}
                    </span>
                    <SuitIcon suit={meta.suit} size={13} />
                  </div>
                </div>

                <div 
                  className="flip-card-back"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFlipped(prev => {
                      const next = [...prev];
                      next[idx] = false;
                      return next;
                    });
                  }}
                >
                  <TiltedCard
                    imageSrc={member.photo}
                    altText={member.name}
                    captionText={`DEV UNIT ${idx + 1}: ${member.name}`}
                    containerHeight="100%"
                    containerWidth="100%"
                    imageHeight="100%"
                    imageWidth="100%"
                    rotateAmplitude={14}
                    scaleOnHover={1.05}
                    showMobileWarning={false}
                    showTooltip={false}
                    displayOverlayContent={true}
                    overlayContent={
                      <div 
                        style={{
                          position: 'absolute',
                          bottom: '0',
                          left: '0',
                          width: '100%',
                          padding: '24px 16px 20px',
                          background: 'linear-gradient(to top, rgba(14,14,15,0.95) 20%, rgba(14,14,15,0.6) 70%, transparent)',
                          borderBottomLeftRadius: '24px',
                          borderBottomRightRadius: '24px',
                          textAlign: 'center',
                          color: '#ffffff',
                          boxSizing: 'border-box',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                          {member.name}
                        </h3>
                        <p style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 700, margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          {member.subtitle}
                        </p>
                        <p style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 700, margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          ID: {member.empId}
                        </p>
                      </div>
                    }
                  />
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Section */}
      <div style={{
        marginTop: '80px',
        paddingTop: '24px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
        opacity: isTypingDone ? 1 : 0,
        transform: isTypingDone ? 'translateY(0)' : 'translateY(15px)',
        transition: 'all 0.8s ease-out 0.4s'
      }}>
        
        {/* Left Side */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ 
            width: '42px', height: '42px', 
            background: 'linear-gradient(135deg, var(--red), #ff7b00)', 
            borderRadius: '12px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px var(--red-glow)'
          }}>
            <Activity size={22} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                Druto Sheba
              </h4>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Next-Generation Emergency Medical Response System.
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              &copy; 2026 UIU Database Management Systems Laboratory [CSE 3522] Lab Project. All rights reserved.
            </span>
          </div>
        </div>

        {/* Right Side */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700 }}>
            <Code size={16} color="var(--brand-500)" />
            <span>Designed & Developed by Team Druto Sheba</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Dept of Computer Science and Engineering // UIU
          </span>
        </div>

      </div>

    </div>
  );
}
