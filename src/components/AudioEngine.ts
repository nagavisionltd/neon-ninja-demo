// Real-time Procedural Audio Synthesizer via Web Audio API
// Imitating a high-tempo Sega Genesis / Gunstar Heroes cyber soundtrack

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterVolume: GainNode | null = null;
  private bgmInterval: any = null;
  private bgmPlaying = false;
  private isMuted = false;
  private volumeLevel = 0.35; // default 35%
  private currentStep = 0;

  constructor() {
    // Lazy initialisation on user click to comply with browser autocomplete policies
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(this.isMuted ? 0 : this.volumeLevel, this.ctx.currentTime);
      this.masterVolume.connect(this.ctx.destination);
    } catch (e) {
      console.warn("AudioContext failed to initialise:", e);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterVolume && this.ctx) {
      this.masterVolume.gain.setValueAtTime(this.isMuted ? 0 : this.volumeLevel, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public setVolume(level: number) {
    this.volumeLevel = Math.max(0, Math.min(1, level));
    if (this.masterVolume && this.ctx && !this.isMuted) {
      this.masterVolume.gain.setValueAtTime(this.volumeLevel, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volumeLevel;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // --- SOUND EFFECTS CREATION ---

  public playJump() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    // Exponential sweep up for jump swoosh
    osc.frequency.exponentialRampToValueAtTime(650, this.ctx.currentTime + 0.14);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(this.masterVolume!);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  public playPhaseToggle(isTruth: boolean) {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const baseFreq = isTruth ? 587.33 : 349.23; // D5 vs F4 cyber chimes
    const duration = 0.22;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sine";
    osc2.type = "square"; // metallic texture

    osc1.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + duration);
    
    osc2.frequency.setValueAtTime(baseFreq * 2.01, this.ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(baseFreq * 2.5, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    // Apply high pass filter to give metallic cyber feel
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume!);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + duration);
    osc2.stop(this.ctx.currentTime + duration);
  }

  public playAttackSlash() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    // Construct a noise buffer for the slicing blade air friction
    const bufferSize = this.ctx.sampleRate * 0.14; // 140ms slicing noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Pitch sweep filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(3000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.13);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.13);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume!);

    // Parallel bass sword swing thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(190, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);
    
    oscGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(oscGain);
    oscGain.connect(this.masterVolume!);

    noiseNode.start();
    osc.start();
    
    noiseNode.stop(this.ctx.currentTime + 0.14);
    osc.stop(this.ctx.currentTime + 0.14);
  }

  public playLaserShot() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterVolume!);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  public playHitEnemy() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    // High crunchy impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.32, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.09);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume!);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  public playHurt() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.22);

    gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(this.masterVolume!);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.22);
  }

  public playBossDefeated() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    // Exploding low rumbles
    for(let i=0; i<4; i++) {
      const delay = i * 0.15;
      const duration = 0.4;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110 - i*20, this.ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + delay + duration);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(180, this.ctx.currentTime);

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(this.masterVolume!);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    }
  }

  public playLevelClear() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    // Glorious retro cyber-fanfare: C Major / C9 arpeggio chord progression
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const delay = idx * 0.08;
      const duration = 0.4;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + delay);
      
      gain.gain.setValueAtTime(0.12, this.ctx!.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(this.masterVolume!);

      osc.start(this.ctx!.currentTime + delay);
      osc.stop(this.ctx!.currentTime + delay + duration);
    });
  }

  // --- BACKGROUND PROCEDURAL SYNTH MUSIC ---

  public startBGM() {
    this.initContext();
    if (this.bgmPlaying || !this.ctx) return;
    this.bgmPlaying = true;
    this.currentStep = 0;

    // A high-speed retro drum & cyber synth loop sequence (135 BPM)
    const stepDuration = 60 / 135 / 2; // Eighth notes (BPM=135)

    // A gorgeous bass sequence: C minor -> Eb major -> G minor -> Bb major
    const minorBass = [65.41, 65.41, 77.78, 65.41, 98.00, 98.00, 116.54, 98.00]; // C2 -> Eb2 -> G2 -> Bb2 (in Hz)
    const activeLead = [261.63, 311.13, 392.00, 466.16, 523.25, 622.25, 783.99, 932.33];

    this.bgmInterval = setInterval(() => {
      if (this.isMuted || !this.ctx) return;

      const idx = this.currentStep % 16;
      const rawChordIdx = Math.floor(this.currentStep / 16) % 4;
      
      // Determine base frequency based on sequence
      let chordBase = 1;
      if (rawChordIdx === 0) chordBase = 65.41; // C2
      else if (rawChordIdx === 1) chordBase = 77.78; // Eb2
      else if (rawChordIdx === 2) chordBase = 98.00; // G2
      else chordBase = 58.27; // Bb1

      // Step 1: Bass pulse line (always pulsing)
      if (idx % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = "triangle";
        
        let freq = chordBase;
        if (idx === 4) freq *= 1.25;
        if (idx === 12) freq *= 1.5;

        bassOsc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        bassGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + stepDuration - 0.02);

        bassOsc.connect(bassGain);
        bassGain.connect(this.masterVolume!);
        bassOsc.start();
        bassOsc.stop(this.ctx.currentTime + stepDuration);
      }

      // Step 2: Drum Synthesized Kick (every quarter beat: index 0, 4, 8, 12)
      if (idx % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = "sine";
        kickOsc.frequency.setValueAtTime(130, this.ctx.currentTime);
        kickOsc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);
        
        kickGain.gain.setValueAtTime(0.24, this.ctx.currentTime);
        kickGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

        kickOsc.connect(kickGain);
        kickGain.connect(this.masterVolume!);
        kickOsc.start();
        kickOsc.stop(this.ctx.currentTime + 0.12);
      }

      // Step 3: Drum Hi-Hat tick (off beats: index 2, 6, 10, 14)
      if (idx % 4 === 2) {
        const hatOsc = this.ctx.createOscillator();
        const hatGain = this.ctx.createGain();
        hatOsc.type = "triangle";
        hatOsc.frequency.setValueAtTime(8000, this.ctx.currentTime);
        
        hatGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        hatGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

        hatOsc.connect(hatGain);
        hatGain.connect(this.masterVolume!);
        hatOsc.start();
        hatOsc.stop(this.ctx.currentTime + 0.04);
      }

      // Step 4: Melodic arpeggiator notes (very subtle, soft synth)
      if (idx % 3 === 0) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = "sine";

        const octaveOffset = idx % 2 === 0 ? 4 : 2;
        const noteFreq = chordBase * octaveOffset;

        leadOsc.frequency.setValueAtTime(noteFreq, this.ctx.currentTime);
        // Soft arpeggio slide
        leadOsc.frequency.linearRampToValueAtTime(noteFreq * 1.33, this.ctx.currentTime + 0.1);

        leadGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        leadGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

        leadOsc.connect(leadGain);
        leadGain.connect(this.masterVolume!);
        leadOsc.start();
        leadOsc.stop(this.ctx.currentTime + 0.12);
      }

      this.currentStep++;
    }, stepDuration * 1000);
  }

  public stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.bgmPlaying = false;
  }
}

export const synthAudioEngine = new AudioEngine();
