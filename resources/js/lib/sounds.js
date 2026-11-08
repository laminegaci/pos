// Short UI sounds synthesized with the Web Audio API (no audio files to load).
// Browsers only allow audio after a user gesture; every sound here is triggered
// by a click or a key press, or follows one (the purchase confirmation).

const STORAGE_KEY = 'pos.sound';
const listeners = new Set();

let ctx = null;
let enabled = readEnabled();

function readEnabled() {
    try {
        return localStorage.getItem(STORAGE_KEY) !== 'off';
    } catch {
        return true;
    }
}

export function isSoundEnabled() {
    return enabled;
}

export function setSoundEnabled(value) {
    enabled = !!value;
    try {
        localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
        // storage unavailable: the choice lasts until reload
    }
    listeners.forEach((fn) => fn(enabled));
}

export function onSoundChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function audio() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

/**
 * Plays one tone with a quick attack and exponential release.
 * @param {number} freq    start frequency (Hz)
 * @param {number} start   delay from now (s)
 * @param {number} length  duration (s)
 * @param {object} opts    { type, volume, to } — `to` glides the pitch to that frequency
 */
function tone(ac, freq, start, length, { type = 'sine', volume = 0.18, to = null } = {}) {
    const t0 = ac.currentTime + start;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + length);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);

    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + length + 0.02);
}

function play(fn) {
    if (!enabled) return;
    try {
        const ac = audio();
        if (ac) fn(ac);
    } catch {
        // audio is a nice-to-have: never break the sale flow
    }
}

export const sounds = {
    /** Product added to the cart: short bright "pop". */
    add: () =>
        play((ac) => {
            tone(ac, 660, 0, 0.09, { type: 'triangle', volume: 0.16, to: 990 });
        }),

    /** Quantity decreased / line removed: soft low tick. */
    remove: () =>
        play((ac) => {
            tone(ac, 420, 0, 0.08, { type: 'triangle', volume: 0.12, to: 300 });
        }),

    /** Action refused (stock limit, payment insufficient): two low buzzes. */
    error: () =>
        play((ac) => {
            tone(ac, 220, 0, 0.11, { type: 'square', volume: 0.06 });
            tone(ac, 196, 0.13, 0.14, { type: 'square', volume: 0.06 });
        }),

    /** Sale completed: cash-register style rising chime (C–E–G–C). */
    success: () =>
        play((ac) => {
            [523.25, 659.25, 783.99].forEach((f, i) => tone(ac, f, i * 0.09, 0.22, { type: 'sine', volume: 0.16 }));
            tone(ac, 1046.5, 0.27, 0.45, { type: 'sine', volume: 0.18 });
            tone(ac, 2093, 0.27, 0.3, { type: 'sine', volume: 0.04 });
        }),
};
