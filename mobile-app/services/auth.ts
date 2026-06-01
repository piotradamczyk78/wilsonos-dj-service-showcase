import * as SecureStore from 'expo-secure-store';

// Spotify credentials — docelowo przenieść do backend proxy (Supabase)
export const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';

const KEYS = {
  ACCESS_TOKEN: 'spotify_access_token',
  REFRESH_TOKEN: 'spotify_refresh_token',
  EXPIRY_TIME: 'spotify_token_expiry',
} as const;

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

export async function saveTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const expiryTime = Date.now() + expiresIn * 1000;
  await Promise.all([
    SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
    SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
    SecureStore.setItemAsync(KEYS.EXPIRY_TIME, expiryTime.toString()),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    SecureStore.deleteItemAsync(KEYS.EXPIRY_TIME),
  ]);
}

export async function isTokenExpired(): Promise<boolean> {
  const expiryStr = await SecureStore.getItemAsync(KEYS.EXPIRY_TIME);
  if (!expiryStr) return true;
  // Odświeżaj 5 minut przed wygaśnięciem
  return Date.now() > parseInt(expiryStr, 10) - 5 * 60 * 1000;
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: SPOTIFY_CLIENT_ID,
      }).toString(),
    });

    if (!response.ok) {
      // Token odrzucony — wyczyść wszystko
      await clearTokens();
      return null;
    }

    const data = await response.json();
    await saveTokens(
      data.access_token,
      data.refresh_token ?? refreshToken,
      data.expires_in
    );
    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Zwraca ważny access token — odświeża automatycznie jeśli wygasł.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const expired = await isTokenExpired();
  if (!expired) {
    return getAccessToken();
  }
  return refreshAccessToken();
}
