"use client";

import { useEffect, useRef } from 'react';

/**
 * EmergencyCityCanvas
 * Renders an ultra-smooth cinematic 3D/Isometric perspective background
 * showing:
 * 1. Night/Day 3D illuminated city grid with perspective highway and skyscrapers
 * 2. High-speed emergency ambulance speeding with flashing red/blue emergency strobe beacons
 * 3. Hospital medical hub with glowing neon cross and pulse waves
 * 4. Radar sonar ripples reaching patient SOS emergency beacons
 * 5. Dynamic emergency dispatch telemetry particles
 */
export default function EmergencyCityCanvas({ theme = 'dark' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Stars / Atmospheric Dust Particles
    const particles = Array.from({ length: 65 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.6,
      radius: Math.random() * 1.8 + 0.5,
      alpha: Math.random() * 0.7 + 0.3,
      speedY: Math.random() * 0.2 + 0.05,
    }));

    // City skyline buildings (3D perspective silhouettes)
    const buildings = [
      { x: 0.05, w: 0.08, h: 220, windows: [] },
      { x: 0.14, w: 0.07, h: 280, windows: [] },
      { x: 0.22, w: 0.10, h: 360, windows: [] },
      { x: 0.33, w: 0.09, h: 250, windows: [] },
      { x: 0.60, w: 0.09, h: 320, windows: [] },
      { x: 0.70, w: 0.11, h: 420, isHospital: true, windows: [] }, // Emergency Medical Center
      { x: 0.82, w: 0.08, h: 300, windows: [] },
      { x: 0.91, w: 0.08, h: 240, windows: [] },
    ];

    // Populate window coordinates for buildings
    buildings.forEach(b => {
      const cols = Math.floor(b.w * 10) || 3;
      const rows = Math.floor(b.h / 24);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          b.windows.push({
            r, c,
            lit: Math.random() > 0.45,
            hue: Math.random() > 0.8 ? '#00f0ff' : '#ffd600'
          });
        }
      }
    });

    let time = 0;

    const render = () => {
      time += 0.03;
      ctx.clearRect(0, 0, width, height);

      const isDark = theme === 'dark';

      // 1. Sky Gradient (Day/Night Cinematic)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.75);
      if (isDark) {
        skyGrad.addColorStop(0, '#03030c');
        skyGrad.addColorStop(0.5, '#090a1a');
        skyGrad.addColorStop(1, '#121124');
      } else {
        skyGrad.addColorStop(0, '#dbeafe');
        skyGrad.addColorStop(0.5, '#eff6ff');
        skyGrad.addColorStop(1, '#f8fafc');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Atmospheric Stars / City Glow Particles
      particles.forEach(p => {
        p.y -= p.speedY;
        if (p.y < 0) p.y = height * 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(0, 240, 255, ${p.alpha * 0.6})`
          : `rgba(59, 130, 246, ${p.alpha * 0.4})`;
        ctx.fill();
      });

      // 3. Distant City Skyline & Hospital Hub
      const horizonY = height * 0.65;

      buildings.forEach(b => {
        const bx = b.x * width;
        const bw = b.w * width;
        const by = horizonY - b.h;

        // Building Facade
        ctx.fillStyle = isDark
          ? (b.isHospital ? '#101428' : '#0b0c16')
          : (b.isHospital ? '#e0e7ff' : '#cbd5e1');
        ctx.fillRect(bx, by, bw, b.h);

        // Building Border / Neon Edge
        ctx.strokeStyle = isDark
          ? (b.isHospital ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 255, 255, 0.05)')
          : (b.isHospital ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 0, 0, 0.06)');
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, b.h);

        // Windows illumination
        const winW = bw / 6;
        const winH = 8;
        b.windows.forEach(w => {
          if (w.lit) {
            const wx = bx + (w.c + 1) * (bw / 5) - winW / 2;
            const wy = by + 20 + w.r * 22;
            if (wy < horizonY - 10) {
              ctx.fillStyle = isDark ? w.hue : '#f59e0b';
              ctx.globalAlpha = 0.35 + Math.sin(time + w.r * 2) * 0.15;
              ctx.fillRect(wx, wy, winW * 0.7, winH);
              ctx.globalAlpha = 1.0;
            }
          }
        });

        // If Hospital: Render Glowing Red Medical Cross & Pulse Wave
        if (b.isHospital) {
          const crossX = bx + bw / 2;
          const crossY = by + 24;

          // Neon Glow Pulse
          const pulse = (Math.sin(time * 3) + 1) / 2;
          ctx.beginPath();
          ctx.arc(crossX, crossY, 26 + pulse * 14, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? `rgba(255, 0, 85, ${0.15 * pulse})` : `rgba(239, 68, 68, ${0.2 * pulse})`;
          ctx.fill();

          // Medical Cross
          ctx.fillStyle = '#ff0055';
          ctx.shadowColor = '#ff0055';
          ctx.shadowBlur = isDark ? 16 : 6;
          // Vertical bar
          ctx.fillRect(crossX - 3.5, crossY - 14, 7, 28);
          // Horizontal bar
          ctx.fillRect(crossX - 14, crossY - 3.5, 28, 7);
          ctx.shadowBlur = 0; // reset
        }
      });

      // 4. Ground Perspective / Fast Highway
      const groundGrad = ctx.createLinearGradient(0, horizonY, 0, height);
      if (isDark) {
        groundGrad.addColorStop(0, '#06060e');
        groundGrad.addColorStop(1, '#020205');
      } else {
        groundGrad.addColorStop(0, '#e2e8f0');
        groundGrad.addColorStop(1, '#cbd5e1');
      }
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, horizonY, width, height - horizonY);

      // 3D Perspective Road Grid Lines
      const roadCenter = width * 0.5;
      const roadTop = horizonY;
      const roadBottom = height;
      const roadLeft = -width * 0.1;
      const roadRight = width * 1.1;

      // Perspective lane marks
      ctx.strokeStyle = isDark ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0, 100, 255, 0.12)';
      ctx.lineWidth = 2;
      for (let i = -4; i <= 4; i++) {
        const bottomOffset = i * (width * 0.15);
        ctx.beginPath();
        ctx.moveTo(roadCenter + i * 25, roadTop);
        ctx.lineTo(roadCenter + bottomOffset, roadBottom);
        ctx.stroke();
      }

      // Fast Moving Highway Dashed Line (Speed Illusion)
      const speedOffset = (time * 260) % 80;
      ctx.strokeStyle = '#ffd600';
      ctx.lineWidth = 4;
      ctx.setLineDash([30, 50]);
      ctx.lineDashOffset = -speedOffset;
      ctx.beginPath();
      ctx.moveTo(roadCenter - 40, roadTop);
      ctx.lineTo(width * 0.35, roadBottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(roadCenter + 40, roadTop);
      ctx.lineTo(width * 0.65, roadBottom);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // 5. CINEMATIC AMBULANCE DRIVING AT HIGH SPEED
      // Moves smoothly across the lower perspective lane with pulsing emergency sirens
      const ambProgress = (time * 0.22) % 1.25 - 0.15; // -0.15 to 1.1 across screen
      const ambX = ambProgress * width;
      const ambY = horizonY + (height - horizonY) * 0.48;
      const ambScale = 1.15;

      if (ambX > -150 && ambX < width + 150) {
        ctx.save();
        ctx.translate(ambX, ambY);
        ctx.scale(ambScale, ambScale);

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.ellipse(0, 32, 65, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ambulance Main Body (White Van)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-55, -20, 110, 48, 8);
        ctx.fill();

        // Front Cabin Windshield
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(35, -16);
        ctx.lineTo(52, 2);
        ctx.lineTo(35, 2);
        ctx.closePath();
        ctx.fill();

        // Side Medical Red Stripe
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(-55, 4, 105, 8);

        // Red Cross on side
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(-15, -12, 14, 4);
        ctx.fillRect(-10, -17, 4, 14);

        // Wheels
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-35, 26, 11, 0, Math.PI * 2);
        ctx.arc(35, 26, 11, 0, Math.PI * 2);
        ctx.fill();

        // Wheel Rims
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(-35, 26, 5, 0, Math.PI * 2);
        ctx.arc(35, 26, 5, 0, Math.PI * 2);
        ctx.fill();

        // Front Headlight Beam (High-Tech Beam onto Road)
        const lightGrad = ctx.createRadialGradient(55, 12, 5, 160, 20, 120);
        lightGrad.addColorStop(0, 'rgba(255, 255, 200, 0.85)');
        lightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
        lightGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lightGrad;
        ctx.beginPath();
        ctx.moveTo(55, 8);
        ctx.lineTo(240, -10);
        ctx.lineTo(260, 50);
        ctx.lineTo(55, 18);
        ctx.closePath();
        ctx.fill();

        // High-Speed Motion Trail Behind Ambulance
        const trailGrad = ctx.createLinearGradient(-55, 0, -160, 0);
        trailGrad.addColorStop(0, 'rgba(255, 0, 85, 0.6)');
        trailGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = trailGrad;
        ctx.fillRect(-160, 4, 105, 8);

        // Flashing Strobe Siren Beacons (Alternating Red & Blue)
        const sirenPhase = Math.floor(time * 16) % 2 === 0;
        const sirenColor = sirenPhase ? '#ff0055' : '#007aff';
        
        // Siren Beacon Base
        ctx.fillStyle = sirenColor;
        ctx.beginPath();
        ctx.arc(5, -23, 6, 0, Math.PI * 2);
        ctx.fill();

        // Rotating Siren Light Beam (Police/Emergency Strobe)
        ctx.save();
        ctx.translate(5, -23);
        ctx.rotate(time * 12);
        const strobeGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 75);
        strobeGrad.addColorStop(0, sirenColor);
        strobeGrad.addColorStop(0.4, sirenPhase ? 'rgba(255, 0, 85, 0.4)' : 'rgba(0, 122, 255, 0.4)');
        strobeGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = strobeGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 75, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
      }

      // 6. SOS Radar Sonar Wave Pulse from Patient
      const sosX = width * 0.2;
      const sosY = horizonY + 80;
      const waveRadius = (time * 50) % 110;
      const waveAlpha = Math.max(0, 1 - waveRadius / 110);

      // Patient Marker
      ctx.beginPath();
      ctx.arc(sosX, sosY, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Sonar Ripples
      ctx.beginPath();
      ctx.arc(sosX, sosY, waveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 0, 85, ${waveAlpha * 0.75})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sosX, sosY, (waveRadius + 45) % 110, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 0, 85, ${Math.max(0, 1 - ((waveRadius + 45) % 110) / 110) * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // SOS Label
      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
      ctx.font = '700 11px Outfit, sans-serif';
      ctx.fillText('🚨 PATIENT SOS', sosX - 38, sosY - 14);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
}
