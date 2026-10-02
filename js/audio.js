export function createAudio() {
  let ctx = null;
  let muted = false;

  function ac() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain, delay = 0, slide = 0) {
    const context = ac();
    if (!context || muted) return;
    const t0 = context.currentTime + delay;
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp);
    amp.connect(context.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  return {
    isMuted() {
      return muted;
    },
    setMuted(value) {
      muted = !!value;
    },
    unlock() {
      try {
        ac();
      } catch {
        /* autoplay policies vary; the next gesture retries */
      }
    },
    play(name) {
      if (!name || muted) return;
      if (name === "jump") tone(540, 0.1, "square", 0.045, 0, 220);
      else if (name === "hurt") tone(196, 0.24, "sawtooth", 0.05, 0, -90);
      else if (name === "treat") tone(880, 0.09, "square", 0.04, 0, 240);
      else if (name === "check") tone(620, 0.07, "triangle", 0.03);
      else if (name === "click") tone(740, 0.04, "square", 0.025);
      else if (name === "over") tone(150, 0.4, "triangle", 0.06, 0, -50);
      else if (name === "clear") {
        tone(523, 0.12, "triangle", 0.05, 0);
        tone(659, 0.12, "triangle", 0.05, 0.12);
        tone(784, 0.22, "triangle", 0.055, 0.24);
      }
    },
  };
}
