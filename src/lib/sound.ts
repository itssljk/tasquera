// Lightweight Web Audio API sound generator for warm, calm tactile feedback.
// No external mp3/wav audio files required.

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  return audioCtx
}

/**
 * Plays "The Tactile Thud + Pluck" sound:
 * - Layer 1 (The Body): 784 Hz (G5) sine wave with a 2ms attack and fast 180ms exponential decay.
 * - Layer 2 (The Tactile Thud): Low sine drop (160 Hz -> 60 Hz) across 40ms for bottom-end physical weight.
 */
export async function playTaskCompleteSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    if (ctx.state !== 'running') return

    const now = ctx.currentTime

    // Layer 1 (The Body): G5 (784 Hz) sine wave, fast attack (2ms), 180ms decay
    const bodyOsc = ctx.createOscillator()
    const bodyGain = ctx.createGain()
    bodyOsc.type = 'sine'
    bodyOsc.frequency.setValueAtTime(783.99, now)

    // Sharp 2ms attack, exponential decay to near zero over 180ms
    bodyGain.gain.setValueAtTime(0.0001, now)
    bodyGain.gain.exponentialRampToValueAtTime(0.24, now + 0.002)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)

    bodyOsc.connect(bodyGain)
    bodyGain.connect(ctx.destination)

    bodyOsc.start(now)
    bodyOsc.stop(now + 0.19)

    // Layer 2 (The Tactile Thud): Low sine drop 160 Hz -> 60 Hz across 40ms for haptic weight
    const thudOsc = ctx.createOscillator()
    const thudGain = ctx.createGain()
    thudOsc.type = 'sine'
    thudOsc.frequency.setValueAtTime(160, now)
    thudOsc.frequency.exponentialRampToValueAtTime(60, now + 0.04)

    thudGain.gain.setValueAtTime(0.28, now)
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045)

    thudOsc.connect(thudGain)
    thudGain.connect(ctx.destination)

    thudOsc.start(now)
    thudOsc.stop(now + 0.05)
  } catch (err) {
    console.warn('Could not play task completion sound:', err)
  }
}
