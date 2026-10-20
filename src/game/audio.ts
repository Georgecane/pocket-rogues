type SoundName = 'shot' | 'pocket' | 'charm' | 'win' | 'rail';

export class CozyAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private enabled = true;
  private started = false;
  private timer?: number;
  private step = 0;
  private readonly progression = [
    [261.63, 329.63, 392, 493.88],
    [220, 261.63, 329.63, 392],
    [174.61, 220, 261.63, 329.63],
    [196, 246.94, 293.66, 369.99],
  ];

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.context.destination);
      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.master);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    if (this.enabled && !this.started) {
      this.started = true;
      this.musicGain?.gain.setTargetAtTime(0.16, this.context.currentTime, 1.2);
      this.playMusicPhrase();
    }
  }

  async toggle(): Promise<boolean> {
    this.enabled = !this.enabled;
    await this.unlock();
    const now = this.context!.currentTime;
    this.musicGain!.gain.cancelScheduledValues(now);
    this.musicGain!.gain.setTargetAtTime(this.enabled ? 0.16 : 0, now, 0.18);
    return this.enabled;
  }

  get isEnabled(): boolean { return this.enabled; }

  private playMusicPhrase(): void {
    if (!this.context || !this.musicGain || !this.started) return;
    const ctx = this.context;
    const chord = this.progression[this.step % this.progression.length];
    const start = ctx.currentTime + 0.04;
    chord.forEach((frequency, index) => this.note(frequency, start + index * 0.035, 2.35, 0.13, 'triangle', this.musicGain!));
    this.note(chord[0] / 2, start, 2.8, 0.19, 'sine', this.musicGain);
    const melody = [1.5, 1.25, 1.125, 1.5, 1.333, 1.125, 1.25, 1.667];
    const tone = chord[(this.step * 3 + 1) % chord.length] * melody[this.step % melody.length];
    this.note(tone, start + 0.48, 1.3, 0.055, 'sine', this.musicGain);
    if (this.step % 2 === 1) this.note(chord[2] * 2, start + 1.25, 0.9, 0.028, 'sine', this.musicGain);
    this.step += 1;
    this.timer = window.setTimeout(() => this.playMusicPhrase(), 2850);
  }

  play(name: SoundName): void {
    if (!this.context || !this.master || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (name === 'shot') {
      this.note(185, now, 0.11, 0.24, 'triangle', this.master, 0.12);
      this.note(92, now, 0.08, 0.12, 'sine', this.master, 0.1);
    } else if (name === 'pocket') {
      this.note(660, now, 0.12, 0.09, 'sine', this.master, 0.22);
      this.note(880, now + 0.07, 0.18, 0.06, 'sine', this.master, 0.22);
    } else if (name === 'charm') {
      [523.25, 659.25, 783.99].forEach((hz, i) => this.note(hz, now + i * 0.085, 0.32, 0.065, 'sine', this.master!, 0.22));
    } else if (name === 'win') {
      [392, 493.88, 587.33, 783.99].forEach((hz, i) => this.note(hz, now + i * 0.12, 0.55, 0.07, 'triangle', this.master!, 0.3));
    } else {
      this.note(125, now, 0.09, 0.08, 'triangle', this.master, 0.08);
    }
  }

  destroy(): void {
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.started = false;
    void this.context?.close();
  }

  private note(frequency: number, when: number, duration: number, volume: number,
    type: OscillatorType, destination: AudioNode, attack = 0.015): void {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(volume, when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.03);
  }
}
