import { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Play, CornerDownLeft, RefreshCcw, HelpCircle, Gamepad2 } from 'lucide-react';
import { synthAudioEngine } from './AudioEngine';

interface ControlPadProps {
  visibleByDefault?: boolean;
}

export default function ControlPad({ visibleByDefault = false }: ControlPadProps) {
  const [isVisible, setIsVisible] = useState(visibleByDefault);
  const activeTouches = useRef<{ [key: string]: boolean }>({});

  // Auto-detect touch device on mount
  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (hasTouch) {
      setIsVisible(true);
    }
  }, []);

  const dispatchKeyEvent = (type: 'keydown' | 'keyup', code: string, key: string) => {
    const event = new KeyboardEvent(type, {
      code,
      key,
      keyCode: code === 'Space' ? 32 : code === 'Enter' ? 13 : code === 'Escape' ? 27 : 0,
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
  };

  const handlePressStart = (id: string, code: string, key: string) => {
    if (activeTouches.current[id]) return;
    activeTouches.current[id] = true;
    dispatchKeyEvent('keydown', code, key);
    
    // Play a subtle haptic-like click sound
    if (id === 'start' || id === 'select') {
      synthAudioEngine.playPhaseToggle(true);
    } else {
      synthAudioEngine.playJump();
    }
  };

  const handlePressEnd = (id: string, code: string, key: string) => {
    if (!activeTouches.current[id]) return;
    activeTouches.current[id] = false;
    dispatchKeyEvent('keyup', code, key);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-20 right-4 z-40">
        <button
          onClick={() => {
            setIsVisible(true);
            synthAudioEngine.playPhaseToggle(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-950 border border-brand-cyan/40 hover:border-brand-cyan text-brand-cyan hover:text-white rounded-lg shadow-lg text-xs font-mono font-bold uppercase transition-all duration-200"
        >
          <Gamepad2 className="w-4 h-4 animate-pulse" />
          <span>SHOW PAD</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-2 shrink-0 select-none pointer-events-auto z-40">
      {/* Outer Console Frame */}
      <div className="relative border-2 border-zinc-800/80 bg-zinc-950/95 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row gap-4 items-center justify-between overflow-hidden">
        
        {/* Futuristic Cyber Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#151525_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />
        
        {/* Toggle / Header bar */}
        <div className="absolute top-2 right-4 flex items-center gap-2">
          <span className="text-[8px] font-mono tracking-widest text-zinc-500 uppercase font-extrabold animate-pulse">
            VIRTUAL CONTROL MATRIX
          </span>
          <button
            onClick={() => {
              setIsVisible(false);
              synthAudioEngine.playPhaseToggle(true);
            }}
            className="text-[9px] font-mono text-zinc-400 hover:text-rose-500 border border-zinc-900 bg-black/60 px-2 py-0.5 rounded transition-all"
          >
            HIDE
          </button>
        </div>

        {/* ================= SHOULDER BUTTONS L1 / L2 and R1 / R2 ================= */}
        <div className="w-full flex justify-between px-2 md:px-6 pointer-events-auto shrink-0 mb-1 border-b border-zinc-900 pb-2 z-20">
          <div className="flex gap-2">
            {/* L2 Button - GUARD */}
            <button
              id="pad-btn-l2"
              onTouchStart={(e) => { e.preventDefault(); handlePressStart('guard', 'KeyX', 'x'); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('guard', 'KeyX', 'x'); }}
              onMouseDown={() => handlePressStart('guard', 'KeyX', 'x')}
              onMouseUp={() => handlePressEnd('guard', 'KeyX', 'x')}
              onMouseLeave={() => handlePressEnd('guard', 'KeyX', 'x')}
              className="px-3 py-1.5 bg-gradient-to-b from-zinc-800 to-zinc-950 hover:from-zinc-750 border border-zinc-750 text-[10px] font-mono text-zinc-300 font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-1 cursor-pointer"
            >
              <span className="text-brand-pink">L2</span>
              <span>GUARD</span>
            </button>

            {/* L1 Button - DODGE */}
            <button
              id="pad-btn-l1"
              onTouchStart={(e) => { e.preventDefault(); handlePressStart('dash', 'Space', ' '); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('dash', 'Space', ' '); }}
              onMouseDown={() => handlePressStart('dash', 'Space', ' ')}
              onMouseUp={() => handlePressEnd('dash', 'Space', ' ')}
              onMouseLeave={() => handlePressEnd('dash', 'Space', ' ')}
              className="px-3 py-1.5 bg-gradient-to-b from-zinc-800 to-zinc-950 hover:from-zinc-750 border border-zinc-750 text-[10px] font-mono text-zinc-300 font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-1 cursor-pointer"
            >
              <span className="text-emerald-400">L1</span>
              <span>DODGE</span>
            </button>
          </div>

          <div className="flex gap-2">
            {/* R1 Button - STEP */}
            <button
              id="pad-btn-r1"
              onTouchStart={(e) => { e.preventDefault(); handlePressStart('shadowStep', 'KeyZ', 'z'); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('shadowStep', 'KeyZ', 'z'); }}
              onMouseDown={() => handlePressStart('shadowStep', 'KeyZ', 'z')}
              onMouseUp={() => handlePressEnd('shadowStep', 'KeyZ', 'z')}
              onMouseLeave={() => handlePressEnd('shadowStep', 'KeyZ', 'z')}
              className="px-3 py-1.5 bg-gradient-to-b from-zinc-800 to-zinc-950 hover:from-zinc-750 border border-zinc-750 text-[10px] font-mono text-zinc-300 font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-1 cursor-pointer"
            >
              <span>STEP</span>
              <span className="text-brand-orange">R1</span>
            </button>

            {/* R2 Button - BLAST */}
            <button
              id="pad-btn-r2"
              onTouchStart={(e) => { e.preventDefault(); handlePressStart('blast', 'KeyV', 'v'); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('blast', 'KeyV', 'v'); }}
              onMouseDown={() => handlePressStart('blast', 'KeyV', 'v')}
              onMouseUp={() => handlePressEnd('blast', 'KeyV', 'v')}
              onMouseLeave={() => handlePressEnd('blast', 'KeyV', 'v')}
              className="px-3 py-1.5 bg-gradient-to-b from-zinc-800 to-zinc-950 hover:from-zinc-750 border border-zinc-750 text-[10px] font-mono text-zinc-300 font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-1 cursor-pointer"
            >
              <span>BLAST</span>
              <span className="text-brand-cyan">R2</span>
            </button>
          </div>
        </div>

        {/* ================= LEFT SIDE: SLEEK D-PAD ================= */}
        <div className="flex flex-col items-center shrink-0">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-extrabold mb-2">DIRECTIONAL</span>
          <div className="relative w-36 h-36 flex items-center justify-center bg-zinc-900/40 border border-zinc-800 rounded-full shadow-inner">
            {/* Center Core */}
            <div className="absolute w-12 h-12 bg-zinc-950 rounded-full border border-zinc-800/60 z-10" />

            {/* UP BUTTON */}
            <button
              id="pad-up"
              onTouchStart={(e) => { e.preventDefault(); handlePressStart('up', 'ArrowUp', 'ArrowUp'); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('up', 'ArrowUp', 'ArrowUp'); }}
              onMouseDown={() => handlePressStart('up', 'ArrowUp', 'ArrowUp')}
              onMouseUp={() => handlePressEnd('up', 'ArrowUp', 'ArrowUp')}
              onMouseLeave={() => handlePressEnd('up', 'ArrowUp', 'ArrowUp')}
              className="absolute top-1 w-12 h-14 bg-gradient-to-b from-zinc-900 to-zinc-950 hover:from-zinc-850 border-t border-x border-zinc-800 hover:border-brand-cyan/60 rounded-t-lg flex items-center justify-center shadow-lg active:brightness-125 transition-all text-zinc-400 active:text-brand-cyan"
            >
              <ChevronUp className="w-6 h-6" />
            </button>

            {/* DOWN BUTTON */}
            <button
              id="pad-down"
              onTouchStart={(e) => { e.preventDefault(); handlePressStart('down', 'ArrowDown', 'ArrowDown'); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('down', 'ArrowDown', 'ArrowDown'); }}
              onMouseDown={() => handlePressStart('down', 'ArrowDown', 'ArrowDown')}
              onMouseUp={() => handlePressEnd('down', 'ArrowDown', 'ArrowDown')}
              onMouseLeave={() => handlePressEnd('down', 'ArrowDown', 'ArrowDown')}
              className="absolute bottom-1 w-12 h-14 bg-gradient-to-t from-zinc-900 to-zinc-950 hover:from-zinc-850 border-b border-x border-zinc-800 hover:border-brand-cyan/60 rounded-b-lg flex items-center justify-center shadow-lg active:brightness-125 transition-all text-zinc-400 active:text-brand-cyan"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            {/* LEFT BUTTON */}
            <button
              id="pad-left"
              onTouchStart={(e) => { e.preventDefault(); handlePressStart('left', 'ArrowLeft', 'ArrowLeft'); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('left', 'ArrowLeft', 'ArrowLeft'); }}
              onMouseDown={() => handlePressStart('left', 'ArrowLeft', 'ArrowLeft')}
              onMouseUp={() => handlePressEnd('left', 'ArrowLeft', 'ArrowLeft')}
              onMouseLeave={() => handlePressEnd('left', 'ArrowLeft', 'ArrowLeft')}
              className="absolute left-1 w-14 h-12 bg-gradient-to-r from-zinc-900 to-zinc-950 hover:from-zinc-850 border-l border-y border-zinc-800 hover:border-brand-cyan/60 rounded-l-lg flex items-center justify-center shadow-lg active:brightness-125 transition-all text-zinc-400 active:text-brand-cyan"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* RIGHT BUTTON */}
            <button
              id="pad-right"
              onTouchStart={(e) => { e.preventDefault(); handlePressStart('right', 'ArrowRight', 'ArrowRight'); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('right', 'ArrowRight', 'ArrowRight'); }}
              onMouseDown={() => handlePressStart('right', 'ArrowRight', 'ArrowRight')}
              onMouseUp={() => handlePressEnd('right', 'ArrowRight', 'ArrowRight')}
              onMouseLeave={() => handlePressEnd('right', 'ArrowRight', 'ArrowRight')}
              className="absolute right-1 w-14 h-12 bg-gradient-to-l from-zinc-900 to-zinc-950 hover:from-zinc-850 border-r border-y border-zinc-800 hover:border-brand-cyan/60 rounded-r-lg flex items-center justify-center shadow-lg active:brightness-125 transition-all text-zinc-400 active:text-brand-cyan"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ================= MIDDLE SECTION: SYSTEM SELECT / START ================= */}
        <div className="flex flex-col items-center gap-3 py-2 shrink-0">
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest font-extrabold">SYSTEM UTILITIES</span>
          <div className="flex items-center gap-6 bg-zinc-900/20 border border-zinc-900 px-4 py-2.5 rounded-xl">
            {/* SELECT / BACK Button */}
            <div className="flex flex-col items-center gap-1">
              <button
                id="pad-select"
                onTouchStart={(e) => { e.preventDefault(); handlePressStart('select', 'Escape', 'Escape'); }}
                onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('select', 'Escape', 'Escape'); }}
                onMouseDown={() => handlePressStart('select', 'Escape', 'Escape')}
                onMouseUp={() => handlePressEnd('select', 'Escape', 'Escape')}
                onMouseLeave={() => handlePressEnd('select', 'Escape', 'Escape')}
                className="w-14 h-5 bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-750 hover:border-brand-pink/50 rounded transform rotate-[15deg] shadow-md active:brightness-125 active:shadow-[0_0_8px_rgba(255,59,95,0.4)] flex items-center justify-center transition-all cursor-pointer"
              >
                <div className="w-10 h-1.5 bg-brand-pink/20 border border-brand-pink/40 rounded-full" />
              </button>
              <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold tracking-wider">SELECT / BACK</span>
            </div>

            {/* START / ACTION Button */}
            <div className="flex flex-col items-center gap-1">
              <button
                id="pad-start"
                onTouchStart={(e) => { e.preventDefault(); handlePressStart('start', 'Enter', 'Enter'); }}
                onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('start', 'Enter', 'Enter'); }}
                onMouseDown={() => handlePressStart('start', 'Enter', 'Enter')}
                onMouseUp={() => handlePressEnd('start', 'Enter', 'Enter')}
                onMouseLeave={() => handlePressEnd('start', 'Enter', 'Enter')}
                className="w-14 h-5 bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-750 hover:border-brand-cyan/50 rounded transform rotate-[15deg] shadow-md active:brightness-125 active:shadow-[0_0_8px_rgba(0,229,255,0.4)] flex items-center justify-center transition-all cursor-pointer"
              >
                <div className="w-10 h-1.5 bg-brand-cyan/20 border border-brand-cyan/40 rounded-full" />
              </button>
              <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold tracking-wider">START / ENTER</span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT SIDE: ACTION CONTROLS MATRIX ================= */}
        <div className="flex flex-col items-center shrink-0">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-extrabold mb-2">ACTION MATRIX</span>
          <div className="grid grid-cols-3 gap-2.5 bg-zinc-900/10 p-2.5 border border-zinc-900/50 rounded-2xl">
            {/* SHADOW STEP Button (Z) */}
            <div className="flex flex-col items-center gap-1">
              <button
                id="pad-btn-z"
                onTouchStart={(e) => { e.preventDefault(); handlePressStart('shadowStep', 'KeyZ', 'z'); }}
                onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('shadowStep', 'KeyZ', 'z'); }}
                onMouseDown={() => handlePressStart('shadowStep', 'KeyZ', 'z')}
                onMouseUp={() => handlePressEnd('shadowStep', 'KeyZ', 'z')}
                onMouseLeave={() => handlePressEnd('shadowStep', 'KeyZ', 'z')}
                className="w-14 h-14 bg-gradient-to-br from-zinc-800 to-zinc-950 hover:from-zinc-750 border-2 border-brand-orange/40 active:border-brand-orange hover:shadow-[0_0_10px_rgba(255,69,0,0.2)] rounded-xl flex items-center justify-center font-extrabold text-sm text-brand-orange transition-all cursor-pointer active:scale-95"
              >
                STEP
              </button>
              <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold">[Z]</span>
            </div>

            {/* DASH / DODGE Button (Space) */}
            <div className="flex flex-col items-center gap-1">
              <button
                id="pad-btn-space"
                onTouchStart={(e) => { e.preventDefault(); handlePressStart('dash', 'Space', ' '); }}
                onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('dash', 'Space', ' '); }}
                onMouseDown={() => handlePressStart('dash', 'Space', ' ')}
                onMouseUp={() => handlePressEnd('dash', 'Space', ' ')}
                onMouseLeave={() => handlePressEnd('dash', 'Space', ' ')}
                className="w-14 h-14 bg-gradient-to-br from-zinc-800 to-zinc-950 hover:from-zinc-750 border-2 border-emerald-500/40 active:border-emerald-400 hover:shadow-[0_0_10px_rgba(52,211,153,0.2)] rounded-xl flex items-center justify-center font-extrabold text-xs text-emerald-400 transition-all cursor-pointer active:scale-95"
              >
                DASH
              </button>
              <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold">[SPACE]</span>
            </div>

            {/* JUMP Button (W / UP) */}
            <div className="flex flex-col items-center gap-1">
              <button
                id="pad-btn-w"
                onTouchStart={(e) => { e.preventDefault(); handlePressStart('up', 'KeyW', 'w'); }}
                onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('up', 'KeyW', 'w'); }}
                onMouseDown={() => handlePressStart('up', 'KeyW', 'w')}
                onMouseUp={() => handlePressEnd('up', 'KeyW', 'w')}
                onMouseLeave={() => handlePressEnd('up', 'KeyW', 'w')}
                className="w-14 h-14 bg-gradient-to-br from-zinc-800 to-zinc-950 hover:from-zinc-750 border-2 border-brand-cyan/50 active:border-brand-cyan hover:shadow-[0_0_10px_rgba(0,229,255,0.2)] rounded-full flex items-center justify-center font-extrabold text-base text-brand-cyan transition-all cursor-pointer active:scale-95"
              >
                JUMP
              </button>
              <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold">[W]</span>
            </div>

            {/* SLASH Button (C) */}
            <div className="flex flex-col items-center gap-1">
              <button
                id="pad-btn-c"
                onTouchStart={(e) => { e.preventDefault(); handlePressStart('combo', 'KeyC', 'c'); }}
                onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('combo', 'KeyC', 'c'); }}
                onMouseDown={() => handlePressStart('combo', 'KeyC', 'c')}
                onMouseUp={() => handlePressEnd('combo', 'KeyC', 'c')}
                onMouseLeave={() => handlePressEnd('combo', 'KeyC', 'c')}
                className="w-14 h-14 bg-gradient-to-br from-zinc-800 to-zinc-950 hover:from-zinc-750 border-2 border-amber-500/40 active:border-amber-400 hover:shadow-[0_0_10px_rgba(245,158,11,0.2)] rounded-xl flex items-center justify-center font-extrabold text-xs text-amber-400 transition-all cursor-pointer active:scale-95"
              >
                SLASH
              </button>
              <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold">[C]</span>
            </div>

            {/* PHASE TOGGLE Button (Q) */}
            <div className="flex flex-col items-center gap-1">
              <button
                id="pad-btn-q"
                onTouchStart={(e) => { e.preventDefault(); handlePressStart('toggle', 'KeyQ', 'q'); }}
                onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('toggle', 'KeyQ', 'q'); }}
                onMouseDown={() => handlePressStart('toggle', 'KeyQ', 'q')}
                onMouseUp={() => handlePressEnd('toggle', 'KeyQ', 'q')}
                onMouseLeave={() => handlePressEnd('toggle', 'KeyQ', 'q')}
                className="w-14 h-14 bg-gradient-to-br from-zinc-800 to-zinc-950 hover:from-zinc-750 border-2 border-brand-pink/50 active:border-brand-pink hover:shadow-[0_0_10px_rgba(255,59,95,0.2)] rounded-xl flex items-center justify-center font-extrabold text-sm text-brand-pink transition-all cursor-pointer active:scale-95 animate-pulse"
              >
                PHASE
              </button>
              <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold">[Q]</span>
            </div>

            {/* HEAVY SLASH Button (F) */}
            <div className="flex flex-col items-center gap-1">
              <button
                id="pad-btn-f"
                onTouchStart={(e) => { e.preventDefault(); handlePressStart('strike', 'KeyF', 'f'); }}
                onTouchEnd={(e) => { e.preventDefault(); handlePressEnd('strike', 'KeyF', 'f'); }}
                onMouseDown={() => handlePressStart('strike', 'KeyF', 'f')}
                onMouseUp={() => handlePressEnd('strike', 'KeyF', 'f')}
                onMouseLeave={() => handlePressEnd('strike', 'KeyF', 'f')}
                className="w-14 h-14 bg-gradient-to-br from-zinc-800 to-zinc-950 hover:from-zinc-750 border-2 border-purple-500/40 active:border-purple-400 hover:shadow-[0_0_10px_rgba(168,85,247,0.2)] rounded-xl flex items-center justify-center font-extrabold text-[10px] text-purple-400 transition-all cursor-pointer active:scale-95"
              >
                HEAVY
              </button>
              <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold">[F]</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
