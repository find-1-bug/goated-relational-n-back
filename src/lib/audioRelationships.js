let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tokenFrequency(token) {
  const text = String(token || 'A');
  let total = 0;
  for (let i = 0; i < text.length; i++) total += text.charCodeAt(i);
  return 240 + (total % 28) * 22;
}

function playTone(ctx, frequency, duration, pan, startTime, type = 'sine') {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  if (panner) {
    panner.pan.setValueAtTime(pan, startTime);
    oscillator.connect(gain).connect(panner).connect(ctx.destination);
  } else {
    oscillator.connect(gain).connect(ctx.destination);
  }

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function playTokenCue(ctx, token, pan, startTime) {
  const chars = String(token || 'A').slice(0, 4).split('');
  chars.forEach((char, index) => {
    playTone(ctx, tokenFrequency(char), 0.1, pan, startTime + index * 0.13, 'triangle');
  });
}

export function playSoundStimulus(stimulus, pan = 0) {
  if (!stimulus?.rel) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + 0.03;
  const rel = stimulus.rel;
  const a = stimulus.soundA || stimulus.wordA || 'A';
  const b = stimulus.soundB || stimulus.wordB || 'B';

  if (rel === 'PITCH_HIGHER') {
    playTone(ctx, 660, 0.18, pan, now);
    playTone(ctx, 360, 0.18, pan, now + 0.24);
    return;
  }
  if (rel === 'PITCH_LOWER') {
    playTone(ctx, 360, 0.18, pan, now);
    playTone(ctx, 660, 0.18, pan, now + 0.24);
    return;
  }
  if (rel === 'RHYTHM_FASTER') {
    [0, 0.12, 0.24, 0.36].forEach(offset => playTone(ctx, 520, 0.055, pan, now + offset, 'square'));
    return;
  }
  if (rel === 'RHYTHM_SLOWER') {
    [0, 0.24, 0.48].forEach(offset => playTone(ctx, 420, 0.09, pan, now + offset, 'sine'));
    return;
  }

  playTokenCue(ctx, a, pan, now);
  playTokenCue(ctx, b, pan, now + 0.58);
}