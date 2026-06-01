const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { display_name: string };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    images: { url: string }[];
    release_date: string;
  };
  duration_ms: number;
  popularity: number;
  explicit: boolean;
}

export interface AudioFeatures {
  id: string;
  valence: number;
  energy: number;
  danceability: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  tempo: number;
}

async function spotifyFetch(endpoint: string, accessToken: string) {
  const res = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Spotify API error: ${res.status}`);
  }
  return res.json();
}

export async function getUserPlaylists(
  accessToken: string,
  limit = 50
): Promise<SpotifyPlaylist[]> {
  const data = await spotifyFetch(`/me/playlists?limit=${limit}`, accessToken);
  return data.items;
}

export async function getPlaylistTracks(
  accessToken: string,
  playlistId: string,
  limit = 100
): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch(
    `/playlists/${playlistId}/tracks?limit=${limit}`,
    accessToken
  );
  return data.items.map((item: { track: SpotifyTrack }) => item.track).filter(Boolean);
}

export async function getAudioFeatures(
  accessToken: string,
  trackIds: string[]
): Promise<AudioFeatures[]> {
  // Spotify allows max 100 IDs per request
  const chunks: string[][] = [];
  for (let i = 0; i < trackIds.length; i += 100) {
    chunks.push(trackIds.slice(i, i + 100));
  }

  const results: AudioFeatures[] = [];
  for (const chunk of chunks) {
    const data = await spotifyFetch(
      `/audio-features?ids=${chunk.join(',')}`,
      accessToken
    );
    results.push(...(data.audio_features || []).filter(Boolean));
  }
  return results;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
}

export async function getArtists(
  accessToken: string,
  artistIds: string[]
): Promise<SpotifyArtist[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < artistIds.length; i += 50) {
    chunks.push(artistIds.slice(i, i + 50));
  }

  const results: SpotifyArtist[] = [];
  for (const chunk of chunks) {
    const data = await spotifyFetch(
      `/artists?ids=${chunk.join(',')}`,
      accessToken
    );
    results.push(...(data.artists || []).filter(Boolean));
  }
  return results;
}

export async function getCurrentPlayback(accessToken: string) {
  try {
    return await spotifyFetch('/me/player', accessToken);
  } catch {
    return null;
  }
}

export async function getUserProfile(accessToken: string) {
  return spotifyFetch('/me', accessToken);
}

/**
 * Pobiera pełny kontekst playlist usera dla DJ-a.
 * Ładuje tracki z wybranych playlist (top 5 po wielkości) + zwraca podsumowanie.
 */
export async function getPlaylistSummaryForDJ(accessToken: string): Promise<string> {
  try {
    const playlists = await getUserPlaylists(accessToken, 20);
    if (playlists.length === 0) return '';

    // Podsumowanie wszystkich playlist
    const playlistLines = playlists.map(
      (p) => `- "${p.name}" (${p.tracks.total} utworów)`
    );
    let context = `PLAYLISTY UŻYTKOWNIKA NA SPOTIFY (${playlists.length}):\n${playlistLines.join('\n')}`;

    // Załaduj szczegóły z top 3 największych playlist (limit 30 tracków per playlista żeby nie przepalić kontekstu)
    const sorted = [...playlists].sort((a, b) => b.tracks.total - a.tracks.total);
    const toLoad = sorted.slice(0, 3);

    for (const pl of toLoad) {
      try {
        const tracks = await getPlaylistTracks(accessToken, pl.id, 30);
        if (tracks.length === 0) continue;

        const trackLines = tracks.map((t) => {
          const artists = t.artists.map((a) => a.name).join(', ');
          const year = t.album.release_date?.substring(0, 4) || '?';
          return `  - ${artists} — "${t.name}" (${year}, pop:${t.popularity})`;
        });

        context += `\n\nPLAYLISTA "${pl.name}" — UTWORY (${tracks.length}/${pl.tracks.total}):\n${trackLines.join('\n')}`;
      } catch {
        // Skip playlist if loading fails
      }
    }

    return context;
  } catch {
    return '';
  }
}

/**
 * Tworzy nową playlistę na Spotify z podanymi trackami.
 */
export async function createPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  description: string,
  trackUris: string[]
): Promise<{ id: string; externalUrl: string } | null> {
  try {
    // Utwórz playlistę
    const createRes = await fetch(`${SPOTIFY_API_BASE}/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        public: false,
      }),
    });
    if (!createRes.ok) return null;
    const playlist = await createRes.json();

    // Dodaj utwory
    if (trackUris.length > 0) {
      await fetch(`${SPOTIFY_API_BASE}/playlists/${playlist.id}/tracks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: trackUris }),
      });
    }

    return {
      id: playlist.id,
      externalUrl: playlist.external_urls?.spotify || '',
    };
  } catch {
    return null;
  }
}

/**
 * Pobiera ostatnio słuchane utwory.
 */
export async function getRecentlyPlayed(
  accessToken: string,
  limit = 20
): Promise<{ track: SpotifyTrack; played_at: string }[]> {
  const data = await spotifyFetch(
    `/me/player/recently-played?limit=${limit}`,
    accessToken
  );
  return data.items || [];
}

/**
 * Szuka utworu na Spotify — zwraca URI do odtworzenia.
 */
/**
 * Odtwórz listę utworów na aktywnym urządzeniu Spotify.
 */
export async function playTracks(
  accessToken: string,
  trackUris: string[]
): Promise<boolean> {
  try {
    const res = await fetch(`${SPOTIFY_API_BASE}/me/player/play`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: trackUris }),
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

/**
 * Dodaj utwór do kolejki na aktywnym urządzeniu.
 */
export async function addToQueue(
  accessToken: string,
  trackUri: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${SPOTIFY_API_BASE}/me/player/queue?uri=${encodeURIComponent(trackUri)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

/**
 * Przewiń do pozycji w aktualnie grającym utworze (ms).
 */
export async function seekToPosition(
  accessToken: string,
  positionMs: number
): Promise<boolean> {
  try {
    const res = await fetch(
      `${SPOTIFY_API_BASE}/me/player/seek?position_ms=${positionMs}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

export async function searchTrack(
  accessToken: string,
  query: string
): Promise<{ id: string; name: string; artists: string; uri: string; externalUrl: string } | null> {
  try {
    const data = await spotifyFetch(
      `/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
      accessToken
    );
    const track = data.tracks?.items?.[0];
    if (!track) return null;
    return {
      id: track.id,
      name: track.name,
      artists: track.artists.map((a: { name: string }) => a.name).join(', '),
      uri: track.uri,
      externalUrl: track.external_urls?.spotify || '',
    };
  } catch {
    return null;
  }
}
