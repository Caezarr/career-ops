import { useCallback, useEffect, useRef, useState } from 'react';

/** A pruned-down view of `MediaDeviceInfo` we hand to UI layers — we only
 *  need id + label and we want plain JSON for predictable serialisation. */
export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export type DevicesPermission = 'unknown' | 'granted' | 'denied' | 'prompt';

/**
 * Subscribe to the OS audio device list.
 *
 * Browsers/Tauri's WebView return empty `label` strings until the user has
 * granted mic permission at least once. We therefore expose a `requestAccess`
 * call the UI invokes on the first interaction (e.g. when the user opens
 * the Audio tab or clicks "Test mic"). After permission is granted, we
 * re-enumerate to get human-readable labels.
 *
 * Re-enumerates on `devicechange` so plugging in / unplugging AirPods
 * updates the list live.
 */
/** Cache the resolved permission across reloads. WKWebView (Tauri)
 *  doesn't expose the Permissions API reliably, so we infer from
 *  device labels — but that inference returns empty labels on the
 *  very first enumerate after a reload, which flashed the warning
 *  banner for ~1s every navigation. Once granted, we trust the
 *  cache + skip the banner. */
const PERMISSION_CACHE_KEY = 'careeros-mic-permission';

function readCachedPermission(): DevicesPermission {
  try {
    const v = window.localStorage.getItem(PERMISSION_CACHE_KEY);
    if (v === 'granted' || v === 'denied') return v;
  } catch {
    /* private mode */
  }
  return 'unknown';
}

function persistPermission(p: DevicesPermission): void {
  try {
    if (p === 'granted' || p === 'denied') {
      window.localStorage.setItem(PERMISSION_CACHE_KEY, p);
    }
  } catch {
    /* private mode */
  }
}

export function useAudioDevices() {
  const [inputs, setInputs] = useState<AudioDevice[]>([]);
  const [outputs, setOutputs] = useState<AudioDevice[]>([]);
  // Boot from the localStorage cache — if the user has granted
  // permission in a previous session, skip the banner entirely.
  const [permission, setPermission] = useState<DevicesPermission>(() =>
    readCachedPermission(),
  );
  const [error, setError] = useState<string | null>(null);
  // Hold the active stream so requestAccess can stop tracks on unmount —
  // we don't want a "Career OS is using your microphone" indicator stuck
  // on after the user navigates away.
  const grantStreamRef = useRef<MediaStream | null>(null);

  const enumerate = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError('Audio device enumeration is not supported in this runtime.');
      return;
    }
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const ins: AudioDevice[] = [];
      const outs: AudioDevice[] = [];
      for (const d of all) {
        if (d.kind === 'audioinput') {
          ins.push({ deviceId: d.deviceId, label: d.label, kind: 'audioinput' });
        } else if (d.kind === 'audiooutput') {
          outs.push({ deviceId: d.deviceId, label: d.label, kind: 'audiooutput' });
        }
      }
      setInputs(ins);
      setOutputs(outs);
      // Heuristic: if any input has a non-empty label, mic permission has
      // been granted at some point. The Permissions API isn't reliably
      // available across WebKit / Tauri so we infer from labels.
      if (ins.some((d) => d.label)) {
        setPermission((prev) => {
          if (prev === 'denied') return prev;
          if (prev !== 'granted') persistPermission('granted');
          return 'granted';
        });
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  /** Prompt the user for mic permission. Resolves once the browser has
   *  accepted/denied — re-runs enumeration so labels populate. */
  const requestAccess = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('getUserMedia is not available.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      grantStreamRef.current = stream;
      setPermission('granted');
      persistPermission('granted');
      await enumerate();
      // Stop the tracks immediately — we only needed the prompt to fire.
      // The level meter opens its own stream against the chosen device.
      stream.getTracks().forEach((t) => t.stop());
      grantStreamRef.current = null;
    } catch (e) {
      const err = e as DOMException;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermission('denied');
        persistPermission('denied');
        setError('Microphone access was denied. Allow it in System Settings to test audio.');
      } else {
        setError(err.message);
      }
    }
  }, [enumerate]);

  useEffect(() => {
    // Best-effort: query the Permissions API when available. This
    // beats the device-label heuristic when present, but the
    // 'microphone' descriptor isn't supported everywhere (Tauri
    // WKWebView in particular is hit-or-miss).
    if (navigator.permissions?.query) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          if (status.state === 'granted' || status.state === 'denied') {
            setPermission(status.state);
            persistPermission(status.state);
          }
          status.onchange = () => {
            if (status.state === 'granted' || status.state === 'denied') {
              setPermission(status.state);
              persistPermission(status.state);
            }
          };
        })
        .catch(() => {
          /* descriptor not supported — fall back to the label heuristic */
        });
    }

    enumerate();
    const md = navigator.mediaDevices;
    if (!md?.addEventListener) return;
    md.addEventListener('devicechange', enumerate);
    return () => {
      md.removeEventListener('devicechange', enumerate);
      grantStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [enumerate]);

  return { inputs, outputs, permission, error, refresh: enumerate, requestAccess };
}
