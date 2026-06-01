import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPlaylists, type SpotifyPlaylist } from '@/services/spotify';

export default function AnalysisScreen() {
  const router = useRouter();
  const { isAuthenticated, getValidToken } = useAuth();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadPlaylists();
    }
  }, [isAuthenticated]);

  async function loadPlaylists() {
    setLoading(true);
    try {
      const token = await getValidToken();
      if (token) {
        const data = await getUserPlaylists(token);
        setPlaylists(data);
      }
    } catch (error) {
      console.log('Error loading playlists:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.emptyState}>
          <FontAwesome name="bar-chart" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Analiza Playlist</Text>
          <Text style={styles.emptyDesc}>
            Połącz się ze Spotify, aby zobaczyć emocjonalny profil swoich playlist.
          </Text>
          <Text style={styles.emptyHint}>
            Wybierz playlistę → AI DJ przeanalizuje valence, energy i acousticness
            → otrzymasz psychologiczny komentarz
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => router.push('/auth/spotify-login')}>
            <FontAwesome name="spotify" size={20} color="#fff" />
            <Text style={styles.connectButtonText}>Połącz Spotify</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Twoje playlisty</Text>
      <Text style={styles.subtitle}>Wybierz playlistę do analizy psychologicznej</Text>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Ładowanie playlist...</Text>
        </View>
      ) : playlists.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="music" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyDesc}>Nie znaleziono playlist na Twoim koncie.</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadPlaylists}>
            <Text style={styles.refreshText}>Odśwież</Text>
          </TouchableOpacity>
        </View>
      ) : (
        playlists.map((playlist) => (
          <TouchableOpacity
            key={playlist.id}
            style={styles.playlistCard}
            onPress={() => router.push({ pathname: '/analysis/[id]', params: { id: playlist.id, name: playlist.name } })}>
            {playlist.images?.[0]?.url ? (
              <Image source={{ uri: playlist.images[0].url }} style={styles.playlistCover} />
            ) : (
              <View style={styles.playlistImagePlaceholder}>
                <FontAwesome name="music" size={20} color={Colors.textMuted} />
              </View>
            )}
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistName} numberOfLines={1}>{playlist.name}</Text>
              <Text style={styles.playlistMeta}>{playlist.tracks.total} utworów</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={Colors.textMuted} />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  emptyDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 30,
    marginTop: 8,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.spotifyGreen,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 10,
    marginTop: 20,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  playlistCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  playlistImagePlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  playlistMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  refreshButton: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  refreshText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
