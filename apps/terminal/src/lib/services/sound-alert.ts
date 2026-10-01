/**
 * High-performance Web Audio API Sound Chime Synthesizer
 * Zero external mp3 dependencies, 100% reliable across browsers and offline.
 */
class SoundAlertService {
  private audioCtx: AudioContext | null = null
  private _isMuted: boolean = false

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pairlens:sound:muted')
        this._isMuted = saved === 'true'
      } catch {}
    }
  }

  public toggleMute(): boolean {
    this._isMuted = !this._isMuted
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pairlens:sound:muted', String(this._isMuted))
      } catch {}
    }
    return this._isMuted
  }

  public isMuted(): boolean {
    return this._isMuted
  }

  public getIsMuted(): boolean {
    return this._isMuted
  }

  private initContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass()
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume()
    }
  }

  /**
   * Crisp Bloomberg/Terminal Institutional Alert Chime (Harmonic Double-Ping)
   */
  public playNewSignalChime() {
    if (this._isMuted || typeof window === 'undefined') return

    try {
      this.initContext()
      if (!this.audioCtx) return

      const now = this.audioCtx.currentTime

      // Tone 1: 587.33 Hz (D5)
      const osc1 = this.audioCtx.createOscillator()
      const gain1 = this.audioCtx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(587.33, now)
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12) // Glides to A5

      gain1.gain.setValueAtTime(0.001, now)
      gain1.gain.linearRampToValueAtTime(0.2, now + 0.02)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

      osc1.connect(gain1)
      gain1.connect(this.audioCtx.destination)

      osc1.start(now)
      osc1.stop(now + 0.35)

      // Tone 2: Harmonic high ping 1174.66 Hz (D6)
      const osc2 = this.audioCtx.createOscillator()
      const gain2 = this.audioCtx.createGain()
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(1174.66, now + 0.08)

      gain2.gain.setValueAtTime(0.001, now + 0.08)
      gain2.gain.linearRampToValueAtTime(0.22, now + 0.1)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55)

      osc2.connect(gain2)
      gain2.connect(this.audioCtx.destination)

      osc2.start(now + 0.08)
      osc2.stop(now + 0.55)
    } catch {}
  }

  /**
   * Target Hit / Profit Locked Chime (Emerald Ascending Arpeggio)
   */
  public playProfitHitChime() {
    if (this._isMuted || typeof window === 'undefined') return

    try {
      this.initContext()
      if (!this.audioCtx) return

      const now = this.audioCtx.currentTime
      const freqs = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

      freqs.forEach((f, idx) => {
        if (!this.audioCtx) return
        const noteStart = now + idx * 0.07
        const osc = this.audioCtx.createOscillator()
        const gain = this.audioCtx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(f, noteStart)

        gain.gain.setValueAtTime(0.001, noteStart)
        gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.3)

        osc.connect(gain)
        gain.connect(this.audioCtx.destination)

        osc.start(noteStart)
        osc.stop(noteStart + 0.3)
      })
    } catch {}
  }
}

export const soundAlertService = new SoundAlertService()
