// FILE: src/utils/haptics.js
// Tiny haptic-feedback helper. Uses the Vibration API on supported devices
// (most Android phones/tablets + some others). Silently no-ops where it isn't
// available (iOS Safari ignores it) so it's always safe to call.

/** Light tap — for selecting / toggling a single chore. */
export function hapticTap() {
  try { navigator.vibrate?.(12); } catch {}
}

/** Success buzz — for completing a chore. */
export function hapticSuccess() {
  try { navigator.vibrate?.([0, 22, 40, 22]); } catch {}
}

/** Big celebration pattern — for finishing everything / leveling up. */
export function hapticCelebrate() {
  try { navigator.vibrate?.([0, 30, 50, 30, 50, 60]); } catch {}
}

/** Soft undo blip. */
export function hapticUndo() {
  try { navigator.vibrate?.(8); } catch {}
}
