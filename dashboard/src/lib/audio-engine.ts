/**
 * VANRAKSHAK-X REACTIVE AUDIO ENGINE
 * Psychologically immersive soundscape based on ecological integrity.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  // Sound layers
  private windNoise: AudioBufferSourceNode | null = null;
  private rumbleOsc: OscillatorNode | null = null;
  private pulseOsc: OscillatorNode | null = null;
  
  private windGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;
  private pulseGain: GainNode | null = null;

  async init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.3;

    // 1. Wind / Background Noise (White noise filtered)
    this.setupWind();
    
    // 2. Low Frequency Rumble (Escalation)
    this.setupRumble();

    // 3. Muted Pulse (Critical)
    this.setupPulse();

    this.initialized = true;
  }

  private setupWind() {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.1;

    whiteNoise.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    whiteNoise.start();
  }

  private setupRumble() {
    if (!this.ctx || !this.masterGain) return;
    this.rumbleOsc = this.ctx.createOscillator();
    this.rumbleOsc.type = 'sine';
    this.rumbleOsc.frequency.value = 45; // Low frequency rumble

    this.rumbleGain = this.ctx.createGain();
    this.rumbleGain.gain.value = 0;

    this.rumbleOsc.connect(this.rumbleGain);
    this.rumbleGain.connect(this.masterGain);
    this.rumbleOsc.start();
  }

  private setupPulse() {
    if (!this.ctx || !this.masterGain) return;
    this.pulseOsc = this.ctx.createOscillator();
    this.pulseOsc.type = 'square';
    this.pulseOsc.frequency.value = 60;

    this.pulseGain = this.ctx.createGain();
    this.pulseGain.gain.value = 0;

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 1.5; // Pulse speed

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.5;
    
    lfo.connect(lfoGain);
    lfoGain.connect(this.pulseGain.gain);

    this.pulseOsc.connect(this.pulseGain);
    this.pulseGain.connect(this.masterGain);
    
    lfo.start();
    this.pulseOsc.start();
  }

  /**
   * Update audio state based on Forest Integrity Score (0-100)
   * and Threat Level (0-1)
   */
  update(integrity: number, threat: number) {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Wind decreases as integrity fails (eerie silence)
    if (this.windGain) {
      this.windGain.gain.setTargetAtTime((integrity / 100) * 0.15, now, 0.5);
    }

    // Rumble increases with threat escalation
    if (this.rumbleGain) {
      const rumbleVal = threat > 0.4 ? (threat - 0.4) * 0.3 : 0;
      this.rumbleGain.gain.setTargetAtTime(rumbleVal, now, 0.5);
    }

    // Pulse only during CRITICAL
    if (this.pulseGain) {
      const pulseVal = threat > 0.8 ? 0.05 : 0;
      this.pulseGain.gain.setTargetAtTime(pulseVal, now, 0.5);
    }
  }
}

export const audioEngine = new AudioEngine();
