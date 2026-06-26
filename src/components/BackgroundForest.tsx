import { useEffect, useRef, useState } from 'react';

// URL gambar kastil dari internet yang dijamin selalu muncul di Vercel
const CASTLE_IMAGE_URL = "https://images.unsplash.com/photo-1508349937151-22b68b72d5b1?auto=format&fit=crop&w=1200&q=80";

interface BackgroundForestProps {
  children?: React.ReactNode;
}

export default function BackgroundForest({ children }: BackgroundForestProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX,
        y: e.clientY,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      alpha: number;
      decay: number;
      color: string;
      phase: number;
      type: 'firefly' | 'dust' | 'leaf';
      rotation?: number;
      rotSpeed?: number;
    }

    const particles: Particle[] = [];

    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1.5,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.7 + 0.3,
        decay: 0,
        color: '#D7BB7A',
        phase: Math.random() * Math.PI * 2,
        type: 'firefly',
      });
    }

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: -Math.random() * 0.25 - 0.05,
        alpha: Math.random() * 0.5 + 0.1,
        decay: 0,
        color: '#C7A86D',
        phase: Math.random() * Math.PI,
        type: 'dust',
      });
    }

    for (let i = 0; i < 15; i++) {
      particles.push({
        x: Math.random() * width,
        y: -50 - Math.random() * height,
        size: Math.random() * 4 + 4,
        speedX: (Math.random() - 0.3) * 0.3,
        speedY: Math.random() * 0.5 + 0.3,
        alpha: Math.random() * 0.6 + 0.2,
        decay: 0,
        color: '#E9DFC8',
        phase: Math.random() * Math.PI * 2,
        type: 'leaf',
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.015,
      });
    }

    const drawAmbientLighting = () => {
      const gradient = ctx.createRadialGradient(
        width / 2 + (mousePos.x - width / 2) * 0.03,
        height / 4 + (mousePos.y - height / 2) * 0.03,
        height / 8,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.8
      );
      // Diubah sedikit transparan agar gambar kastil di belakangnya tembus
      gradient.addColorStop(0, 'rgba(26, 34, 28, 0.4)'); 
      gradient.addColorStop(0.4, 'rgba(17, 21, 18, 0.7)'); 
      gradient.addColorStop(1, 'rgba(11, 12, 10, 0.9)'); 
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const rayGrd = ctx.createLinearGradient(width * 0.8, 0, width * 0.2, height);
      rayGrd.addColorStop(0, 'rgba(199, 168, 109, 0.07)');
      rayGrd.addColorStop(0.5, 'rgba(26, 34, 28, 0.03)');
      rayGrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rayGrd;

      ctx.beginPath();
      ctx.moveTo(width * 0.7, -100);
      ctx.lineTo(width * 1.1, -100);
      ctx.lineTo(width * 0.4, height + 100);
      ctx.lineTo(width * 0.0, height + 100);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(width * 0.85, -100);
      ctx.lineTo(width * 1.3, -100);
      ctx.lineTo(width * 0.7, height + 100);
      ctx.lineTo(width * 0.35, height + 100);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const updateAndDrawParticles = () => {
      particles.forEach((p) => {
        const dx = p.x - mousePos.x;
        const dy = p.y - mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          const force = (180 - dist) / 180;
          p.x += (dx / dist) * force * 1.8;
          p.y += (dy / dist) * force * 1.8;
        }

        if (p.type === 'firefly') {
          p.phase += 0.015;
          p.x += p.speedX + Math.sin(p.phase) * 0.25;
          p.y += p.speedY + Math.cos(p.phase) * 0.15;
          const pulseAlpha = Math.max(0.1, p.alpha * (0.6 + Math.sin(p.phase * 2.5) * 0.4));

          ctx.shadowBlur = p.size * 4;
          ctx.shadowColor = '#D7BB7A';
          ctx.fillStyle = `rgba(215, 187, 122, ${pulseAlpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (p.type === 'dust') {
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }

          ctx.fillStyle = `rgba(199, 168, 109, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'leaf') {
          p.phase += 0.01;
          p.x += p.speedX + Math.sin(p.phase) * 0.5;
          p.y += p.speedY;
          if (p.rotation !== undefined && p.rotSpeed !== undefined) {
            p.rotation += p.rotSpeed;
          }

          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          if (p.rotation !== undefined) {
            ctx.rotate(p.rotation);
          }
          ctx.fillStyle = `rgba(233, 223, 200, ${p.alpha})`;
          
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.quadraticCurveTo(p.size * 0.6, -p.size * 0.2, 0, p.size);
          ctx.quadraticCurveTo(-p.size * 0.6, -p.size * 0.2, 0, -p.size);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
      });
    };

    const loop = () => {
      ctx.clearRect(0, 0, width, height);
      drawAmbientLighting();
      updateAndDrawParticles();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [mousePos]);

  return (
    <div 
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative overflow-x-hidden"
      style={{ backgroundImage: `url(${CASTLE_IMAGE_URL})` }}
    >
      {/* Canvas partikel kunang-kunang menari di atas foto kastil */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 mix-blend-screen"
        id="living-forest-canvas"
      />
      
      {/* Konten utama website kamu agar muncul di atas background */}
      <div className="relative z-10 w-full min-h-screen">
        {children}
      </div>
    </div>
  );
}