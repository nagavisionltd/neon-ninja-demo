import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import TitleScreen from './components/TitleScreen';
import IntoTheDarknessCanvas from './components/IntoTheDarknessCanvas';
import CutsceneScreen from './components/CutsceneScreen';
import ControlPad from './components/ControlPad';
import { synthAudioEngine } from './components/AudioEngine';
import { LEVELS } from './data/levels';
import { Trophy, Clock, Swords, RefreshCw, Home, ShieldCheck, Zap, User, Star, RotateCcw, Play } from 'lucide-react';

export default function App() {
  const [screen, setScreen] = useState<'title' | 'cutscene' | 'game' | 'gameover' | 'victory' | 'stageclear'>('title');
  const [activeLevelId, setActiveLevelId] = useState<number>(1);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>(LEVELS.map(l => l.id));
  const [bestSpeeds, setBestSpeeds] = useState<{ [levelId: number]: string }>({});
  
  // Cutscene specific configurations
  const [cutsceneLevelId, setCutsceneLevelId] = useState<number>(1);
  const [isCutsceneEnding, setIsCutsceneEnding] = useState<boolean>(false);

  // Stats summary for overlays
  const [lastStats, setLastStats] = useState<{ timeTaken: string; shardsCollected: number; finalHp: number } | null>(null);

  // Menu selection index for controller navigation
  const [menuSelection, setMenuSelection] = useState<number>(0);

  // Load persistent save state from local storage
  useEffect(() => {
    try {
      const storedLevels = localStorage.getItem('into_the_darkness_unlocked_levels');
      if (storedLevels) {
        const parsed = JSON.parse(storedLevels);
        const merged = Array.from(new Set([...parsed, ...LEVELS.map(l => l.id)]));
        setUnlockedLevels(merged);
      } else {
        setUnlockedLevels(LEVELS.map(l => l.id));
      }

      const storedTimes = localStorage.getItem('into_the_darkness_best_times');
      if (storedTimes) {
        setBestSpeeds(JSON.parse(storedTimes));
      }
    } catch (e) {
      console.warn("Storage item retrieval failed or was empty:", e);
    }
  }, []);

  const handleStartLevel = (levelId: number) => {
    setActiveLevelId(levelId);
    
    // Check if there is an animated intro cutscene for this level start
    const hasIntroCutscene = [1, 2, 3, 6].includes(levelId);
    if (hasIntroCutscene) {
      setCutsceneLevelId(levelId);
      setIsCutsceneEnding(false);
      setScreen('cutscene');
    } else {
      setScreen('game');
    }
    synthAudioEngine.playPhaseToggle(true);
  };

  const handleLevelComplete = (stats: { timeTaken: string; shardsCollected: number; finalHp: number }) => {
    setLastStats(stats);
    
    // Save best speed runs
    const updatedSpeeds = { ...bestSpeeds };
    const prevBest = bestSpeeds[activeLevelId];
    
    // If no previous best or faster, overwrite!
    if (!prevBest || compareTimes(stats.timeTaken, prevBest)) {
      updatedSpeeds[activeLevelId] = stats.timeTaken;
      setBestSpeeds(updatedSpeeds);
      localStorage.setItem('into_the_darkness_best_times', JSON.stringify(updatedSpeeds));
    }

    // Unlock next level logic
    let updatedLevels = [...unlockedLevels];
    const nextLevelId = activeLevelId + 1;
    const nextLevelExists = LEVELS.some(l => l.id === nextLevelId);

    if (nextLevelExists && !unlockedLevels.includes(nextLevelId)) {
      updatedLevels.push(nextLevelId);
      setUnlockedLevels(updatedLevels);
      localStorage.setItem('into_the_darkness_unlocked_levels', JSON.stringify(updatedLevels));
    }

    // Play triumphant clear fanfare
    synthAudioEngine.playLevelClear();

    // Check if this level complete has an ending story cutscene discovery
    if (activeLevelId === 3) {
      setCutsceneLevelId(3);
      setIsCutsceneEnding(true);
      setScreen('cutscene');
    } else {
      if (activeLevelId === LEVELS.length) {
        setScreen('victory');
      } else {
        setScreen('stageclear');
      }
    }
  };

  const handlePlayerDeath = () => {
    setScreen('gameover');
    synthAudioEngine.playHurt();
  };

  const handleRetryLevel = () => {
    // Retry level playing its brief intro cutscene if exists
    const hasIntroCutscene = [1, 2, 3, 6].includes(activeLevelId);
    if (hasIntroCutscene) {
      setCutsceneLevelId(activeLevelId);
      setIsCutsceneEnding(false);
      setScreen('cutscene');
    } else {
      setScreen('game');
    }
    synthAudioEngine.playPhaseToggle(true);
  };

  const handleReturnToTitle = () => {
    setScreen('title');
    synthAudioEngine.playPhaseToggle(true);
  };

  const handleClearSaveProgress = () => {
    if (confirm("Are you sure you want to reset all game data and speeds?")) {
      localStorage.removeItem('into_the_darkness_locked_levels');
      localStorage.removeItem('into_the_darkness_unlocked_levels');
      localStorage.removeItem('into_the_darkness_best_times');
      setUnlockedLevels([1]);
      setBestSpeeds({});
      synthAudioEngine.playBossDefeated();
    }
  };

  // Helper utility to compare MM:SS times
  const compareTimes = (newTime: string, oldTime: string): boolean => {
    const parse = (t: string) => {
      const parts = t.split(':').map(Number);
      return parts[0] * 60 + parts[1];
    };
    return parse(newTime) < parse(oldTime);
  };

  // Generate an S, A, B Rank based on clear speed time
  const calculateRank = (time: string, levelId: number) => {
    const parts = time.split(':').map(Number);
    const secs = parts[0] * 60 + parts[1];

    if (levelId === 1) {
      if (secs < 90) return 'S';
      if (secs < 140) return 'A';
      return 'B';
    } else if (levelId === 2) {
      if (secs < 130) return 'S';
      if (secs < 190) return 'A';
      return 'B';
    } else {
      if (secs < 180) return 'S';
      if (secs < 240) return 'A';
      return 'B';
    }
  };

  // Auto-set default menu selection index on screen transitions
  useEffect(() => {
    if (screen === 'stageclear') {
      setMenuSelection(1); // Proceed by default
    } else if (screen === 'gameover') {
      setMenuSelection(0); // Retry by default
    } else {
      setMenuSelection(0);
    }
  }, [screen]);

  // Handle unified keydown & physical controller gamepad polling for menu screens
  useEffect(() => {
    if (!['stageclear', 'gameover', 'victory'].includes(screen)) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen === 'stageclear') {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          synthAudioEngine.playPhaseToggle(false);
          setMenuSelection(0);
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          synthAudioEngine.playPhaseToggle(false);
          setMenuSelection(1);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          synthAudioEngine.playPhaseToggle(true);
          if (menuSelection === 0) {
            handleReturnToTitle();
          } else {
            handleStartLevel(activeLevelId + 1);
          }
        }
      } else if (screen === 'gameover') {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          synthAudioEngine.playPhaseToggle(false);
          setMenuSelection(0);
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          synthAudioEngine.playPhaseToggle(false);
          setMenuSelection(1);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          synthAudioEngine.playPhaseToggle(true);
          if (menuSelection === 0) {
            handleRetryLevel();
          } else {
            handleReturnToTitle();
          }
        }
      } else if (screen === 'victory') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          synthAudioEngine.playPhaseToggle(true);
          handleReturnToTitle();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    let animId = 0;
    const prevButtons = { up: false, down: false, left: false, right: false, action: false };

    const pollGamepad = () => {
      if (navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        let gp = null;
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i]) {
            gp = gamepads[i];
            break;
          }
        }

        if (gp) {
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

          // Action keys
          const isAction = gp.buttons[0]?.pressed || gp.buttons[9]?.pressed || gp.buttons[2]?.pressed;

          if (screen === 'stageclear') {
            if ((isLeft || dpadLeft) && !prevButtons.left) {
              synthAudioEngine.playPhaseToggle(false);
              setMenuSelection(0);
            }
            if ((isRight || dpadRight) && !prevButtons.right) {
              synthAudioEngine.playPhaseToggle(false);
              setMenuSelection(1);
            }
            if (isAction && !prevButtons.action) {
              synthAudioEngine.playPhaseToggle(true);
              if (menuSelection === 0) {
                handleReturnToTitle();
              } else {
                handleStartLevel(activeLevelId + 1);
              }
            }
          } else if (screen === 'gameover') {
            if ((isUp || dpadUp) && !prevButtons.up) {
              synthAudioEngine.playPhaseToggle(false);
              setMenuSelection(0);
            }
            if ((isDown || dpadDown) && !prevButtons.down) {
              synthAudioEngine.playPhaseToggle(false);
              setMenuSelection(1);
            }
            if (isAction && !prevButtons.action) {
              synthAudioEngine.playPhaseToggle(true);
              if (menuSelection === 0) {
                handleRetryLevel();
              } else {
                handleReturnToTitle();
              }
            }
          } else if (screen === 'victory') {
            if (isAction && !prevButtons.action) {
              synthAudioEngine.playPhaseToggle(true);
              handleReturnToTitle();
            }
          }

          prevButtons.up = isUp;
          prevButtons.down = isDown;
          prevButtons.left = isLeft;
          prevButtons.right = isRight;
          prevButtons.action = isAction;
        }
      }
      animId = requestAnimationFrame(pollGamepad);
    };

    pollGamepad();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animId);
    };
  }, [screen, menuSelection, activeLevelId]);

  return (
    <div className="min-h-screen bg-black select-none">
      {screen === 'title' && (
        <>
          <TitleScreen
            unlockedLevels={unlockedLevels}
            bestSpeeds={bestSpeeds}
            onStartLevel={handleStartLevel}
          />
          {unlockedLevels.length > 1 && (
            <div className="absolute top-4 right-4 z-40">
              <button
                onClick={handleClearSaveProgress}
                className="flex items-center gap-1 text-[10px] font-mono border border-zinc-800 bg-zinc-950/40 text-rose-500/80 hover:text-rose-400 hover:border-rose-500/30 px-2 py-1 rounded cursor-pointer transition-colors"
                title="Clears saved speeds & level locks"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET ALL SAVES</span>
              </button>
            </div>
          )}
        </>
      )}

      {screen === 'cutscene' && (
        <CutsceneScreen
          levelId={cutsceneLevelId}
          isEnding={isCutsceneEnding}
          onComplete={() => {
            if (isCutsceneEnding) {
              if (activeLevelId === LEVELS.length) {
                setScreen('victory');
              } else {
                setScreen('stageclear');
              }
            } else {
              setScreen('game');
            }
          }}
        />
      )}

      {screen === 'game' && (
        <div className="w-full min-h-screen flex flex-col justify-between bg-[#040108] p-4 text-white select-none overflow-y-auto pb-10">
          <div className="flex-1 min-h-[500px] flex items-center justify-center">
            <IntoTheDarknessCanvas
              levelId={activeLevelId}
              onLevelComplete={handleLevelComplete}
              onPlayerDeath={handlePlayerDeath}
              onPauseToggle={() => {}}
              isPaused={false}
            />
          </div>

          {/* Persistent hotkey reminder menu footer bar */}
          <div className="mt-3 mb-4 flex justify-between items-center bg-[#07010a]/90 border border-zinc-800 p-3 rounded-lg text-zinc-500 text-[11px] font-mono shrink-0">
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-xs flex items-center gap-2">
              <Swords className="w-4 h-4 text-brand-orange animate-pulse" />
              HOTKEYS Protocol
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-end">
              <span><kbd className="text-white bg-zinc-900 border border-zinc-700 px-1 rounded">A/D</kbd> Run</span>
              <span><kbd className="text-white bg-zinc-900 border border-zinc-700 px-1 rounded">W</kbd> Jump</span>
              <span><kbd className="text-white bg-zinc-900 border border-zinc-700 px-1 rounded">Space</kbd> Dash</span>
              <span><kbd className="text-white bg-zinc-900 border border-zinc-700 px-1 rounded">Z</kbd> Shift Step</span>
              <span><kbd className="text-white bg-zinc-900 border border-zinc-700 px-1 rounded text-cyan-400 font-bold">Q</kbd> Change Phase</span>
              <span><kbd className="text-white bg-zinc-900 border border-zinc-700 px-1 rounded">C</kbd> Slash</span>
              <span><kbd className="text-white bg-zinc-900 border border-zinc-700 px-1 rounded">F</kbd> Heavy Hit</span>
              <span><kbd className="text-white bg-zinc-900 border border-zinc-700 px-1 rounded">Hold V</kbd> Charge Blast</span>
              <span><kbd className="text-white bg-zinc-900 border border-zinc-700 px-1 rounded">Shift</kbd> Flight Engine</span>
            </div>
            <button
              onClick={handleReturnToTitle}
              className="flex items-center gap-1 text-zinc-400 hover:text-white underline cursor-pointer transition-colors border border-zinc-800 px-3 py-1.5 rounded-md ml-4 uppercase text-xs font-bold"
            >
              <Home className="w-3.5 h-3.5" />
              <span>QUIT GRID</span>
            </button>
          </div>

          {/* On-screen tactile touch Control Pad for mobile/gamepad accessibility */}
          <ControlPad />
        </div>
      )}

      {screen === 'stageclear' && lastStats && (
        <div className="min-h-screen bg-[#020006] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
          {/* Hexagonal mesh glowing background */}
          <div className="absolute inset-0 bg-radial-gradient(ellipse_60%_50%_at_50%_50%,#090518_70%,transparent_100%) pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-lg border border-brand-cyan bg-zinc-950/90 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(0,229,255,0.15)] text-center"
          >
            <span className="text-brand-cyan text-xs font-mono font-bold uppercase tracking-[0.5em] block mb-2">
              SECTOR SYNC COMPLETION
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight mb-6 uppercase text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-brand-cyan to-white">
              Grid Unlocked
            </h2>

            {/* Performance Dossier values */}
            <div className="grid grid-cols-2 gap-4 mb-8 text-left font-mono">
              <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-lg">
                <span className="block text-zinc-500 text-[10px] uppercase mb-1">Time Elapsed</span>
                <div className="text-2xl font-black text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-cyan" />
                  <span>{lastStats.timeTaken}</span>
                </div>
              </div>

              <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-lg">
                <span className="block text-zinc-500 text-[10px] uppercase mb-1">Grid Rating</span>
                <div className="text-2xl font-black flex items-center gap-1.5">
                  <Star className="w-5 h-5 text-brand-orange" />
                  <span className="text-brand-orange">{calculateRank(lastStats.timeTaken, activeLevelId)} RANK</span>
                </div>
              </div>

              <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-lg">
                <span className="block text-zinc-500 text-[10px] uppercase mb-1">Energy Shards</span>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-pink" />
                  <span>{lastStats.shardsCollected} Cores</span>
                </div>
              </div>

              <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-lg">
                <span className="block text-zinc-500 text-[10px] uppercase mb-1">Life Matrix</span>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{lastStats.finalHp}% HP</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleReturnToTitle}
                className={`flex items-center justify-center gap-2 px-6 py-3 border rounded-xl font-mono text-sm tracking-wide font-bold uppercase cursor-pointer transition-all ${
                  menuSelection === 0
                    ? 'border-brand-pink bg-brand-pink/15 text-white shadow-[0_0_15px_rgba(255,59,95,0.3)] scale-105'
                    : 'border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Return To Portals</span>
              </button>

              <button
                onClick={() => handleStartLevel(activeLevelId + 1)}
                className={`flex items-center justify-center gap-2 px-6 py-3 border rounded-xl font-mono text-sm tracking-wide font-extrabold uppercase cursor-pointer transition-all ${
                  menuSelection === 1
                    ? 'bg-brand-cyan border-brand-cyan text-black shadow-[0_0_20px_rgba(0,229,255,0.4)] scale-105 brightness-110'
                    : 'border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <span>PROCEED TO NEXT GRID</span>
                <Play className="w-4 h-4 fill-current text-current" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {screen === 'gameover' && (
        <div className="min-h-screen bg-[#060001] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-mono text-center">
          <div className="absolute inset-0 bg-radial-gradient(ellipse_60%_50%_at_50%_50%,#200306_70%,transparent_100%) pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-md border border-brand-pink bg-black/90 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_40px_rgba(255,59,95,0.2)]"
          >
            <span className="text-brand-pink text-xs font-bold uppercase tracking-[0.5em] block mb-3 animate-pulse">
              [ DIRECT TERMINATION RECORD ]
            </span>
            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-brand-pink to-brand-orange uppercase mb-4 tracking-tight">
              Biometric Failure
            </h2>
            
            <p className="text-zinc-500 text-xs leading-relaxed mb-8 max-w-sm mx-auto">
              Warning: Spark core energy frequency fell to zero. Cybernetic integration shutdown sequence complete. Sync lost.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleRetryLevel}
                className={`flex items-center justify-center gap-2 px-6 py-3.5 border rounded-xl text-sm font-extrabold uppercase tracking-widest cursor-pointer transition-all ${
                  menuSelection === 0
                    ? 'bg-brand-pink border-brand-pink text-white shadow-[0_0_20px_rgba(255,59,95,0.5)] scale-105 brightness-110'
                    : 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>REBOOT ACTIVE SECTOR</span>
              </button>

              <button
                onClick={handleReturnToTitle}
                className={`flex items-center justify-center gap-2 px-6 py-3 border text-xs font-bold uppercase tracking-wide rounded-xl cursor-pointer transition-all ${
                  menuSelection === 1
                    ? 'border-brand-orange bg-brand-orange/15 text-white shadow-[0_0_15px_rgba(255,69,0,0.3)] scale-105'
                    : 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Disconnect to Portals</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {screen === 'victory' && lastStats && (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0518] to-black text-white flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden text-center">
          {/* Cosmic background circles */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-cyan/5 blur-[160px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-brand-pink/5 blur-[120px] pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-2xl border-2 border-brand-orange bg-[#0a0614]/95 rounded-2xl p-8 md:p-10 backdrop-blur-2xl shadow-[0_0_80px_rgba(255,69,0,0.25)]"
          >
            <Trophy className="w-16 h-16 text-brand-orange mx-auto mb-6 drop-shadow-[0_0_20px_rgba(255,69,0,0.4)] animate-bounce" />

            <span className="text-zinc-500 text-xs font-mono font-bold tracking-[0.4em] block mb-2 uppercase">
              SECTOR 1, 2, 3 SUCCESSFUL
            </span>
            <h2 className="text-4xl md:text-6xl font-black mb-4 uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-100 to-zinc-600">
              Reality Synchronised
            </h2>
            <p className="text-zinc-400 text-sm font-mono max-w-lg mx-auto mb-8">
              The Memory Keeper has been vanquished, the automatic cyber Hive Gird deactivated, and the absolute Oblivion Abyss singularity resolved. Sector status: fully operational.
            </p>

            {/* Total Speed Run Dashboard Dossier */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left font-mono">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
                <span className="text-xs text-zinc-500 block uppercase mb-1">Total Shards</span>
                <div className="text-2xl font-black text-brand-cyan">{lastStats.shardsCollected} CORES</div>
              </div>

              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
                <span className="text-xs text-zinc-500 block uppercase mb-1">Final Level Run</span>
                <div className="text-2xl font-black text-brand-pink">{lastStats.timeTaken} MIN</div>
              </div>

              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
                <span className="text-xs text-zinc-500 block uppercase mb-1">Overload Rating</span>
                <div className="text-2xl font-black text-brand-orange">S-RANK MASTER</div>
              </div>
            </div>

            <div className="text-center mb-8 bg-zinc-900/40 p-3 rounded-lg border border-zinc-800 font-mono text-zinc-400 text-xs">
              🎖️ Unlocked Achievement: <span className="text-white font-bold">VOID MATRIX WALKER</span> (Shattered the Shadow State in Midnight complexity)
            </div>

            <button
              onClick={handleReturnToTitle}
              className="px-8 py-4.5 bg-gradient-to-r from-brand-pink via-brand-orange to-brand-cyan text-black font-extrabold uppercase tracking-widest rounded-xl hover:brightness-115 shadow-[0_0_30px_rgba(255,69,0,0.5)] animate-pulse cursor-pointer transition-all w-full md:w-auto scale-105"
            >
              RETURN TO TITLE GATE
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
