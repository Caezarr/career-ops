import type { StateCreator } from 'zustand';

/** Persisted audio device choices.
 *
 *  We store the WebAudio `deviceId` (a stable opaque string scoped to the
 *  origin) rather than the human label — labels are localised by the OS
 *  and the same device can re-enumerate with a different label across
 *  reboots.
 *
 *  `null` means "follow system default" — what the browser picks when no
 *  constraint is provided. We treat that as a first-class state instead of
 *  hard-coding a device, so a user who plugs in AirPods sees them without
 *  re-selecting in Settings. */
export interface AudioSlice {
  audioInputId: string | null;
  audioOutputId: string | null;
  setAudioInputId: (id: string | null) => void;
  setAudioOutputId: (id: string | null) => void;
}

export const createAudioSlice: StateCreator<AudioSlice> = (set) => ({
  audioInputId: null,
  audioOutputId: null,
  setAudioInputId: (audioInputId) => set({ audioInputId }),
  setAudioOutputId: (audioOutputId) => set({ audioOutputId }),
});
