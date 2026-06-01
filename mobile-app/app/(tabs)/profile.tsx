import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();

  const avatarUrl = user?.images?.[0]?.url;

  const handleLogout = () => {
    Alert.alert(
      'Wylogowanie',
      'Czy na pewno chcesz odłączyć konto Spotify?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wyloguj',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <FontAwesome name="user" size={32} color={Colors.textMuted} />
          </View>
        )}
        <Text style={styles.name}>
          {user?.display_name || 'Wilson DJ User'}
        </Text>
        {isAuthenticated && user?.email && (
          <Text style={styles.email}>{user.email}</Text>
        )}
        <Text style={styles.plan}>
          Plan: {user?.product === 'premium' ? 'Spotify Premium' : 'Free'}
        </Text>
      </View>

      <TouchableOpacity style={styles.premiumCard}>
        <View>
          <Text style={styles.premiumTitle}>{'\u{1F451}'} Odblokuj Premium</Text>
          <Text style={styles.premiumDesc}>
            4 osobowości AI DJ, nielimitowane analizy, pełne sesje
          </Text>
        </View>
        <FontAwesome name="chevron-right" size={16} color={Colors.highlight} />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Twoje statystyki</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Analizy</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Sesje DJ</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>-</Text>
          <Text style={styles.statLabel}>DNA muzyczne</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Ustawienia</Text>
      {isAuthenticated ? (
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <FontAwesome name="spotify" size={18} color={Colors.spotifyGreen} />
          <Text style={styles.menuText}>Konto Spotify</Text>
          <Text style={[styles.menuStatus, { color: Colors.spotifyGreen }]}>Połączono</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/auth/spotify-login')}>
          <FontAwesome name="spotify" size={18} color={Colors.spotifyGreen} />
          <Text style={styles.menuText}>Konto Spotify</Text>
          <Text style={styles.menuStatus}>Nie połączono</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.menuItem}>
        <FontAwesome name="bell" size={18} color={Colors.textSecondary} />
        <Text style={styles.menuText}>Powiadomienia</Text>
        <FontAwesome name="chevron-right" size={12} color={Colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem}>
        <FontAwesome name="info-circle" size={18} color={Colors.textSecondary} />
        <Text style={styles.menuText}>O aplikacji</Text>
        <FontAwesome name="chevron-right" size={12} color={Colors.textMuted} />
      </TouchableOpacity>

      {isAuthenticated && (
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome name="sign-out" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Wyloguj ze Spotify</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.version}>WilsonOS DJ v1.0.0</Text>
      <Text style={styles.copyright}>octadecimal.pl</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  plan: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.accent,
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: Colors.highlight,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.highlight,
    marginBottom: 4,
  },
  premiumDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  menuStatus: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 30,
  },
  copyright: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
