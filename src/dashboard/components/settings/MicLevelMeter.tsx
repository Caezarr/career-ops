import { useEffect, useRef, useState } from 'react';

interface MicLevelMeterProps {
  /** WebAudio deviceId, or null to follow the system default mic. */
  deviceId: string | null;
  /** When false, the meter tears down its stream + AudioContext to free
   *  the mic indicator and CPU. */
  active: boolean;
}

/**
 * Renders a 20-segment LED-style meter driven by the RMS level of the
 * chosen microphone. Designed to make "is my mic picking up anything?" a
 * one-glance question.
 *
 * Lifecycle:
 *  - When `active` toggles on (or `deviceId` changes while active), open a
 *    media stream constrained to that device, wire it through an
 *    AnalyserNode, and start a RAF loop that samples the time-domain data
 *    and computes the RMS in [0,1].
 *  - On `active=false` or unmount, stop tracks, close the AudioContext,
 *    cancel the RAF — leave nothing dangling so macOS drops the orange
 *    "in-use" dot.
 */
export default function MicLevelMeter({ deviceId, active }: MicLevelMeterProps) {
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      teardown();
      setLevel(0);
      return;
    }

    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        // Use a webkit-prefixed fallback for older Tauri WebKits, even
        // though Sonoma's WKWebView already supports the unprefixed form.
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new Ctx();
        ctxRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);

        // Time-domain sample buffer (raw waveform, [-1, 1] scaled to [0, 255]).
        const buf = new Uint8Array(analyser.fftSize);

        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          // Speech RMS rarely exceeds ~0.3 — scale up so the meter is
          // expressive without saturating on every breath.
          setLevel(Math.min(1, rms * 3));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        const err = e as DOMException;
        if (err.name === 'NotAllowedError') {
          setError('Microphone permission was denied.');
        } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
          setError('Selected microphone is no longer available.');
        } else {
          setError(err.message);
        }
      }
    })();

    return () => {
      cancelled = true;
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, deviceId]);

  function teardown() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close().catch(() => {});
    }
    ctxRef.current = null;
  }

  // 20 segments — most "live" between 4 and 16; the last 4 are "hot" red
  // so users can see when they're clipping.
  const segments = 20;
  const lit = Math.round(level * segments);

  if (error) {
    return <div className="settings-audio-meter settings-audio-meter--error">{error}</div>;
  }

  return (
    <div className="settings-audio-meter" aria-label="Microphone level" role="meter">
      {Array.from({ length: segments }).map((_, i) => {
        const isLit = i < lit;
        const tone = i >= 16 ? 'hot' : i >= 12 ? 'mid' : 'cool';
        return (
          <span
            key={i}
            className={
              `settings-audio-meter__seg settings-audio-meter__seg--${tone}` +
              (isLit ? ' settings-audio-meter__seg--lit' : '')
            }
          />
        );
      })}
    </div>
  );
}
