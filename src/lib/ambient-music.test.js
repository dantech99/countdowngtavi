import { describe, it, expect } from 'vitest';
import {
  ARP_PATTERN,
  MASTER_VOLUME,
  PROGRESSION,
  STEPS_PER_CHORD,
  arpMidiForStep,
  chordForStep,
  createAmbientMusic,
  isChordStart,
  midiToFreq,
  stepDuration,
} from './ambient-music.js';

describe('midiToFreq', () => {
  it('anchors on A440', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 6);
  });

  it('halves a frequency an octave down', () => {
    expect(midiToFreq(57)).toBeCloseTo(220, 6);
  });
});

describe('stepDuration', () => {
  it('splits a beat into eighth notes', () => {
    expect(stepDuration(120)).toBeCloseTo(0.25, 6);
  });
});

describe('chordForStep', () => {
  it('holds each chord for a full sixteen steps', () => {
    expect(chordForStep(0).name).toBe('Am');
    expect(chordForStep(STEPS_PER_CHORD - 1).name).toBe('Am');
    expect(chordForStep(STEPS_PER_CHORD).name).toBe('F');
  });

  it('wraps around at the end of the progression', () => {
    const loop = STEPS_PER_CHORD * PROGRESSION.length;
    expect(chordForStep(loop).name).toBe('Am');
    expect(chordForStep(loop + STEPS_PER_CHORD * 2).name).toBe('C');
  });
});

describe('isChordStart', () => {
  it('is true only on the downbeat of a chord', () => {
    expect(isChordStart(0)).toBe(true);
    expect(isChordStart(1)).toBe(false);
    expect(isChordStart(STEPS_PER_CHORD)).toBe(true);
  });
});

describe('arpMidiForStep', () => {
  it('walks the chord tones and turns on the root an octave up', () => {
    const [root, third, fifth] = PROGRESSION[0].chord;
    expect(arpMidiForStep(0)).toBe(root);
    expect(arpMidiForStep(1)).toBe(third);
    expect(arpMidiForStep(2)).toBe(fifth);
    expect(arpMidiForStep(3)).toBe(root + 12);
    expect(arpMidiForStep(4)).toBe(fifth);
  });

  it('repeats every six steps', () => {
    expect(arpMidiForStep(ARP_PATTERN.length)).toBe(arpMidiForStep(0));
  });
});

function createMockContext() {
  const started = [];
  const ramps = [];
  const param = () => ({
    value: 0,
    setValueAtTime(value, _time) {
      this.value = value;
      return this;
    },
    linearRampToValueAtTime(value, time) {
      ramps.push({ value, time });
      this.value = value;
      return this;
    },
    exponentialRampToValueAtTime() {
      return this;
    },
    cancelScheduledValues() {
      return this;
    },
  });
  const node = (extra = {}) => ({
    connect() {},
    disconnect() {},
    start(time) {
      started.push({ freq: this.frequency?.value, time });
    },
    stop() {},
    ...extra,
  });

  return {
    started,
    ramps,
    currentTime: 0,
    sampleRate: 48000,
    destination: node(),
    createGain: () => node({ gain: param() }),
    createOscillator: () => node({ frequency: param(), detune: param() }),
    createBiquadFilter: () => node({ frequency: param(), Q: param() }),
    createDelay: () => node({ delayTime: param() }),
    createBufferSource: () => node({ buffer: null }),
    createBuffer: (_channels, length) => ({
      getChannelData: () => new Float32Array(length),
    }),
  };
}

describe('createAmbientMusic', () => {
  it('does not schedule anything before start', () => {
    const ctx = createMockContext();
    const music = createAmbientMusic(ctx);
    expect(music.playing).toBe(false);
    expect(ctx.started).toHaveLength(0);
  });

  it('schedules the opening bass, arpeggio and pad on the first downbeat', () => {
    const ctx = createMockContext();
    const music = createAmbientMusic(ctx, { setInterval: () => 1, clearInterval: () => {} });
    music.start();

    const [root] = PROGRESSION[0].chord;
    const freqs = ctx.started.map((s) => s.freq);
    expect(freqs).toContain(midiToFreq(PROGRESSION[0].bass));
    // Bass, arpeggio root and the two detuned pad voices all land on the
    // downbeat: one from the bass line plus two from the pad, and the
    // arpeggio's own root on top.
    expect(freqs.filter((f) => f === midiToFreq(PROGRESSION[0].bass))).toHaveLength(1);
    expect(freqs.filter((f) => f === midiToFreq(root))).toHaveLength(3);
    expect(music.playing).toBe(true);
  });

  it('schedules ahead without running past the lookahead window', () => {
    const ctx = createMockContext();
    const music = createAmbientMusic(ctx, { setInterval: () => 1, clearInterval: () => {} });
    music.start();
    const last = Math.max(...ctx.started.map((s) => s.time));
    expect(last).toBeLessThan(ctx.currentTime + 0.3);
  });

  it('fades up to the configured volume instead of jumping to it', () => {
    const ctx = createMockContext();
    const music = createAmbientMusic(ctx, { setInterval: () => 1, clearInterval: () => {} });
    music.start();
    const fadeIn = ctx.ramps.find((r) => r.value === MASTER_VOLUME);
    expect(fadeIn).toBeDefined();
    expect(fadeIn.time).toBeGreaterThan(ctx.currentTime);
  });

  it('clears its timer on stop and can start again', () => {
    const ctx = createMockContext();
    let cleared = 0;
    const music = createAmbientMusic(ctx, {
      setInterval: () => 7,
      clearInterval: (id) => {
        expect(id).toBe(7);
        cleared += 1;
      },
    });
    music.start();
    music.stop();
    expect(cleared).toBe(1);
    expect(music.playing).toBe(false);
    music.start();
    expect(music.playing).toBe(true);
  });

  it('ignores a second start while already playing', () => {
    const ctx = createMockContext();
    const music = createAmbientMusic(ctx, { setInterval: () => 1, clearInterval: () => {} });
    music.start();
    const scheduled = ctx.started.length;
    music.start();
    expect(ctx.started).toHaveLength(scheduled);
  });
});
