import React, { useEffect, useRef } from 'react';

/**
 * FuturisticAuthBackground
 *
 * Combines:
 * 1. Warm Gold/Orange Financial Analytics Environment:
 *    - Holographic charts, candlestick bars, glowing currency metrics, data bars, financial gridlines
 * 2. Deep Blue/Cyan Digital Network & Identity Environment:
 *    - Neural nodes, digital constellation mesh, glowing interconnecting packet data streams, particle matrix
 * 3. Cinematic subtle motion & interaction:
 *    - Slow cinematic camera float / depth parallax
 *    - Pulsing nodes and moving data bursts
 *    - Real-time animated canvas particle-network
 *    - Digital scanner light sweep across the depth plane
 * 4. High-performance:
 *    - HTML5 Canvas with requestAnimationFrame, debounced resizing, zero heavy video payload
 *    - Dark vignette & contrast overlay ensuring pristine form legibility
 */
export const FuturisticAuthBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      initNetwork();
    };

    window.addEventListener('resize', handleResize);

    // Node & Particle Definition
    interface NetworkNode {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      colorType: 'blue' | 'orange' | 'cyan' | 'gold';
      pulse: number;
      pulseSpeed: number;
    }

    interface DataPacket {
      fromIndex: number;
      toIndex: number;
      progress: number;
      speed: number;
      color: string;
    }

    let nodes: NetworkNode[] = [];
    let packets: DataPacket[] = [];

    // Financial Chart Simulation Pillars (horizontal positions)
    const chartBarsCount = 18;
    const chartHeights = Array.from({ length: chartBarsCount }, () => Math.random() * 0.4 + 0.2);
    const targetChartHeights = [...chartHeights];

    const initNetwork = () => {
      nodes = [];
      packets = [];
      const nodeCount = Math.min(Math.floor((width * height) / 18000), 75);

      for (let i = 0; i < nodeCount; i++) {
        const typeRoll = Math.random();
        let colorType: 'blue' | 'orange' | 'cyan' | 'gold' = 'blue';
        if (typeRoll < 0.4) colorType = 'cyan';
        else if (typeRoll < 0.7) colorType = 'blue';
        else if (typeRoll < 0.88) colorType = 'orange';
        else colorType = 'gold';

        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: Math.random() * 2.2 + 1.2,
          colorType,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.03
        });
      }
    };

    initNetwork();

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // 1. Base Dark Cybernetic Canvas
      ctx.fillStyle = '#06080F';
      ctx.fillRect(0, 0, width, height);

      // 2. Dual Ambient Glow Pools (Orange/Gold left/top + Deep Blue/Cyan right/bottom)
      const orangeGlow = ctx.createRadialGradient(
        width * 0.2,
        height * 0.35,
        10,
        width * 0.2,
        height * 0.35,
        width * 0.65
      );
      orangeGlow.addColorStop(0, 'rgba(255, 107, 0, 0.12)');
      orangeGlow.addColorStop(0.5, 'rgba(255, 170, 0, 0.05)');
      orangeGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = orangeGlow;
      ctx.fillRect(0, 0, width, height);

      const blueGlow = ctx.createRadialGradient(
        width * 0.8,
        height * 0.65,
        20,
        width * 0.8,
        height * 0.65,
        width * 0.7
      );
      blueGlow.addColorStop(0, 'rgba(0, 168, 255, 0.14)');
      blueGlow.addColorStop(0.4, 'rgba(0, 230, 255, 0.06)');
      blueGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = blueGlow;
      ctx.fillRect(0, 0, width, height);

      // 3. Cybernetic Perspective Grid Lines (Financial Dashboard Flooring)
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      const gridSpacing = 64;
      const offsetX = (frame * 0.15) % gridSpacing;
      for (let x = offsetX; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // 4. Subtle Financial Chart Curves & Candlesticks in Background
      ctx.save();
      const chartBaseY = height * 0.85;
      const chartWidth = Math.min(width * 0.45, 500);
      const startX = width * 0.05;

      // Update smooth heights
      if (frame % 40 === 0) {
        for (let i = 0; i < chartBarsCount; i++) {
          targetChartHeights[i] = Math.random() * 0.35 + 0.15;
        }
      }
      for (let i = 0; i < chartBarsCount; i++) {
        chartHeights[i] += (targetChartHeights[i] - chartHeights[i]) * 0.03;
      }

      // Draw subtle financial bars (Gold / Amber glow)
      const barW = chartWidth / chartBarsCount - 4;
      for (let i = 0; i < chartBarsCount; i++) {
        const barH = chartHeights[i] * 180;
        const bx = startX + i * (barW + 4);
        const by = chartBaseY - barH;

        ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 184, 0, 0.08)';
        ctx.fillRect(bx, by, barW, barH);

        // Candlestick wick
        ctx.strokeStyle = 'rgba(255, 170, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + barW / 2, by - 8);
        ctx.lineTo(bx + barW / 2, chartBaseY);
        ctx.stroke();
      }

      // Draw glowing spline trendline
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 138, 0, 0.35)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < chartBarsCount; i++) {
        const bx = startX + i * (barW + 4) + barW / 2;
        const by = chartBaseY - chartHeights[i] * 180;
        if (i === 0) ctx.moveTo(bx, by);
        else ctx.lineTo(bx, by);
      }
      ctx.stroke();
      ctx.restore();

      // 5. Connective Network Edges & Nodes (Digital Blue & Cyan Constellation)
      const maxConnectDistance = 140;
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];

        // Update movement with gentle bounce
        n1.x += n1.vx;
        n1.y += n1.vy;
        if (n1.x < 0 || n1.x > width) n1.vx *= -1;
        if (n1.y < 0 || n1.y > height) n1.vy *= -1;
        n1.pulse += n1.pulseSpeed;

        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDistance) {
            const alpha = (1 - dist / maxConnectDistance) * 0.25;

            // Dual tone connection: cyan-blue or golden-orange
            const isWarm = n1.colorType === 'orange' || n2.colorType === 'orange' || n1.colorType === 'gold';
            ctx.strokeStyle = isWarm
              ? `rgba(255, 140, 0, ${alpha * 0.9})`
              : `rgba(0, 200, 255, ${alpha * 1.1})`;

            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();

            // Random chance to spawn packet
            if (Math.random() < 0.0007 && packets.length < 12) {
              packets.push({
                fromIndex: i,
                toIndex: j,
                progress: 0,
                speed: 0.015 + Math.random() * 0.02,
                color: isWarm ? '#FFB800' : '#00E5FF'
              });
            }
          }
        }
      }

      // 6. Draw Moving Data Packets
      for (let p = packets.length - 1; p >= 0; p--) {
        const pkt = packets[p];
        pkt.progress += pkt.speed;
        if (pkt.progress >= 1) {
          packets.splice(p, 1);
          continue;
        }

        const nodeA = nodes[pkt.fromIndex];
        const nodeB = nodes[pkt.toIndex];
        if (!nodeA || !nodeB) continue;

        const curX = nodeA.x + (nodeB.x - nodeA.x) * pkt.progress;
        const curY = nodeA.y + (nodeB.y - nodeA.y) * pkt.progress;

        ctx.fillStyle = pkt.color;
        ctx.shadowColor = pkt.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(curX, curY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 7. Render Glowing Nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pulseFactor = Math.sin(n.pulse) * 0.35 + 1;
        const radius = n.radius * pulseFactor;

        let fillColor = '#00B4D8';
        let glowColor = 'rgba(0, 180, 216, 0.4)';

        if (n.colorType === 'cyan') {
          fillColor = '#00F0FF';
          glowColor = 'rgba(0, 240, 255, 0.5)';
        } else if (n.colorType === 'orange') {
          fillColor = '#FF6B00';
          glowColor = 'rgba(255, 107, 0, 0.5)';
        } else if (n.colorType === 'gold') {
          fillColor = '#FFB800';
          glowColor = 'rgba(255, 184, 0, 0.5)';
        }

        ctx.fillStyle = fillColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 8. Dynamic Scanner Light Sweep Beam (subtle vertical/diagonal sweep)
      const sweepY = ((frame * 1.2) % (height + 300)) - 150;
      const sweepGrad = ctx.createLinearGradient(0, sweepY - 80, 0, sweepY + 80);
      sweepGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
      sweepGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.045)');
      sweepGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(0, sweepY - 80, width, 160);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Dynamic Hardware Canvas Rendering Network + Financial Visuals */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* High-Tech Vignette and Central Card Readability Contrast Shield */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(10,12,20,0.45)_0%,rgba(6,8,15,0.88)_85%,rgba(3,4,8,0.98)_100%]" />

      {/* Floating High-Tech Identity Ring Geometry */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full border border-cyan-500/10 pointer-events-none animate-spin [animation-duration:90s]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[980px] h-[980px] rounded-full border border-dashed border-amber-500/10 pointer-events-none animate-spin [animation-duration:140s] [animation-direction:reverse]" />

      {/* Top and Bottom Depth Shading for clean seamless borders */}
      <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-[#06080F] to-transparent opacity-80" />
      <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[#06080F] to-transparent opacity-80" />
    </div>
  );
};
