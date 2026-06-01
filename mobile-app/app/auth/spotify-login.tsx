import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as AuthSession from 'expo-auth-session';
import { useEffect } from 'react';

import { Colors } from '@/constants/Colors';
import { SPOTIFY_CLIENT_ID } from '@/services/auth';
import { useAuth } from '@/contexts/AuthContext';

const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
];

// Spotify OAuth endpoints
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export default function SpotifyLoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'wilsonos-dj',
    path: 'auth/callback',
  });


  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: SPOTIFY_CLIENT_ID,
      scopes: SPOTIFY_SCOPES,
      usePKCE: true,
      redirectUri,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      handleAuthResponse(response.params);
    } else if (response?.type === 'error') {
      Alert.alert(
        'Błąd logowania',
        response.error?.message || 'Nie udało się zalogować do Spotify.'
      );
    }
  }, [response]);

  async function handleAuthResponse(params: Record<string, string>) {
    const { code } = params;
    if (!code || !request?.codeVerifier) return;

    try {
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: SPOTIFY_CLIENT_ID,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier,
          },
        },
        discovery
      );

      if (tokenResponse.accessToken && tokenResponse.refreshToken) {
        await login(
          tokenResponse.accessToken,
          tokenResponse.refreshToken,
          tokenResponse.expiresIn ?? 3600
        );
        router.back();
      }
    } catch (error) {
      Alert.alert(
        'Błąd wymiany tokenu',
        'Nie udało się uzyskać tokenu dostępu. Spróbuj ponownie.'
      );
    }
  }

  const handleLogin = () => {
    promptAsync();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <FontAwesome name="spotify" size={64} color={Colors.spotifyGreen} />
        <Text style={styles.title}>Połącz ze Spotify</Text>
        <Text style={styles.desc}>
          WilsonOS DJ potrzebuje dostępu do Twoich playlist, aby móc analizować
          Twój profil emocjonalny i proponować spersonalizowaną muzykę.
        </Text>

        <View style={styles.permissions}>
          <Text style={styles.permTitle}>Uprawnienia:</Text>
          <PermissionItem icon="list" text="Odczyt Twoich playlist" />
          <PermissionItem icon="bar-chart" text="Analiza cech audio utworów" />
          <PermissionItem icon="play" text="Sterowanie odtwarzaniem (Premium)" />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, !request && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={!request}>
          {!request ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <FontAwesome name="spotify" size={20} color="#fff" />
              <Text style={styles.loginButtonText}>Zaloguj przez Spotify</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
          <Text style={styles.skipText}>Później</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PermissionItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.permRow}>
      <FontAwesome
        name={icon as any}
        size={14}
        color={Colors.spotifyGreen}
      />
      <Text style={styles.permText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  desc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissions: {
    alignSelf: 'stretch',
    marginBottom: 28,
  },
  permTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  permText: {
    fontSize: 14,
    color: Colors.text,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.spotifyGreen,
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 32,
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});
