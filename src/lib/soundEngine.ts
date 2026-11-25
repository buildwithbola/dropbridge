const SOUND_KEY = "dropbridge-sound-enabled-v1";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(SOUND_KEY);
        if (stored !== null) {
          this.enabled = stored === "true";
        }
      } catch {
        // ignore
      }
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    try {
      localStorage.setItem(SOUND_KEY, String(next));
    } catch {
      // ignore
    }
    if (next) {
      this.playTap();
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, startOffset: number, duration: number, peakGain = 0.08, type: OscillatorType = "sine"): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playTap(): void {
    this.playTone(620, 0, 0.07, 0.045, "triangle");
  }

  public playConnected(): void {
    this.playTone(523.25, 0, 0.16, 0.07, "sine"); // C5
    this.playTone(783.99, 0.09, 0.24, 0.08, "sine"); // G5
  }

  public playTransferComplete(): void {
    this.playTone(659.25, 0, 0.14, 0.06, "sine"); // E5
    this.playTone(830.61, 0.08, 0.16, 0.065, "sine"); // G#5
    this.playTone(987.77, 0.16, 0.28, 0.075, "sine"); // B5
  }
}

export const soundEngine = new SoundEngine();
