// src/lib/ambient-music.js
//
// A synthwave loop built from oscillators at runtime. Nothing is downloaded and
// nothing is licensed: the audio only exists while the tab is playing it.

export const BPM = 84;
export const STEPS_PER_CHORD = 16;
export const MASTER_VOLUME = 0.32;
export const FADE_SECONDS = 1.2;

// i - VI - III - VII in A minor: the progression synthwave lives on.
export const PROGRESSION = [
  { name: 'Am', bass: 45, chord: [57, 60, 64] },
  { name: 'F', bass: 41, chord: [53, 57, 60] },
  { name: 'C', bass: 48, chord: [60, 64, 67] },
  { name: 'G', bass: 43, chord: [55, 59, 62] },
];

// Up then down, with the root an octave up as the turn: a six-step figure over
// four beats never lands on the same note as the bass on a downbeat.
export const ARP_PATTERN = [0, 1, 2, 3, 2, 1];

export function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function stepDuration(bpm = BPM) {
  return 60 / bpm / 2;
}

export function chordForStep(step) {
  const index = Math.floor(step / STEPS_PER_CHORD) % PROGRESSION.length;
  return PROGRESSION[index];
}

export function isChordStart(step) {
  return step % STEPS_PER_CHORD === 0;
}

export function arpMidiForStep(step) {
  const { chord } = chordForStep(step);
  const degree = ARP_PATTERN[step % ARP_PATTERN.length];
  return degree === 3 ? chord[0] + 12 : chord[degree];
}

function ramp(param, value, time) {
  param.setValueAtTime(Math.max(value, 0.0001), time);
}

function pluck(ctx, out, { freq, time, duration, type, peak, cutoff }) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, time);
  filter.Q.setValueAtTime(6, time);

  ramp(gain.gain, 0, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  osc.start(time);
  osc.stop(time + duration + 0.05);
}

function pad(ctx, out, { midiNotes, time, duration }) {
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1100, time);
  ramp(gain.gain, 0, time);
  gain.gain.linearRampToValueAtTime(0.1, time + duration * 0.45);
  gain.gain.linearRampToValueAtTime(0.0001, time + duration);
  filter.connect(gain);
  gain.connect(out);

  // Two saws a few cents apart per note: the beating between them is what
  // makes a supersaw pad sound wide instead of thin. The voices stay in the
  // chord's own octave — dropping them one would land on the bass note and
  // muddy it.
  for (const midi of midiNotes) {
    for (const detune of [-7, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(midiToFreq(midi), time);
      osc.detune.setValueAtTime(detune, time);
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + duration + 0.1);
    }
  }
}

function hat(ctx, out, { time, buffer }) {
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  source.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(7000, time);
  ramp(gain.gain, 0.06, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  source.start(time);
  source.stop(time + 0.08);
}

function createNoiseBuffer(ctx) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.15;

export function createAmbientMusic(ctx, options = {}) {
  const { volume = MASTER_VOLUME, setInterval: setTimer = setInterval, clearInterval: clearTimer = clearInterval } = options;

  const master = ctx.createGain();
  ramp(master.gain, 0, ctx.currentTime);
  master.connect(ctx.destination);

  // A filtered feedback delay standing in for reverb: one delay line is far
  // cheaper than a convolver and this style expects the slapback anyway.
  const delay = ctx.createDelay(1);
  const feedback = ctx.createGain();
  const delayTone = ctx.createBiquadFilter();
  delay.delayTime.setValueAtTime(stepDuration() * 1.5, ctx.currentTime);
  ramp(feedback.gain, 0.3, ctx.currentTime);
  delayTone.type = 'lowpass';
  delayTone.frequency.setValueAtTime(2200, ctx.currentTime);
  delay.connect(delayTone);
  delayTone.connect(feedback);
  feedback.connect(delay);
  delay.connect(master);

  const noise = createNoiseBuffer(ctx);
  const spacing = stepDuration();

  let step = 0;
  let nextStepTime = 0;
  let timer = null;

  function scheduleStep(index, time) {
    const { bass, chord } = chordForStep(index);

    if (index % 2 === 0) {
      pluck(ctx, master, {
        freq: midiToFreq(bass),
        time,
        duration: spacing * 1.8,
        type: 'sawtooth',
        peak: 0.34,
        cutoff: 340,
      });
    }

    const arp = ctx.createGain();
    ramp(arp.gain, 1, time);
    arp.connect(master);
    arp.connect(delay);
    pluck(ctx, arp, {
      freq: midiToFreq(arpMidiForStep(index)),
      time,
      duration: spacing * 1.4,
      type: 'square',
      peak: 0.075,
      cutoff: 2600,
    });

    if (index % 2 === 1) {
      hat(ctx, master, { time, buffer: noise });
    }

    if (isChordStart(index)) {
      pad(ctx, master, {
        midiNotes: chord,
        time,
        duration: spacing * STEPS_PER_CHORD,
      });
    }
  }

  function tick() {
    while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
      scheduleStep(step, nextStepTime);
      nextStepTime += spacing;
      step += 1;
    }
  }

  return {
    start() {
      if (timer !== null) return;
      step = 0;
      nextStepTime = ctx.currentTime + 0.1;
      master.gain.cancelScheduledValues(ctx.currentTime);
      ramp(master.gain, 0.0001, ctx.currentTime);
      master.gain.linearRampToValueAtTime(volume, ctx.currentTime + FADE_SECONDS);
      tick();
      timer = setTimer(tick, LOOKAHEAD_MS);
    },
    stop() {
      if (timer === null) return;
      clearTimer(timer);
      timer = null;
      master.gain.cancelScheduledValues(ctx.currentTime);
      ramp(master.gain, master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + FADE_SECONDS * 0.5);
    },
    get playing() {
      return timer !== null;
    },
  };
}
