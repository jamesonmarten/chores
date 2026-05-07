// FILE: src/utils/voice.js
// Tiny MediaRecorder wrapper for parent voice reminders attached to chores.
// Stores ~5–15s clips as base64 webm/opus dataURLs in localStorage.

let _rec = null;
let _stream = null;
let _chunks = [];

export function voiceSupported() {
  return typeof window !== 'undefined' &&
         'MediaRecorder' in window &&
         navigator.mediaDevices?.getUserMedia;
}

export async function startRecording() {
  if (!voiceSupported()) throw new Error('Recording not supported');
  _stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  _chunks = [];
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');
  _rec = new MediaRecorder(_stream, { mimeType });
  _rec.ondataavailable = e => { if (e.data.size) _chunks.push(e.data); };
  _rec.start();
}

/** Stops the recorder and resolves with a dataURL (or '' on failure). */
export function stopRecording() {
  return new Promise(resolve => {
    if (!_rec) return resolve('');
    _rec.onstop = async () => {
      try {
        const blob = new Blob(_chunks, { type: _rec.mimeType });
        const r = new FileReader();
        r.onloadend = () => resolve(r.result || '');
        r.readAsDataURL(blob);
      } catch { resolve(''); }
      try { _stream?.getTracks().forEach(t => t.stop()); } catch {}
      _stream = null; _rec = null; _chunks = [];
    };
    _rec.stop();
  });
}

export function cancelRecording() {
  try { _rec?.stop(); } catch {}
  try { _stream?.getTracks().forEach(t => t.stop()); } catch {}
  _rec = null; _stream = null; _chunks = [];
}

/** Play a stored voice dataURL. Returns the Audio element so callers can pause. */
export function playVoice(dataUrl) {
  if (!dataUrl) return null;
  try {
    const a = new Audio(dataUrl);
    a.play().catch(() => {});
    return a;
  } catch { return null; }
}
