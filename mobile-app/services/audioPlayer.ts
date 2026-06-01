import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import type { AudioTrack } from './filePicker';

export interface PlaybackState {
  isPlaying: boolean;
  isLoaded: boolean;
  positionMs: number;
  durationMs: number;
  track: AudioTrack | null;
}

type Listener = (state: PlaybackState) => void;

const initialState: PlaybackState = {
  isPlaying: false,
  isLoaded: false,
  positionMs: 0,
  durationMs: 0,
  track: null,
};

let player: AudioPlayer | null = null;
let state: PlaybackState = { ...initialState };
let listeners: Set<Listener> = new Set();
let pollInterval: ReturnType<typeof setInterval> | null = null;

function notify() {
  for (const listener of listeners) {
    listener({ ...state });
  }
}

function startPolling() {
  stopPolling();
  pollInterval = setInterval(() => {
    if (!player || !state.isLoaded) return;
    state = {
      ...state,
      isPlaying: player.playing,
      positionMs: player.currentTime * 1000,
      durationMs: player.duration * 1000,
    };

    // Utwór się skończył
    if (player.currentTime >= player.duration && player.duration > 0) {
      stop();
      return;
    }

    notify();
  }, 500);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

export function loadAndPlay(track: AudioTrack): void {
  // Zwolnij poprzedni player
  if (player) {
    player.remove();
    player = null;
  }
  stopPolling();

  player = createAudioPlayer({ uri: track.uri });
  player.play();

  state = {
    track,
    isPlaying: true,
    isLoaded: true,
    positionMs: 0,
    durationMs: 0,
  };
  notify();
  startPolling();
}

export function togglePlayPause(): void {
  if (!player || !state.isLoaded) return;

  if (player.playing) {
    player.pause();
  } else {
    player.play();
  }
  state = { ...state, isPlaying: !player.paused };
  notify();
}

export function seekTo(positionMs: number): void {
  if (!player || !state.isLoaded) return;
  player.seekTo(positionMs / 1000);
}

export function stop(): void {
  stopPolling();
  if (player) {
    player.pause();
    player.remove();
    player = null;
  }
  state = { ...initialState };
  notify();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  // Natychmiast wyślij aktualny stan
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

export function getState(): PlaybackState {
  return { ...state };
}
