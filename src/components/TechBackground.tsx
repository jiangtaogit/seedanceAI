import { useEffect, useRef } from 'react';

/**
 * 超炫科技背景 — 多层 Canvas 动画
 * Layer 1: 星尘层 (微闪烁星空)
 * Layer 2: 粒子网络层 (连线 + 鼠标交互)
 * Layer 3: 数据流光线层 (垂直/水平脉冲光束)
 * Layer 4: 脉冲波纹层 (随机扩散圆环)
 * CSS: 流动光晕 + 六边形网格
 */
export default function TechBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let W = 0, H = 0;

    // ============ 鼠标追踪 ============
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // ============ 星尘 ============
    interface Star { x: number; y: number; r: number; baseAlpha: number; phase: number; speed: number; }
    let stars: Star[] = [];

    const initStars = () => {
      const count = Math.min(Math.floor((W * H) / 6000), 300);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.2 + 0.2,
        baseAlpha: Math.random() * 0.5 + 0.1,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.005,
      }));
    };

    // ============ 粒子网络 ============
    interface Particle {
      x: number; y: number; vx: number; vy: number; r: number;
      color: string; pulsePhase: number; pulseSpeed: number;
    }
    let particles: Particle[] = [];
    const COLORS = ['#00d4ff', '#a855f7', '#00ff88', '#06b6d4', '#8b5cf6'];

    const initParticles = () => {
      const count = Math.min(Math.floor((W * H) / 15000), 150);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.03 + 0.01,
      }));
    };

    // ============ 数据流光束 ============
    interface DataStream {
      x: number; y: number; length: number; speed: number;
      alpha: number; horizontal: boolean; color: string; life: number; maxLife: number;
    }
    let dataStreams: DataStream[] = [];

    const spawnDataStream = () => {
      if (dataStreams.length > 15) return;
      const horizontal = Math.random() > 0.6;
      const color = Math.random() > 0.5 ? '#00d4ff' : '#a855f7';
      dataStreams.push({
        x: horizontal ? -100 : Math.random() * W,
        y: horizontal ? Math.random() * H : -100,
        length: Math.random() * 200 + 80,
        speed: Math.random() * 3 + 1.5,
        alpha: Math.random() * 0.3 + 0.1,
        horizontal,
        color,
        life: 0,
        maxLife: Math.random() * 200 + 100,
      });
    };

    // ============ 脉冲波纹 ============
    interface Pulse { x: number; y: number; r: number; maxR: number; alpha: number; speed: number; color: string; }
    let pulses: Pulse[] = [];
    let pulseTimer = 0;

    const spawnPulse = () => {
      if (pulses.length > 6) return;
      const colors = ['#00d4ff', '#a855f7', '#00ff88'];
      pulses.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0,
        maxR: Math.random() * 200 + 100,
        alpha: 0.25,
        speed: Math.random() * 1.5 + 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    };

    // ============ 尺寸 ============
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      initStars();
      initParticles();
      dataStreams = [];
      pulses = [];
    };

    // ============ 主循环 ============
    let frameCount = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frameCount++;
      const mouse = mouseRef.current;

      // --- Layer 1: 星尘 ---
      for (const s of stars) {
        s.phase += s.speed;
        const flicker = Math.sin(s.phase) * 0.5 + 0.5;
        const alpha = s.baseAlpha * (0.4 + flicker * 0.6);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 220, 255, ${alpha})`;
        ctx.fill();
      }

      // --- Layer 2: 粒子网络 + 鼠标交互 ---
      const maxDist = 160;
      for (const p of particles) {
        // 鼠标交互：轻微吸引
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 1) {
          const force = (200 - dist) / 200 * 0.015;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // 速度衰减
        p.vx *= 0.998;
        p.vy *= 0.998;

        // 限速
        const maxSpeed = 0.8;
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > maxSpeed) {
          p.vx = (p.vx / speed) * maxSpeed;
          p.vy = (p.vy / speed) * maxSpeed;
        }

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        p.pulsePhase += p.pulseSpeed;
      }

      // 连线
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.2;
            ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // 鼠标连线
      if (mouse.x > 0 && mouse.y > 0) {
        for (const p of particles) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 250) {
            const alpha = (1 - dist / 250) * 0.3;
            ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
        // 鼠标中心光点
        const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 30);
        grad.addColorStop(0, 'rgba(0, 212, 255, 0.15)');
        grad.addColorStop(1, 'rgba(0, 212, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 30, 0, Math.PI * 2);
        ctx.fill();
      }

      // 粒子绘制
      for (const p of particles) {
        const pulse = Math.sin(p.pulsePhase) * 0.3 + 0.7;
        const r = p.r * pulse;
        // 发光光圈
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
        grd.addColorStop(0, p.color.replace(')', `, ${0.15 * pulse})`).replace('rgb', 'rgba'));
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
        ctx.fill();
        // 核心点
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.6 * pulse;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // --- Layer 3: 数据流光束 ---
      if (frameCount % 30 === 0) spawnDataStream();
      for (let i = dataStreams.length - 1; i >= 0; i--) {
        const s = dataStreams[i];
        s.life++;
        if (s.horizontal) {
          s.x += s.speed;
        } else {
          s.y += s.speed;
        }

        const progress = s.life / s.maxLife;
        const fadeAlpha = progress < 0.2 ? progress / 0.2 : progress > 0.8 ? (1 - progress) / 0.2 : 1;

        if (s.life >= s.maxLife || s.x > W + 100 || s.y > H + 100) {
          dataStreams.splice(i, 1);
          continue;
        }

        // 绘制光束（带渐变尾迹）
        const tailLen = s.length;
        let x1: number, y1: number, x2: number, y2: number;
        if (s.horizontal) {
          x1 = s.x; y1 = s.y;
          x2 = s.x - tailLen; y2 = s.y;
        } else {
          x1 = s.x; y1 = s.y;
          x2 = s.x; y2 = s.y - tailLen;
        }

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        const baseColor = s.color === '#00d4ff' ? '0, 212, 255' : '168, 85, 247';
        gradient.addColorStop(0, `rgba(${baseColor}, ${s.alpha * fadeAlpha})`);
        gradient.addColorStop(1, `rgba(${baseColor}, 0)`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // 光束头部发光
        const headGlow = ctx.createRadialGradient(x1, y1, 0, x1, y1, 8);
        headGlow.addColorStop(0, `rgba(${baseColor}, ${0.4 * fadeAlpha})`);
        headGlow.addColorStop(1, `rgba(${baseColor}, 0)`);
        ctx.fillStyle = headGlow;
        ctx.beginPath();
        ctx.arc(x1, y1, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Layer 4: 脉冲波纹 ---
      pulseTimer++;
      if (pulseTimer > 120 + Math.random() * 100) {
        spawnPulse();
        pulseTimer = 0;
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.r += p.speed;
        p.alpha = 0.25 * (1 - p.r / p.maxR);

        if (p.r >= p.maxR) {
          pulses.splice(i, 1);
          continue;
        }

        // 外环
        ctx.strokeStyle = p.color.replace(')', `, ${p.alpha})`).replace('#', '');
        const hexToRgba = (hex: string, a: number) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${a})`;
        };
        ctx.strokeStyle = hexToRgba(p.color, p.alpha);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();

        // 内环
        if (p.r > 10) {
          ctx.strokeStyle = hexToRgba(p.color, p.alpha * 0.5);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(draw);
    };

    resize();
    draw();

    const handleResize = () => {
      resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Canvas 多层动画 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* 流动光晕层 — 更大更炫 */}
      <div className="absolute inset-0">
        <div className="tech-glow tech-glow-1" />
        <div className="tech-glow tech-glow-2" />
        <div className="tech-glow tech-glow-3" />
        <div className="tech-glow tech-glow-4" />
        <div className="tech-glow tech-glow-5" />
        <div className="tech-glow tech-glow-6" />
      </div>

      {/* 六边形网格层 */}
      <div className="absolute inset-0 tech-hex-overlay" />
    </div>
  );
}
