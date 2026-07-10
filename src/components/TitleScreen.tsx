import { motion } from 'motion/react';
import { synthAudioEngine } from './AudioEngine';
import { LEVELS } from '../data/levels';
import { Volume2, VolumeX, Shield, Play, HelpCircle, Swords, Zap, Moon, Cpu, Flame, Check, ArrowLeft, Gamepad2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, ChangeEvent, useEffect, useRef } from 'react';
import GameCover from './GameCover';
import ControlPad from './ControlPad';

interface TitleScreenProps {
  unlockedLevels: number[];
  bestSpeeds: { [levelId: number]: string };
  onStartLevel: (levelId: number) => void;
}

// Beautifully animated classic retro 3D perspective grid & starfield background
function RetroGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let offset = 0;

    const stars: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];
    for (let i = 0; i < 45; i++) {
      stars.push({
        x: Math.random() * 800,
        y: Math.random() * 400,
        size: 0.5 + Math.random() * 1.5,
        speed: 0.08 + Math.random() * 0.15,
        opacity: 0.2 + Math.random() * 0.8,
      });
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars.forEach(s => {
        s.x = Math.random() * canvas.width;
        s.y = Math.random() * (canvas.height * 0.55);
      });
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      // Dark vintage arcade cabinet backdrop color
      ctx.fillStyle = '#020108';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const h = canvas.height;
      const w = canvas.width;
      const horizon = h * 0.52;

      // Draw drifting retro stars
      stars.forEach(s => {
        s.x -= s.speed;
        if (s.x < 0) s.x = w;
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity * (1 - s.y / horizon)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ambient scanlines overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
      for (let sl = 0; sl < h; sl += 4) {
        ctx.fillRect(0, sl, w, 1.5);
      }

      // Neon Horizon Glowing Divider
      ctx.strokeStyle = '#ff3b5f';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ff3b5f';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(w, horizon);
      ctx.stroke();

      // Atmospheric space/neon gradient glow
      const grad = ctx.createLinearGradient(0, horizon - 100, 0, horizon + 120);
      grad.addColorStop(0, 'rgba(255, 59, 95, 0)');
      grad.addColorStop(0.5, 'rgba(255, 59, 95, 0.12)');
      grad.addColorStop(0.52, 'rgba(0, 229, 255, 0.22)');
      grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, horizon - 100, w, 220);

      ctx.shadowBlur = 0;

      // 3D Perspective Radial Grid Lines
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 2;

      const numLines = 20;
      const step = w / numLines;
      const cx = w / 2; // vanishing point at screen horizontal center

      for (let i = -8; i <= numLines + 8; i++) {
        const xAtBottom = i * step;
        ctx.beginPath();
        ctx.moveTo(cx, horizon);
        ctx.lineTo(xAtBottom, h);
        ctx.stroke();
      }

      // 3D Scrolling Perspective Horizontal Lines
      offset = (offset + 1.1) % 36;
      for (let y = 0; y < h - horizon; y += 14) {
        const relativeY = (y + offset) / (h - horizon);
        const screenY = horizon + Math.pow(relativeY, 1.7) * (h - horizon);
        if (screenY > h) continue;

        ctx.strokeStyle = `rgba(0, 229, 255, ${relativeY * 0.6})`;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(w, screenY);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40" />;
}

// Beautifully styled vector player character preview representation customized for each level environment
function PlayerSpritePreview({ levelId, featured }: { levelId: number; featured?: boolean }) {
  const sizeClass = featured ? 'w-5 h-8' : 'w-2.5 h-4';
  const swordClass = featured ? 'w-1 h-5' : 'w-0.5 h-2.5';
  
  let positionClass = '';
  let energyColor = 'bg-brand-cyan';
  let weaponClass = '';
  let motionEffect = '';

  switch (levelId) {
    case 1:
      // Standing on first platform
      positionClass = featured ? 'bottom-[32px] left-[52px]' : 'bottom-[16px] left-[20px]';
      energyColor = 'bg-brand-cyan';
      weaponClass = featured ? 'bottom-2 -right-1 rotate-[35deg]' : 'bottom-1 -right-0.5 rotate-[35deg]';
      break;
    case 2:
      // Wall sliding on vertical barrier / automated tower
      positionClass = featured ? 'bottom-[42px] right-[40px]' : 'bottom-[22px] right-[20px]';
      energyColor = 'bg-brand-pink';
      weaponClass = featured ? 'top-1 -left-1 -rotate-[45deg]' : 'top-0.5 -left-0.5 -rotate-[45deg]';
      motionEffect = 'animate-pulse';
      break;
    case 3:
      // Jumping high over the boiler reactor
      positionClass = featured ? 'bottom-[64px] left-[70px]' : 'bottom-[30px] left-[32px]';
      energyColor = 'bg-brand-cyan';
      weaponClass = featured ? 'bottom-2 -right-1.5 rotate-[70deg]' : 'bottom-1 -right-0.5 rotate-[70deg]';
      break;
    case 4:
      // Hovering/floating in singular void
      positionClass = featured ? 'top-[42%] left-[45%]' : 'top-[36%] left-[42%]';
      energyColor = 'bg-brand-orange';
      weaponClass = featured ? 'bottom-1 -right-1 rotate-[15deg]' : 'bottom-0.5 -right-0.5 rotate-[15deg]';
      motionEffect = 'animate-bounce';
      break;
    case 5:
      // In sprint-dash pose on overdrive runway
      positionClass = featured ? 'bottom-[32px] left-[42px]' : 'bottom-[16px] left-[18px]';
      energyColor = 'bg-brand-cyan';
      weaponClass = featured ? 'bottom-0 -right-2 rotate-[90deg]' : 'bottom-0 -right-1 rotate-[90deg]';
      motionEffect = 'skew-x-12';
      break;
    case 7:
      // Standing on sewer platform holding weapon
      positionClass = featured ? 'bottom-[30px] left-[80px]' : 'bottom-[12px] left-[36px]';
      energyColor = 'bg-emerald-400';
      weaponClass = featured ? 'bottom-2 -right-1 rotate-[45deg]' : 'bottom-1 -right-0.5 rotate-[45deg]';
      break;
    case 8:
      // Fast run down the speed tower elevator
      positionClass = featured ? 'bottom-[48px] right-[32px]' : 'bottom-[22px] right-[14px]';
      energyColor = 'bg-brand-pink';
      weaponClass = featured ? 'bottom-2 -right-1 rotate-[35deg]' : 'bottom-1 -right-0.5 rotate-[35deg]';
      break;
    default:
      // Standing on platform
      positionClass = featured ? 'bottom-[32px] left-[52px]' : 'bottom-[16px] left-[20px]';
      energyColor = 'bg-brand-cyan';
      weaponClass = featured ? 'bottom-2 -right-1 rotate-[35deg]' : 'bottom-1 -right-0.5 rotate-[35deg]';
  }

  return (
    <div 
      className={`absolute ${positionClass} ${sizeClass} ${motionEffect} flex flex-col items-center justify-between pointer-events-none z-20`}
      style={{
        filter: `drop-shadow(0 0 ${featured ? '6px' : '3px'} ${energyColor === 'bg-brand-cyan' ? '#00e5ff' : energyColor === 'bg-brand-pink' ? '#ff3b5f' : energyColor === 'bg-brand-orange' ? '#ff4500' : '#3bfca7'})`
      }}
    >
      {/* Glow Aura */}
      <div className="absolute inset-0 rounded bg-white/20 border border-white/40" />

      {/* Cyber Visor / Helmet */}
      <div className="w-full h-1/3 bg-zinc-950 flex items-center justify-center rounded-t-[3px] border-b border-white/20">
        <div className={`w-3/4 h-1/2 ${energyColor} rounded-full`} />
      </div>

      {/* Armored Cyber Torso */}
      <div className="w-full flex-1 bg-zinc-900 border-x border-white/10 flex flex-col justify-end p-0.5">
        <div className={`w-full h-1/2 ${energyColor} rounded-sm opacity-90`} />
      </div>

      {/* Neon energy weapon / sword */}
      <div className={`absolute ${weaponClass} ${swordClass} ${energyColor} rounded-sm opacity-95 border-l border-white/30`} />

      {/* Motion blur trail ghosting behind (only on featured screen for case 5) */}
      {featured && levelId === 5 && (
        <>
          <div className="absolute -left-3 opacity-30 w-full h-full bg-cyan-500/20 rounded pointer-events-none skew-x-12" />
          <div className="absolute -left-6 opacity-10 w-full h-full bg-cyan-500/10 rounded pointer-events-none skew-x-12" />
        </>
      )}
    </div>
  );
}

// Custom level vector preview graphics component to simulate level image captures
function LevelPreviewImage({ levelId, featured }: { levelId: number; featured?: boolean }) {
  const heightClass = featured ? 'h-36 md:h-44' : 'h-14 lg:h-16';
  if (levelId === 1) {
    return (
      <div className={`w-full ${heightClass} rounded-lg overflow-hidden relative mb-2 bg-gradient-to-b from-[#030e1a] via-[#050616] to-[#010208] border border-zinc-800/80 p-3 shadow-inner group transition-all duration-300`}>
        {/* Sky glow & Grid lines */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_top,rgba(0,229,255,0.15),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1328_1px,transparent_1px),linear-gradient(to_bottom,#0c1328_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-25 pointer-events-none" />
        
        {/* Deep Crescent Moon Visual */}
        <div className={`absolute ${featured ? 'top-4 right-6 w-14 h-14 shadow-[0_0_20px_rgba(0,229,255,0.5)]' : 'top-2 right-3 w-8 h-8 shadow-[0_0_8px_rgba(0,229,255,0.4)]'} rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 opacity-80 flex items-center justify-center transition-all duration-300`}>
          <div className={`${featured ? 'w-10 h-10 translate-x-2 -translate-y-2' : 'w-6 h-6 translate-x-1 -translate-y-1'} rounded-full bg-[#050616]`} />
        </div>

        {/* Floating Stars */}
        <div className="absolute top-2 left-4 w-1 h-1 bg-white rounded-full animate-ping pointer-events-none" />
        <div className="absolute top-6 left-12 w-0.5 h-0.5 bg-cyan-300 rounded-full" />
        {featured && (
          <>
            <div className="absolute top-10 left-24 w-1 h-1 bg-white rounded-full opacity-85 animate-pulse" />
            <div className="absolute top-14 left-6 w-[2px] h-[2px] bg-cyan-400 rounded-full" />
          </>
        )}

        {/* Level Floating Platforms representation */}
        <div className={`absolute ${featured ? 'bottom-8 left-6 w-32 h-3.5' : 'bottom-4 left-3 w-16 h-2'} bg-gradient-to-r from-cyan-500 to-transparent rounded shadow-[0_0_10px_rgba(0,229,255,0.6)]`} />
        {/* Shard collectible block */}
        <div className={`absolute ${featured ? 'bottom-16 left-16 w-3.5 h-3.5 shadow-[0_0_10px_rgba(255,59,95,1)]' : 'bottom-8 left-8 w-2 h-2 shadow-[0_0_6px_rgba(255,59,95,0.8)]'} bg-brand-pink rotate-45 transform`} />
        <div className={`absolute ${featured ? 'bottom-10 right-8 w-32 h-3' : 'bottom-5 right-4 w-16 h-1.5'} bg-zinc-800 rounded-full border border-zinc-700/40`} />
        
        {/* Simplified main character representation */}
        <PlayerSpritePreview levelId={levelId} featured={featured} />
      </div>
    );
  } else if (levelId === 2) {
    return (
      <div className={`w-full ${heightClass} rounded-lg overflow-hidden relative mb-2 bg-gradient-to-b from-[#180902] via-[#0b030e] to-[#040108] border border-zinc-800/80 p-3 shadow-inner group transition-all duration-300`}>
        {/* Sky laser/honeycomb glow */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_top,rgba(255,123,0,0.18),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f0e2b_1px,transparent_1px),linear-gradient(to_bottom,#1f0e2b_1px,transparent_1px)] bg-[size:1.2rem_1.2rem] opacity-35 pointer-events-none" />

        {/* High Voltage Defense Laser Fence */}
        <div className={`absolute top-0 bottom-0 ${featured ? 'left-16 w-2.5' : 'left-8 w-1'} bg-gradient-to-b from-transparent via-brand-pink to-transparent shadow-[0_0_12px_rgba(255,59,95,0.95)] animate-pulse`} />
        <div className={`absolute top-0 bottom-0 ${featured ? 'left-17 w-0.5' : 'left-9 w-[1px]'} bg-white opacity-90`} />

        {/* Automated Tower silhouette */}
        <div className={`absolute bottom-0 right-3 ${featured ? 'w-16 h-28 py-2 gap-2' : 'w-8 h-12 py-1 gap-1'} bg-zinc-950/80 border-t border-x border-zinc-850 rounded-t flex flex-col items-center`}>
          <div className={`${featured ? 'w-10 h-2.5' : 'w-5 h-1'} bg-orange-500/30 border border-orange-500/40`} />
          <div className={`${featured ? 'w-10 h-2.5' : 'w-5 h-1'} bg-brand-pink/30 border border-brand-pink/40`} />
        </div>

        {/* Dead Drop Abyss gaps */}
        <div className={`absolute bottom-0 left-2 ${featured ? 'w-12 h-6' : 'w-6 h-3'} bg-zinc-900 border border-zinc-800 rounded-t-sm`} />
        
        {/* Flashing power orb drone */}
        <div className={`absolute ${featured ? 'top-6 right-1/3 w-5 h-5' : 'top-2 right-1/3 w-3 h-3'} rounded-full bg-orange-500/30 border-2 border-brand-orange flex items-center justify-center animate-bounce`}>
          <div className={`${featured ? 'w-2 h-2' : 'w-1 h-1'} bg-brand-orange rounded-full shadow-[0_0_6px_rgba(255,165,0,0.8)]`} />
        </div>

        <div className={`absolute ${featured ? 'bottom-8 right-20 w-24 h-2.5' : 'bottom-4 right-10 w-12 h-1.5'} bg-gradient-to-r from-brand-orange to-transparent rounded shadow-[0_0_10px_rgba(255,123,0,0.6)]`} />
        
        {/* Simplified main character representation */}
        <PlayerSpritePreview levelId={levelId} featured={featured} />
      </div>
    );
  } else if (levelId === 3) {
    return (
      <div className={`w-full ${heightClass} rounded-lg overflow-hidden relative mb-2 bg-gradient-to-b from-[#011425] via-[#01263d] to-[#010c17] border border-zinc-800/80 p-3 shadow-inner group transition-all duration-300`}>
        {/* Sunken aquatic bubbles, grid lines */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_top,rgba(0,229,255,0.14),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#032038_1px,transparent_1px),linear-gradient(to_bottom,#032038_1px,transparent_1px)] bg-[size:1.4rem_1.4rem] opacity-30 pointer-events-none" />

        {/* Floating Bubble Vectors */}
        <div className="absolute bottom-4 left-8 w-1.5 h-1.5 rounded-full border border-cyan-400 opacity-60 animate-bounce" />
        <div className="absolute bottom-10 left-20 w-1 h-1 rounded-full border border-cyan-300 opacity-40 animate-pulse" />

        {/* Submerged hydraulic pressure pipe representation */}
        <div className={`absolute left-0 right-0 ${featured ? 'bottom-8 h-4' : 'bottom-4 h-2'} bg-gradient-to-b from-[#013554] to-[#011c33] border-y border-[#00d7ff]/20 opacity-80`} />

        {/* Large Reactor Core sphere glowing in background */}
        <div className={`absolute ${featured ? 'top-6 right-10 w-16 h-16' : 'top-2 right-4 w-8 h-8'} rounded-full bg-gradient-to-tr from-cyan-500/10 via-cyan-500/20 to-transparent border border-cyan-400/30 shadow-[0_0_12px_rgba(0,229,255,0.2)] animate-pulse`} />

        {/* Soft floating platform representation */}
        <div className={`absolute ${featured ? 'bottom-12 left-8 w-24 h-2.5' : 'bottom-6 left-4 w-12 h-1.5'} bg-gradient-to-r from-cyan-500 to-transparent rounded shadow-[0_0_10px_rgba(0,229,255,0.5)]`} />
        
        {/* Simplified main character representation */}
        <PlayerSpritePreview levelId={levelId} featured={featured} />
      </div>
    );
  } else if (levelId === 4) {
    return (
      <div className={`w-full ${heightClass} rounded-lg overflow-hidden relative mb-2 bg-gradient-to-b from-[#1c0206] via-[#050002] to-[#000] border border-zinc-800/80 p-3 shadow-inner group transition-all duration-300`}>
        <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(to_top,rgba(239,68,68,0.22),transparent)] pointer-events-none" />
        
        {/* Infinite Singular Void Event Horizon Rotating Core */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${featured ? 'w-24 h-24 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'w-12 h-12 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.3)]'} rounded-full bg-[#0a0002]/90 border flex items-center justify-center animate-spin`} style={{ animationDuration: '8s' }}>
          <div className={`${featured ? 'w-16 h-16' : 'w-8 h-8'} rounded-full border border-dashed border-brand-pink/30 animate-pulse`} />
        </div>

        {/* Glowing lava structures */}
        <div className={`absolute bottom-0 left-0 right-0 ${featured ? 'h-3' : 'h-1.5'} bg-gradient-to-r from-red-600 via-brand-pink to-red-900 border-t border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.7)]`} />

        {/* Spinning boss reactor crystal */}
        <div className={`absolute ${featured ? 'top-4 left-12 w-4 h-6' : 'top-2 left-6 w-2 h-3'} bg-brand-pink rotate-12 shadow-[0_0_10px_rgba(255,59,95,1)] animate-pulse`} />
        
        {/* Simplified main character representation */}
        <PlayerSpritePreview levelId={levelId} featured={featured} />
      </div>
    );
  } else if (levelId === 5) {
    return (
      <div className={`w-full ${heightClass} rounded-lg overflow-hidden relative mb-2 bg-gradient-to-b from-[#030e1a] via-[#050616] to-[#010208] border border-zinc-800/80 p-3 shadow-inner group transition-all duration-300`}>
        {/* Sky glow & Grid lines */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_top,rgba(0,255,234,0.15),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#081c24_1px,transparent_1px),linear-gradient(to_bottom,#081c24_1px,transparent_1px)] bg-[size:1.2rem_1.2rem] opacity-25 pointer-events-none" />
        
        {/* Rapid Reactor Core spheres */}
        <div className={`absolute ${featured ? 'top-4 right-6 w-10 h-10' : 'top-2 right-3 w-5 h-5'} rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 opacity-60 shadow-[0_0_15px_rgba(0,255,234,0.5)] animate-pulse`} />

        {/* Floating Fast Platforms */}
        <div className={`absolute ${featured ? 'bottom-8 left-6 w-20 h-2.5' : 'bottom-4 left-3 w-10 h-1.5'} bg-cyan-500 rounded shadow-[0_0_8px_rgba(0,255,234,0.7)]`} />
        <div className={`absolute ${featured ? 'bottom-16 right-10 w-20 h-2.5' : 'bottom-8 right-5 w-10 h-1.5'} bg-emerald-500 rounded shadow-[0_0_8px_rgba(52,211,153,0.7)]`} />
        
        {/* Simplified main character representation */}
        <PlayerSpritePreview levelId={levelId} featured={featured} />
      </div>
    );
  } else if (levelId === 7) {
    return (
      <div className={`w-full ${heightClass} rounded-lg overflow-hidden relative mb-2 bg-gradient-to-b from-[#010c08] via-[#021811] to-[#010403] border border-zinc-800/80 p-3 shadow-inner group transition-all duration-300`}>
        {/* Glow & Gird */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_top,rgba(59,252,167,0.18),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#051510_1px,transparent_1px),linear-gradient(to_bottom,#051510_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-35 pointer-events-none" />
        
        {/* Glowing Chemical Core */}
        <div className={`absolute ${featured ? 'top-4 right-6 w-10 h-10 shadow-[0_0_15px_rgba(59,252,167,0.5)]' : 'top-2 right-3 w-5 h-5 shadow-[0_0_8px_rgba(59,252,167,0.4)]'} rounded-full bg-gradient-to-tr from-[#3bfca7] to-emerald-600 opacity-80 animate-pulse`} />
        
        {/* Simplified main character representation */}
        <PlayerSpritePreview levelId={levelId} featured={featured} />
      </div>
    );
  } else {
    return (
      <div className={`w-full ${heightClass} rounded-lg overflow-hidden relative mb-2 bg-gradient-to-b from-[#181105] via-[#090602] to-[#040201] border border-zinc-800/80 p-3 shadow-inner group transition-all duration-300`}>
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_top,rgba(251,191,36,0.12),transparent)] pointer-events-none" />
        <div className={`absolute bottom-0 left-0 right-0 ${featured ? 'h-16' : 'h-8'} bg-zinc-900/40 border-t border-amber-500/20 rounded-t-xl`} />
        <div className={`absolute ${featured ? 'bottom-4 right-6 w-10 h-14' : 'bottom-2 right-3 w-5 h-7'} rounded-b-full bg-gradient-to-tr from-amber-500 to-yellow-600 opacity-90 animate-pulse`} />
        
        {/* Simplified main character representation */}
        <PlayerSpritePreview levelId={levelId} featured={featured} />
      </div>
    );
  }
}

export default function TitleScreen({ unlockedLevels, bestSpeeds, onStartLevel }: TitleScreenProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(synthAudioEngine.getMuted());
  const [volume, setVolume] = useState(synthAudioEngine.getVolume());
  const [showControls, setShowControls] = useState(false);
  const [showCover, setShowCover] = useState(false);

  // Persistent gamepad and controller button state ref to prevent re-render trigger repeats
  const prevButtonsRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,
    back: false
  });

  const lastInputTimeRef = useRef({
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    action: 0,
    back: 0
  });

  const handleMuteToggle = () => {
    const muted = synthAudioEngine.toggleMute();
    setIsMuted(muted);
    synthAudioEngine.playPhaseToggle(true);
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    synthAudioEngine.setVolume(vol);
    setVolume(vol);
    if (stateRefPlayTimer) clearTimeout(stateRefPlayTimer);
    stateRefPlayTimer = setTimeout(() => {
      synthAudioEngine.playJump();
    }, 150);
  };

  const handlePressToStart = () => {
    synthAudioEngine.playLevelClear(); // Play clear fanfare upon starting
    setHasStarted(true);
  };

  const handleMenuLeft = () => {
    if (!hasStarted) return;
    setActiveIndex((prev) => {
      const next = (prev - 1 + LEVELS.length) % LEVELS.length;
      synthAudioEngine.playJump();
      return next;
    });
  };

  const handleMenuRight = () => {
    if (!hasStarted) return;
    setActiveIndex((prev) => {
      const next = (prev + 1) % LEVELS.length;
      synthAudioEngine.playJump();
      return next;
    });
  };

  const handleMenuUp = () => {
    if (!hasStarted) return;
    setActiveIndex((prev) => {
      const cols = window.innerWidth >= 1024 ? 3 : 2;
      let next = prev - cols;
      if (next < 0) {
        next = prev;
      } else {
        synthAudioEngine.playJump();
      }
      return next;
    });
  };

  const handleMenuDown = () => {
    if (!hasStarted) return;
    setActiveIndex((prev) => {
      const cols = window.innerWidth >= 1024 ? 3 : 2;
      let next = prev + cols;
      if (next >= LEVELS.length) {
        next = prev;
      } else {
        synthAudioEngine.playJump();
      }
      return next;
    });
  };

  const handleMenuAction = () => {
    if (!hasStarted) {
      handlePressToStart();
    } else {
      const activeLevel = LEVELS[activeIndex];
      const isUnlocked = unlockedLevels.includes(activeLevel.id);
      if (isUnlocked) {
        onStartLevel(activeLevel.id);
      } else {
        synthAudioEngine.playHurt(); // Warning trigger buzzer
      }
    }
  };

  const handleMenuBack = () => {
    if (hasStarted) {
      setHasStarted(false);
      synthAudioEngine.playPhaseToggle(true);
    }
  };

  // Keyboard navigation controller
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleMenuLeft();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleMenuRight();
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        handleMenuUp();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        handleMenuDown();
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'q' || e.key === 'Q') {
        handleMenuAction();
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        handleMenuBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasStarted, activeIndex, unlockedLevels]);

  // Physical Gamepad API polling controller loop
  useEffect(() => {
    let animId = 0;

    const pollGamepad = () => {
      if (!navigator.getGamepads) {
        animId = requestAnimationFrame(pollGamepad);
        return;
      }
      const gamepads = navigator.getGamepads();
      let gp = null;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          gp = gamepads[i];
          break;
        }
      }

      if (gp) {
        const now = Date.now();
        // Read directional triggers
        const dpadUp = gp.buttons[12]?.pressed;
        const axisUp = gp.axes[1] !== undefined && gp.axes[1] < -0.4;
        const isUp = dpadUp || axisUp;

        const dpadDown = gp.buttons[13]?.pressed;
        const axisDown = gp.axes[1] !== undefined && gp.axes[1] > 0.4;
        const isDown = dpadDown || axisDown;

        const dpadLeft = gp.buttons[14]?.pressed;
        const axisLeft = gp.axes[0] !== undefined && gp.axes[0] < -0.4;
        const isLeft = dpadLeft || axisLeft;

        const dpadRight = gp.buttons[15]?.pressed;
        const axisRight = gp.axes[0] !== undefined && gp.axes[0] > 0.4;
        const isRight = dpadRight || axisRight;

        // Button 0 = A/Cross, Button 9 = Start, Button 2 = X/Square
        const isAction = gp.buttons[0]?.pressed || gp.buttons[9]?.pressed || gp.buttons[2]?.pressed;
        // Button 1 = B/Circle, Button 8 = Select
        const isBack = gp.buttons[1]?.pressed || gp.buttons[8]?.pressed;

        const prev = prevButtonsRef.current;
        const cooldowns = lastInputTimeRef.current;

        const checkTrigger = (isActive: boolean, key: 'up' | 'down' | 'left' | 'right' | 'action' | 'back', handler: () => void) => {
          if (isActive) {
            if (!prev[key]) {
              handler();
              cooldowns[key] = now + 300; // Initial repeat delay (300ms)
            } else if (now >= cooldowns[key]) {
              handler();
              cooldowns[key] = now + 150; // Continuous repeat rate (150ms)
            }
          }
          prev[key] = isActive;
        };

        checkTrigger(isUp, 'up', handleMenuUp);
        checkTrigger(isDown, 'down', handleMenuDown);
        checkTrigger(isLeft, 'left', handleMenuLeft);
        checkTrigger(isRight, 'right', handleMenuRight);
        checkTrigger(isAction, 'action', handleMenuAction);
        checkTrigger(isBack, 'back', handleMenuBack);
      }

      animId = requestAnimationFrame(pollGamepad);
    };

    pollGamepad();
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [hasStarted, activeIndex, unlockedLevels]);

  let stateRefPlayTimer: any = null;

  return (
    <div className="relative w-full min-h-screen bg-[#020108] text-white font-sans flex flex-col justify-between p-4 md:p-6 overflow-y-auto selection:bg-brand-orange selection:text-black pb-8">
      {/* Dynamic scrolling background with scanlines & retro horizon grid */}
      <RetroGridBackground />

      {/* Floating neon mist spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-cyan/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-brand-pink/5 blur-[120px] pointer-events-none" />

      {/* --- HOMEPAGE / PRESS TO START VIEW --- */}
      {!hasStarted ? (
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl mx-auto text-center px-4 flex-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col items-center justify-center"
          >
            {/* Publisher intro credit */}
            <div className="mb-2">
              <span className="text-brand-cyan text-[10px] md:text-xs tracking-[0.4em] uppercase font-mono block mb-1 font-bold animate-pulse">
                NAGAXGAMES PRESENTS
              </span>
              <h1 className="text-5xl md:text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-650 drop-shadow-[0_0_25px_rgba(255,255,255,0.06)] uppercase font-sans">
                Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-pink via-brand-orange to-brand-cyan">Darkness</span>
              </h1>
            </div>

            <div className="mb-10">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-zinc-800 bg-[#0a0515]/60 text-brand-orange text-xs font-mono uppercase tracking-[0.2em] rounded">
                <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
                <span>16-BIT CLASSIC</span>
              </span>
            </div>

            {/* Pulsing Game Arcade Button */}
            <motion.button
              onClick={handlePressToStart}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="group px-8 py-4 bg-gradient-to-r from-brand-pink via-brand-orange to-brand-cyan text-black font-extrabold text-sm md:text-base tracking-[0.3em] rounded-lg hover:shadow-[0_0_30px_rgba(255,100,0,0.4)] transition-all duration-300 cursor-pointer uppercase flex items-center gap-2"
            >
              <span>PRESS TO START</span>
              <Play className="w-4 h-4 fill-current text-current" />
            </motion.button>

            <p className="mt-10 text-zinc-500 text-[10px] md:text-xs max-w-sm mx-auto font-mono uppercase tracking-wider leading-relaxed">
              Move with A/D or Arrow keys. Jump with W, change phase with Q. Use spacebar to slide dash!
            </p>
          </motion.div>
        </div>
      ) : (
        // --- LEVEL SELECTION VIEW (COMPACT GRID WITH HOVER PREVIEWS & ZERO SCROLLING) ---
        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col justify-between flex-1 min-h-0 py-2">
          {/* Header row with navigation */}
          <div className="w-full flex items-center justify-between border-b border-zinc-900 pb-2 mb-3 shrink-0">
            <div>
              <button
                onClick={() => {
                  setHasStarted(false);
                  synthAudioEngine.playPhaseToggle(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-white transition-colors mb-1 uppercase font-bold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return To Splash</span>
              </button>
              
              <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
                MISSION SELECT
              </h2>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-950/80 border border-zinc-850 rounded-lg text-zinc-400 text-xs font-mono uppercase tracking-wider">
              <span className="text-[10px] text-zinc-500">SYSTEMS:</span>
              <span className="text-emerald-400 font-bold">READY</span>
            </div>
          </div>

          {/* Side-by-Side Content Area */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch flex-1 min-h-0">
            {/* LEFT SIDE: Active/Hovered Level Featured Info Card */}
            <div className="md:col-span-5 flex flex-col justify-between p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md min-h-0">
              {LEVELS.map((level, index) => {
                if (index !== activeIndex) return null;

                const isUnlocked = unlockedLevels.includes(level.id);
                const bestTime = bestSpeeds[level.id] || null;

                return (
                  <motion.div
                    key={level.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col justify-between h-full"
                  >
                    <div>
                      {/* Image Preview with character and elements */}
                      <LevelPreviewImage levelId={level.id} featured={true} />

                      {/* Info sub-row */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                          {level.subtitle}
                        </span>
                        
                        <span
                          className={`font-mono text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                            level.difficulty === 'Normal'
                              ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5'
                              : level.difficulty === 'Hard'
                              ? 'border-brand-cyan/20 text-brand-cyan bg-brand-cyan/5'
                              : 'border-brand-pink/25 text-brand-pink bg-brand-pink/5'
                          }`}
                        >
                          {level.difficulty}
                        </span>
                      </div>

                      {/* Level Name */}
                      <h3 className="text-xl md:text-2xl font-black tracking-tight text-white mb-1.5 flex items-center gap-2">
                        {level.id === 1 ? (
                          <Moon className="w-5 h-5 text-brand-cyan shrink-0" />
                        ) : level.id === 2 ? (
                          <Cpu className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : level.id === 3 ? (
                          <Cpu className="w-5 h-5 text-brand-orange shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
                        ) : level.id === 4 ? (
                          <Flame className="w-5 h-5 text-rose-500 shrink-0" />
                        ) : level.id === 5 ? (
                          <Zap className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />
                        ) : (
                          <Swords className="w-5 h-5 text-amber-500 shrink-0" />
                        )}
                        <span>{level.name}</span>
                      </h3>

                      {/* Simplified Game Description */}
                      <p className="text-zinc-400 text-xs font-mono leading-relaxed mb-3 line-clamp-3">
                        {level.description}
                      </p>
                    </div>

                    {/* Launch & Action block */}
                    <div className="pt-3 border-t border-zinc-900 bg-black/40 p-3 rounded-lg flex flex-col gap-2 shrink-0">
                      {bestTime ? (
                        <div className="text-emerald-400 font-mono text-xs text-center font-bold">
                          ★ BEST RECORD: {bestTime}
                        </div>
                      ) : (
                        <div className="text-zinc-600 text-[10px] font-mono text-center uppercase tracking-widest font-bold">
                          NOT CLEARED
                        </div>
                      )}

                      {isUnlocked ? (
                        <button
                          onClick={() => onStartLevel(level.id)}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-brand-cyan/40 bg-[#00e5ff]/5 hover:bg-[#00e5ff]/15 text-xs font-extrabold tracking-widest uppercase font-mono text-brand-cyan hover:text-white cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(0,229,255,0.3)] duration-200"
                        >
                          <span>START LEVEL</span>
                          <Play className="w-3.5 h-3.5 fill-current text-current animate-pulse" />
                        </button>
                      ) : (
                        <div className="w-full text-center py-2 bg-zinc-900/40 border border-zinc-800 text-zinc-600 rounded text-xs font-mono font-bold uppercase tracking-wider">
                          LOCKED (CLEAR LEVEL {level.id - 1})
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* RIGHT SIDE: 3x2 Grid of Level Selector Thumbnails with Hover Previews */}
            <div className="md:col-span-7 grid grid-cols-2 lg:grid-cols-3 gap-3 min-h-0 overflow-y-auto pr-1">
              {LEVELS.map((level, index) => {
                const isUnlocked = unlockedLevels.includes(level.id);
                const isActive = index === activeIndex;

                return (
                  <div
                    key={level.id}
                    onMouseEnter={() => {
                      setActiveIndex(index);
                      synthAudioEngine.playJump();
                    }}
                    onClick={() => {
                      setActiveIndex(index);
                      synthAudioEngine.playPhaseToggle(true);
                    }}
                    className={`relative group rounded-xl border p-2 transition-all duration-300 flex flex-col justify-between cursor-pointer select-none ${
                      isActive
                        ? 'border-brand-cyan bg-[#00e5ff]/5 shadow-[0_0_15px_rgba(0,229,255,0.15)]'
                        : isUnlocked
                        ? 'border-zinc-800 hover:border-zinc-600 bg-zinc-950/45 hover:bg-zinc-950/70'
                        : 'border-zinc-950/40 bg-zinc-950/25 opacity-40'
                    }`}
                  >
                    {/* Compact Image Preview Thumbnail */}
                    <div className="relative rounded overflow-hidden mb-1.5 pointer-events-none">
                      <LevelPreviewImage levelId={level.id} featured={false} />
                      
                      {/* Locked Screen Overlay */}
                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-mono text-zinc-500 font-extrabold uppercase tracking-widest">LOCKED</span>
                        </div>
                      )}
                    </div>

                    {/* Level Meta info */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-center gap-1">
                        <span className="text-[9px] font-mono text-zinc-500 font-bold">LEVEL {level.id}</span>
                        <span className={`text-[8px] font-mono font-bold uppercase px-1 rounded ${
                          level.difficulty === 'Normal' ? 'text-emerald-400 bg-emerald-500/5' : 'text-brand-pink bg-brand-pink/5'
                        }`}>
                          {level.difficulty}
                        </span>
                      </div>
                      <h4 className="text-xs font-black tracking-tight text-white truncate uppercase">
                        {level.name}
                      </h4>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Control configurations & Sound system sliders (Persistent compact footer) */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex gap-4 justify-between items-center text-zinc-400 border-t border-zinc-900 pt-3 mt-1.5 bg-zinc-950/20 p-3.5 rounded-lg backdrop-blur-sm shrink-0">
        {/* Sound Volume control */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleMuteToggle}
            className="p-1.5 border border-zinc-850 rounded-md bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition-colors"
            title={isMuted ? 'Unmute BGM' : 'Mute BGM'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <div className="flex flex-col">
            <label className="text-[9px] font-mono font-bold tracking-wider text-zinc-500 uppercase mb-0.5">
              VOLUME: {Math.round(volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 md:w-32 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
            />
          </div>
        </div>

        {/* Buttons: Show controls Guide */}
        <div className="flex items-center gap-2">
          <button
            id="open-box-art-btn"
            onClick={() => {
              setShowCover(true);
              synthAudioEngine.playPhaseToggle(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase border border-zinc-800 hover:border-brand-cyan bg-zinc-900/60 hover:bg-zinc-900 text-brand-cyan cursor-pointer transition-colors rounded"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-brand-cyan" />
            <span>VIEW BOX ART</span>
          </button>

          <button
            onClick={() => {
              setShowControls(!showControls);
              synthAudioEngine.playPhaseToggle(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase border border-zinc-800 hover:border-brand-orange bg-zinc-900/60 hover:bg-zinc-900 text-white cursor-pointer transition-colors rounded"
          >
            <HelpCircle className="w-3.5 h-3.5 text-brand-orange" />
            <span>{showControls ? 'CLOSE GUIDE' : 'CONTROLS'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Floating Keyboard controls modal overlay */}
      {showControls && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-2xl p-6 border border-zinc-850 bg-[#0a0712]/95 backdrop-blur-xl rounded-xl relative shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={() => {
                setShowControls(false);
                synthAudioEngine.playPhaseToggle(true);
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white font-mono text-xs border border-zinc-800 hover:border-zinc-600 bg-zinc-900/60 px-2 py-1 rounded cursor-pointer transition-all"
            >
              CLOSE
            </button>

            <h2 className="text-lg font-bold tracking-tight text-white mb-4 uppercase flex items-center gap-2">
              <Swords className="w-4.5 h-4.5 text-brand-orange animate-pulse" />
              Cyber-Combat Control Protocols
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-2 bg-zinc-900/40 border border-zinc-800 rounded">
                <span className="block text-[9px] text-zinc-500 font-mono tracking-wider uppercase mb-0.5">MOVEMENT</span>
                <kbd className="inline-block px-1 bg-zinc-900 text-white border border-zinc-700 rounded text-[10px] font-mono mr-1">A</kbd>
                <kbd className="inline-block px-1 bg-zinc-900 text-white border border-zinc-700 rounded text-[10px] font-mono">D</kbd>
                <span className="block text-[11px] mt-0.5 text-zinc-300">Run Left / Right</span>
              </div>

              <div className="p-2 bg-zinc-900/40 border border-zinc-800 rounded">
                <span className="block text-[9px] text-zinc-500 font-mono tracking-wider uppercase mb-0.5">JUMP / DOUBLE</span>
                <kbd className="inline-block px-1 bg-zinc-900 text-white border border-zinc-700 rounded text-[10px] font-mono mr-1">W</kbd>
                <kbd className="inline-block px-1 bg-zinc-900 text-white border border-zinc-700 rounded text-[10px] font-mono">↑</kbd>
                <span className="block text-[11px] mt-0.5 text-zinc-300">Jump / Double Flip</span>
              </div>

              <div className="p-2 bg-zinc-900/40 border border-zinc-800 rounded">
                <span className="block text-[9px] text-zinc-500 font-mono tracking-wider uppercase mb-0.5">SLIDE DASH</span>
                <kbd className="inline-block px-1 bg-zinc-900 text-white border border-zinc-700 rounded text-[10px] font-mono">SPACE</kbd>
                <span className="block text-[11px] mt-0.5 text-zinc-300">Slide past low hazards</span>
              </div>

              <div className="p-2 bg-zinc-900/40 border border-zinc-800 rounded">
                <span className="block text-[9px] text-zinc-500 font-mono tracking-wider uppercase mb-0.5">SHADOW STEP</span>
                <kbd className="inline-block px-1 bg-zinc-900 text-white border border-zinc-700 rounded text-[10px] font-mono">Z</kbd>
                <span className="block text-[11px] mt-0.5 text-zinc-300">Instant teleport dash</span>
              </div>

              <div className="p-2 bg-zinc-900/40 border border-zinc-800 rounded">
                <span className="block text-[9px] text-zinc-500 font-mono tracking-wider uppercase mb-0.5">PHASE TOGGLE</span>
                <kbd className="inline-block px-1 bg-zinc-900 text-brand-cyan border border-brand-cyan/40 rounded text-[10px] font-mono">Q</kbd>
                <span className="block text-[11px] mt-0.5 text-zinc-300">Toggle Phase state!</span>
              </div>

              <div className="p-2 bg-zinc-900/40 border border-zinc-800 rounded">
                <span className="block text-[9px] text-zinc-500 font-mono tracking-wider uppercase mb-0.5">LIGHT COMBOS</span>
                <kbd className="inline-block px-1 bg-zinc-900 text-white border border-zinc-700 rounded text-[10px] font-mono">C</kbd>
                <span className="block text-[11px] mt-0.5 text-zinc-300">Execute rapid slash hits</span>
              </div>

              <div className="p-2 bg-zinc-900/40 border border-zinc-800 rounded">
                <span className="block text-[9px] text-zinc-500 font-mono tracking-wider uppercase mb-0.5">HEAVY SLASH</span>
                <kbd className="inline-block px-1 bg-zinc-900 text-white border border-zinc-700 rounded text-[10px] font-mono">F</kbd>
                <span className="block text-[11px] mt-0.5 text-zinc-300">Circular power strike</span>
              </div>

              <div className="p-2 bg-zinc-900/40 border border-zinc-800 rounded">
                <span className="block text-[9px] text-zinc-500 font-mono tracking-wider uppercase mb-0.5">ENERGY BLAST</span>
                <kbd className="inline-block px-1 bg-zinc-900 text-white border border-zinc-700 rounded text-[10px] font-mono">Hold V</kbd>
                <span className="block text-[11px] mt-0.5 text-zinc-300">Charge up projectile</span>
              </div>
            </div>

            {/* Controller mapping */}
            <div className="mt-4 pt-4 border-t border-zinc-800/80">
              <h3 className="text-[10px] font-mono font-bold tracking-widest text-brand-cyan uppercase mb-2 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-brand-cyan" />
                <span>16-BIT GAMEPAD CONTROLLER MAPPING</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="p-1.5 bg-zinc-950/60 rounded border border-zinc-900 flex items-center gap-1.5 text-[11px]">
                  <span className="font-mono text-[9px] font-bold bg-zinc-900 px-1 py-0.5 rounded text-zinc-400 shrink-0">D-Pad / Stick</span>
                  <span className="text-zinc-400 font-mono truncate">Run Left / Right</span>
                </div>
                <div className="p-1.5 bg-zinc-950/60 rounded border border-zinc-900 flex items-center gap-1.5 text-[11px]">
                  <span className="font-mono text-[9px] font-bold bg-[#112] px-1 py-0.5 rounded text-brand-cyan shrink-0">Button A</span>
                  <span className="text-zinc-400 font-mono truncate">Jump & Climb</span>
                </div>
                <div className="p-1.5 bg-zinc-950/60 rounded border border-zinc-900 flex items-center gap-1.5 text-[11px]">
                  <span className="font-mono text-[9px] font-bold bg-[#211] px-1 py-0.5 rounded text-brand-pink shrink-0">Button B</span>
                  <span className="text-zinc-400 font-mono truncate">Slide Dash</span>
                </div>
              </div>
            </div>
            
            <div className="mt-3 flex gap-2 p-3 rounded bg-zinc-900/20 border border-zinc-800 text-zinc-400 text-[11px] leading-relaxed font-mono">
              <Shield className="w-4 h-4 shrink-0 text-brand-cyan mt-0.5" />
              <p>
                <span className="text-white font-bold">GAMEPLAY FOCUS:</span> Slide past glowing barriers by switching to the matching color frequency! Double jump into walls to perform wall climbs!
              </p>
            </div>
          </motion.div>
        </div>
      )}

      <GameCover isOpen={showCover} onClose={() => setShowCover(false)} />

      {/* Persistent On-screen Touch Control Pad */}
      <div className="relative z-20 mt-4">
        <ControlPad />
      </div>
    </div>
  );
}
