import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useCredits } from '@/contexts/CreditsContext';
import { Colors } from '@/constants/Colors';
import { STARTER_CREDITS } from '@/services/aiModels';

export function LowCreditsWarning() {
  const { credits, isLowCredits } = useCredits();
  const router = useRouter();

  if (!isLowCredits) {
    return null;
  }

  const percentageLeft = Math.round((credits / STARTER_CREDITS) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>⚠️</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Niski stan kredytów</Text>
          <Text style={styles.subtitle}>
            Pozostało tylko {percentageLeft}% ({Math.floor(credits)} 🪙)
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/credits/buy' as any)}
      >
        <Text style={styles.buttonText}>Doładuj</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.warning + '20',
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: Colors.warning,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  button: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
});
