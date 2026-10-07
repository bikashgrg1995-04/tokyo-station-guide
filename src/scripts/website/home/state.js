// Shared mutable state (one object instead of many reassigned variables).

export const state = {
  lineIdx: 0,
  idx: 0,
  zoom: 1,
  track: null,
  VB: {
    x: 0,
    y: 0,
    w: 800,
    h: 960,
  },
  carEls: [],
  glowEl: null,
  carPitch: 30,
  trainS: 0,
  trainLane: 1,
  trainDir: 1,
  anim: null,
};
