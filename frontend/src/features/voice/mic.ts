// Microphone access for the voice call. Holds one stream and exposes its live input level.
let stream: MediaStream | null = null;
let analyser: AnalyserNode | null = null;
let context: AudioContext | null = null;
let buffer: Uint8Array<ArrayBuffer> | null = null;

export async function requestMic(): Promise<MediaStream | null> {
  if (stream?.active) return stream;
  if (!navigator.mediaDevices?.getUserMedia) return null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  } catch {
    stream = null;
    return null;
  }
}

export function currentMic(): MediaStream | null {
  return stream?.active ? stream : null;
}

/** 0..1 loudness of the user's microphone. */
export function getInputVolume(): number {
  if (!stream?.active) return 0;
  if (!analyser) {
    context = new AudioContext();
    analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(stream).connect(analyser);
    buffer = new Uint8Array(new ArrayBuffer(analyser.fftSize));
  }
  if (!buffer) return 0;
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (const v of buffer) { const d = (v - 128) / 128; sum += d * d; }
  return Math.min(1, Math.sqrt(sum / buffer.length) * 4);
}

export function stopMic() {
  stream?.getTracks().forEach(t => t.stop());
  stream = null;
  analyser = null;
  buffer = null;
  void context?.close();
  context = null;
}
