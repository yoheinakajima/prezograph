export const GRAPH_DECK_MOTION = Object.freeze({
  cameraFrameFactor: 0.065,
  contextOpacity: 0.55,
  edgeFadeMs: 700,
  edgeFrameStride: 2,
  initialCamera: Object.freeze({ x: 2000, y: 1200, scale: 0.3 }),
  nodeFadeMs: 700,
  pushFrameFactor: 0.06,
  referenceFps: 60,
  revealStartMs: 80,
  revealStaggerMs: 140,
  tourMoveMs: 700,
  tourPauseMs: 500,
  tourStartDelayMs: 500,
});

/**
 * Preserve a per-frame easing coefficient while making it independent of
 * monitor refresh rate and transient frame duration.
 */
export function frameEase(frameFactor, deltaSeconds, referenceFps = GRAPH_DECK_MOTION.referenceFps) {
  const frames = Math.min(0.05, Math.max(0, deltaSeconds)) * referenceFps;
  return 1 - Math.pow(1 - frameFactor, frames);
}
