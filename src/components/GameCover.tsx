import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCw, Gamepad2, Info, ArrowLeft, Star, Check, X, Award } from 'lucide-react';

interface GameCoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GameCover({ isOpen, onClose }: GameCoverProps) {
  const [edition, setEdition] = useState<'sega' | 'nintendo'>('sega');
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="retro-cover-overlay"
        className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center overflow-y-auto p-4 md:p-8 backdrop-blur-md"
      >
        {/* Floating controls panel */}
        <div 
          id="retro-cover-controls"
          className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 z-10"
        >
          <div className="flex flex-col">
            <button
              id="back-to-grid-btn"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors mb-1 uppercase font-bold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Title Portal</span>
            </button>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-brand-orange" />
              <span>16-Bit Retro Box Art</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Console switcher */}
            <div className="bg-zinc-900 p-1 border border-zinc-800 rounded-lg flex items-center gap-1">
              <button
                id="select-sega-btn"
                onClick={() => setEdition('sega')}
                className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  edition === 'sega'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Sega Genesis
              </button>
              <button
                id="select-nintendo-btn"
                onClick={() => setEdition('nintendo')}
                className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  edition === 'nintendo'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                SNES 16-Bit
              </button>
            </div>

            {/* Flip Button */}
            <button
              id="flip-box-btn"
              onClick={handleFlip}
              className="flex items-center gap-1.5 px-4 py-2 border border-brand-cyan/40 bg-brand-cyan/10 hover:bg-brand-cyan hover:text-black text-brand-cyan text-xs font-mono font-bold uppercase rounded-lg cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]"
            >
              <RotateCw className="w-4 h-4" />
              <span>FLIP BOX</span>
            </button>

            {/* Close Button */}
            <button
              id="close-cover-btn"
              onClick={onClose}
              className="p-2 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg cursor-pointer transition-all"
              title="Close Cover View"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Outer 3D perspective wrapper */}
        <div 
          id="retro-cover-viewport"
          className="relative w-full max-w-[420px] aspect-[3/4.4] cursor-pointer"
          style={{ perspective: 1200 }}
          onClick={handleFlip}
        >
          {/* Flip Animator Container */}
          <motion.div
            id="retro-box-card"
            className="w-full h-full relative"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            {/* FRONT OF THE BOX ART */}
            <div
              id="box-art-front"
              className="absolute inset-0 w-full h-full rounded-2xl border-2 border-zinc-800 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_40px_rgba(0,229,255,0.05)] bg-[#04020a] flex flex-col justify-between"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
              {/* SEGA GENESIS BORDERS */}
              {edition === 'sega' ? (
                <div className="absolute inset-0 pointer-events-none border-[12px] border-black flex flex-col justify-between">
                  {/* Left Genesis grid ribbon bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-8 bg-black flex flex-col items-center justify-between py-12 border-r border-zinc-900">
                    <span className="text-zinc-600 font-sans font-black text-[9px] tracking-[0.5em] rotate-270 whitespace-nowrap origin-center uppercase">
                      SEGA GENESIS
                    </span>
                    <span className="text-zinc-800 font-sans font-black text-xs">16-BIT</span>
                  </div>
                  {/* Bottom Genesis Grid logo bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-black flex items-center justify-between px-4 border-t border-zinc-900">
                    <span className="text-white font-mono font-black text-xs tracking-wider">GENESIS</span>
                    <span className="text-zinc-500 font-mono text-[9px] uppercase">Official Game cartridge</span>
                  </div>
                </div>
              ) : (
                /* SNES SPECIAL BORDERS */
                <div className="absolute inset-0 pointer-events-none border-[10px] border-[#c4c7cc] flex flex-col justify-between">
                  {/* SNES Purple bottom block bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-r from-indigo-900 to-[#1e1a3a] flex items-center justify-between px-6 border-t-2 border-indigo-500">
                    <span className="text-white font-sans font-black text-xs tracking-widest uppercase">SUPER NINTENDO</span>
                    <span className="text-indigo-400 font-mono text-[8px] tracking-wider uppercase">ENTERTAINMENT SYSTEM</span>
                  </div>
                </div>
              )}

              {/* MAIN HERO INNER WRAPPER */}
              <div className={`flex-1 flex flex-col justify-between p-6 relative z-10 ${edition === 'sega' ? 'ml-8 mb-10' : 'mb-12 border-2 border-indigo-950/20'}`}>
                {/* Header Logo or Seal */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono tracking-widest text-brand-orange uppercase bg-black/70 px-2 py-0.5 rounded border border-brand-orange/20">
                      NAGAXGAMES
                    </span>
                    <span className="text-[8px] font-mono text-zinc-500 mt-1 uppercase">MODEL 08-SYS</span>
                  </div>

                  {edition === 'sega' ? (
                    <div className="w-10 h-10 rounded-full border border-amber-500/50 bg-[#0f0b02] flex items-center justify-center shadow-inner">
                      <Star className="w-5 h-5 text-amber-500 fill-current animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#dcae44] bg-[#fbf5e2] flex items-center justify-center p-1 shadow-inner rotate-12">
                      <span className="text-[#a57f20] font-serif font-bold text-[8px] text-center leading-tight">
                        OFFICIAL NINTENDO SEAL
                      </span>
                    </div>
                  )}
                </div>

                {/* Cover Hero Image Generated Background (Behind logo) */}
                <div className="absolute inset-0 -z-10 bg-black">
                  <img
                    src="/src/assets/images/retro_box_cover_1782768828787.jpg"
                    alt="Into the Darkness cover hero"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-80"
                  />
                  {/* Dark gradient mask */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#04020a] via-transparent to-black/60" />
                </div>

                {/* Hype badges / flash details */}
                <div className="flex flex-col gap-1 items-start mt-2">
                  <span className="bg-brand-pink text-white font-mono font-black text-[9px] tracking-wider uppercase px-2 py-1 rounded shadow-lg transform -rotate-2">
                    ✓ TWO DIMENSIONAL FREQUENCY SHIFTING!
                  </span>
                  <span className="bg-[#00e5ff] text-black font-sans font-extrabold text-[8px] tracking-widest uppercase px-2 py-0.5 rounded shadow-lg transform rotate-1">
                    ✓ THE HIGH-VELOCITY 16-BIT EXPERIMENT!
                  </span>
                </div>

                {/* Game Title Logo Area */}
                <div className="my-4 text-center">
                  <span className="text-[10px] font-mono tracking-[0.5em] text-[#00e5ff] font-bold block mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                    COGNITIVE SHIFT PROTOCOL
                  </span>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase font-sans drop-shadow-[0_4px_8px_rgba(0,0,0,1)]">
                    INTO THE <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-pink via-brand-orange to-brand-cyan">DARKNESS</span>
                  </h1>
                </div>

                {/* Box Footer specifications / Age ratings */}
                <div className="flex justify-between items-end border-t border-zinc-800/40 pt-4 bg-black/60 p-2 rounded backdrop-blur-sm">
                  <div className="flex flex-col text-left">
                    <span className="text-zinc-500 text-[8px] font-mono">GENRE: CYBER METROIDVANIA</span>
                    <span className="text-zinc-400 text-[9px] font-mono font-bold">1 PLAYER ARCADE</span>
                  </div>

                  <div className="w-10 h-10 border border-zinc-700 rounded bg-zinc-900 flex items-center justify-center font-mono font-black text-xs text-brand-pink shadow-md">
                    KA
                    <span className="absolute text-[6px] text-zinc-500 mt-6 font-normal">KIDS TO ADULTS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BACK OF THE BOX ART */}
            <div
              id="box-art-back"
              className="absolute inset-0 w-full h-full rounded-2xl border-2 border-zinc-850 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)] bg-[#04020a] flex flex-col justify-between"
              style={{ 
                backfaceVisibility: 'hidden', 
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)' 
              }}
            >
              {/* Back cover grid outer borders */}
              {edition === 'sega' ? (
                <div className="absolute inset-0 pointer-events-none border-[12px] border-black flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-5 bg-black border-b border-zinc-900" />
                  <div className="absolute bottom-0 left-0 right-0 h-5 bg-black border-t border-zinc-900" />
                </div>
              ) : (
                <div className="absolute inset-0 pointer-events-none border-[10px] border-[#c4c7cc]" />
              )}

              {/* Inner Back Box content container */}
              <div className={`flex-1 flex flex-col justify-between p-5 relative z-10 ${edition === 'sega' ? 'mx-3 my-4' : 'm-2 border-2 border-indigo-950/20'}`}>
                {/* Title and Pitch Hype Header */}
                <div className="text-left bg-black/40 p-2.5 rounded border border-zinc-900/60 mb-2">
                  <h3 className="text-sm font-black text-brand-orange uppercase tracking-wider mb-1">
                    SHIFT FREQUENCY. DEFINE REALITY.
                  </h3>
                  <p className="text-zinc-400 text-[9px] font-mono leading-relaxed">
                    Behold the ultimate dual-polarity arcade sprint! Take the role of the cybernetic runner and infiltrate the <span className="text-white font-bold">SONIC SPIRE Mega-Tower</span>. Shift frequencies dynamically between <span className="text-[#00e5ff] font-bold">TRUTH (Blue)</span> and <span className="text-brand-pink font-bold">FALSE (Magenta)</span> to bypass forcefields and eliminate the Commander sentinel waiting at Ground Zero. Keep moving, stay grounded, and hack the system!
                  </p>
                </div>

                {/* CLASSIC SCREENSHOTS ROW */}
                <div className="flex flex-col gap-2.5 my-2">
                  <span className="text-[9px] font-mono text-zinc-500 font-extrabold uppercase tracking-widest text-left block">
                    ⚡ CLASSIC 16-BIT GAMEPLAY SCREENSHOTS
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Screen 1: Cyber Labs */}
                    <div className="flex flex-col items-center">
                      <div className="w-full aspect-video rounded border-2 border-zinc-700 bg-zinc-950 p-1 relative overflow-hidden group shadow-md">
                        {/* CRT reflection scanning lines */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] z-20 pointer-events-none" />
                        {/* Simulated screen vector */}
                        <div className="w-full h-full bg-gradient-to-b from-[#030e1a] to-[#010208] relative flex items-center justify-center">
                          {/* Platforms */}
                          <div className="absolute bottom-3 left-2 w-16 h-1 bg-cyan-400 shadow-[0_0_6px_rgba(0,229,255,0.8)]" />
                          <div className="absolute bottom-6 right-2 w-12 h-1 bg-[#ff00a0]" />
                          {/* collectible */}
                          <div className="absolute bottom-8 left-1/2 w-2.5 h-2.5 bg-brand-pink rotate-45 transform" />
                          {/* player */}
                          <div className="absolute bottom-4 left-6 w-2 h-3.5 bg-white rounded-sm shadow-md" />
                        </div>
                      </div>
                      <span className="text-[8px] font-mono text-zinc-500 uppercase mt-1">Sector 1: The Cyber Labs</span>
                    </div>

                    {/* Screen 2: Sonic Spire */}
                    <div className="flex flex-col items-center">
                      <div className="w-full aspect-video rounded border-2 border-zinc-700 bg-zinc-950 p-1 relative overflow-hidden group shadow-md">
                        {/* CRT reflection scanning lines */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] z-20 pointer-events-none" />
                        {/* Simulated screen vector */}
                        <div className="w-full h-full bg-gradient-to-b from-[#180a04] to-[#040108] relative flex items-center justify-center">
                          {/* Platforms */}
                          <div className="absolute bottom-2 left-0 right-0 h-1.5 bg-[#ff7b00]" />
                          {/* Danger high voltage beam */}
                          <div className="absolute top-0 bottom-0 left-12 w-1 bg-brand-pink shadow-[0_0_8px_rgba(255,59,95,1)]" />
                          {/* collect cores */}
                          <div className="absolute top-6 right-6 w-2 h-2 rounded bg-cyan-400 rotate-12" />
                          {/* player jumping */}
                          <div className="absolute bottom-6 left-1/3 w-2.5 h-3 bg-white rounded-sm rotate-12" />
                        </div>
                      </div>
                      <span className="text-[8px] font-mono text-zinc-500 uppercase mt-1">Sector 2: Lava Chimney</span>
                    </div>
                  </div>
                </div>

                {/* SPECIFICATIONS bullet point lists */}
                <div className="text-left bg-zinc-950/80 p-3 rounded border border-zinc-900 text-zinc-400 text-[8.5px] font-mono flex flex-col gap-1.5 leading-tight">
                  <div className="flex items-center gap-1.5 text-white font-bold uppercase text-[9px]">
                    <Award className="w-3.5 h-3.5 text-brand-orange" />
                    <span>TACTICAL PROTOCOLS PROTO-COGNITION:</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <Check className="w-3 h-3 text-[#00e5ff] shrink-0 mt-0.5" />
                    <span><strong className="text-white">DUAL-POLARITY PROTOCOLS:</strong> Match lasers safely and flip platforms on command!</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <Check className="w-3 h-3 text-[#00e5ff] shrink-0 mt-0.5" />
                    <span><strong className="text-white">SYNTHESIZER BGM AUDIO:</strong> Groovy retro synth engine generates rhythmic loops!</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <Check className="w-3 h-3 text-[#00e5ff] shrink-0 mt-0.5" />
                    <span><strong className="text-white">ABSURD 8-LEVEL PLATFORMER:</strong> Explore chemical tunnels, Refineries, and the Spire!</span>
                  </div>
                </div>

                {/* Back Specifications table, Barcode, legal details */}
                <div className="flex justify-between items-end border-t border-zinc-900/80 pt-3 mt-1.5">
                  <div className="flex flex-col text-left gap-0.5 text-[7.5px] font-mono text-zinc-600">
                    <span>© 1991 NAGAXGAMES CO., LTD. ALL RIGHTS RESERVED.</span>
                    <span>LICENSED BY SEGA ENTERPRISES CO. MADE IN JAPAN.</span>
                    <span>INTO THE DARKNESS AND COGNITIVE SHIFT ARE TRADEMARKS.</span>
                  </div>

                  {/* Simulated Barcode */}
                  <div className="h-9 w-20 bg-white p-1 rounded-sm flex items-center justify-center gap-0.5 shadow-md">
                    <div className="h-full w-[2px] bg-black" />
                    <div className="h-full w-[1px] bg-black" />
                    <div className="h-full w-[1px] bg-black" />
                    <div className="h-full w-[3px] bg-black" />
                    <div className="h-full w-[1px] bg-black" />
                    <div className="h-full w-[2px] bg-black" />
                    <div className="h-full w-[1px] bg-black" />
                    <div className="h-full w-[4px] bg-black" />
                    <div className="h-full w-[1px] bg-black" />
                    <div className="h-full w-[2px] bg-black" />
                    <div className="h-full w-[1px] bg-black" />
                    <span className="absolute text-[5px] text-black mt-6 font-mono font-bold tracking-tighter">0424 5991</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <p 
          id="retro-instructions"
          className="mt-4 text-zinc-500 text-[10px] font-mono uppercase tracking-widest animate-pulse"
        >
          💡 CLICK THE GAME BOX TO FLIP FRONT / BACK COVER!
        </p>
      </div>
    </AnimatePresence>
  );
}
