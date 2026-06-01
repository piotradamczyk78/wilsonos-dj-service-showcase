import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/Colors';
import { DJ_PERSONAS, DJPersonaId } from '@/constants/DJPersonas';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>{'\u{1F3A7}'}</Text>
        <Text style={styles.heroTitle}>WilsonOS DJ</Text>
        <Text style={styles.heroSubtitle}>
          {isAuthenticated && user
            ? `Cześć, ${user.display_name}!`
            : 'Twój psychologiczny terapeuta muzyczny'}
        </Text>
      </View>

      {isAuthenticated ? (
        <View style={styles.spotifyConnected}>
          <FontAwesome name="check-circle" size={20} color={Colors.spotifyGreen} />
          <Text style={styles.spotifyConnectedText}>
            Połączono ze Spotify{user ? ` — ${user.display_name}` : ''}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.spotifyButton}
          onPress={() => router.push('/auth/spotify-login')}>
          <FontAwesome name="spotify" size={24} color="#fff" />
          <Text style={styles.spotifyButtonText}>Połącz ze Spotify</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Dream Team DJ</Text>
      <View style={styles.personaGrid}>
        {(Object.values(DJ_PERSONAS) as typeof DJ_PERSONAS[DJPersonaId][]).map((persona) => (
          <TouchableOpacity
            key={persona.id}
            style={[
              styles.personaCard,
              { borderColor: Colors[persona.id as keyof typeof Colors] as string || Colors.border },
            ]}>
            <Text style={styles.personaEmoji}>{persona.emoji}</Text>
            <Text style={styles.personaName}>{persona.name}</Text>
            <Text style={styles.personaShort}>{persona.shortDescription}</Text>
            {persona.isPremium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>PRO</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Szybkie akcje</Text>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => router.push('/(tabs)/analysis')}>
        <FontAwesome name="bar-chart" size={20} color={Colors.primary} />
        <View style={styles.actionTextWrap}>
          <Text style={styles.actionTitle}>Analizuj playlist\u0119</Text>
          <Text style={styles.actionDesc}>Poznaj emocjonalny profil swojej muzyki</Text>
        </View>
        <FontAwesome name="chevron-right" size={14} color={Colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => router.push('/(tabs)/session')}>
        <FontAwesome name="headphones" size={20} color={Colors.primary} />
        <View style={styles.actionTextWrap}>
          <Text style={styles.actionTitle}>Nowa sesja DJ</Text>
          <Text style={styles.actionDesc}>Rozpocznij emocjonaln\u0105 podr\u00f3\u017c muzyczn\u0105</Text>
        </View>
        <FontAwesome name="chevron-right" size={14} color={Colors.textMuted} />
      </TouchableOpacity>
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
  hero: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  spotifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.spotifyGreen,
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 30,
    gap: 10,
  },
  spotifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  spotifyConnected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 30,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.spotifyGreen,
  },
  spotifyConnectedText: {
    color: Colors.spotifyGreen,
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    marginTop: 10,
  },
  personaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  personaCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  personaEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  personaName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  personaShort: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  premiumBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.background,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  actionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
