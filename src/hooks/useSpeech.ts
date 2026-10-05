import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type Ctor = new () => SpeechRecognitionLike;
const getCtor = (): Ctor | undefined =>
  (window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor }).SpeechRecognition
  ?? (window as unknown as { webkitSpeechRecognition?: Ctor }).webkitSpeechRecognition;

export const speechSupported = () => typeof window !== 'undefined' && Boolean(getCtor());

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone blocked. Allow it in iPhone Settings > Safari > Microphone.',
  'service-not-allowed': 'Speech recognition is not available. Use the 🎤 key on the iPhone keyboard instead.',
  network: 'Speech recognition needs a connection here. Use the 🎤 key on the iPhone keyboard (works offline).',
  'no-speech': 'Nothing heard. Try again closer to the microphone.',
};

/** German dictation via the browser (Safari uses Apple's recognizer). Text is appended, never replaced. */
export function useSpeech(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const finalCb = useRef(onFinal);
  finalCb.current = onFinal;

  const stop = useCallback(() => {
    rec.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) { setError(ERRORS['service-not-allowed']); return; }
    setError('');
    const r = new Ctor();
    r.lang = 'de-DE';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalCb.current(res[0].transcript.trim());
        else live += res[0].transcript;
      }
      setInterim(live);
    };
    r.onerror = (e) => { if (e.error !== 'aborted') setError(ERRORS[e.error] ?? 'Speech recognition stopped.'); };
    r.onend = () => { setListening(false); setInterim(''); rec.current = null; };
    rec.current = r;
    r.start();
    setListening(true);
  }, []);

  useEffect(() => () => rec.current?.stop(), []);
  return { listening, interim, error, start, stop, supported: speechSupported() };
}
