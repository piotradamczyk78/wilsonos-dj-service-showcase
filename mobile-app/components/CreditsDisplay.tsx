import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useCredits } from '@/contexts/CreditsContext';
import { Colors } from '@/constants/Colors';

export function CreditsDisplay() {
  const { credits, isLowCredits, isLoading } = useCredits();
  const router = useRouter();

  if (isLoading) {
    return null;
  }

  const formattedCredits = credits >= 1000 ? `${(credits / 1000).toFixed(1)}k` : Math.floor(credits);

  return (
    <TouchableOpacity
      style={[styles.container, isLowCredits && styles.containerLow]}
      onPress={() => router.push('/credits/buy' as any)}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>🪙</Text>
      <Text style={[styles.amount, isLowCredits && styles.amountLow]}>{formattedCredits}</Text>
      {isLowCredits && <Text style={styles.warning}>!</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  containerLow: {
    borderColor: Colors.warning,
    backgroundColor: Colors.warning + '20',
  },
  icon: {
    fontSize: 16,
    marginRight: 4,
  },
  amount: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  amountLow: {
    color: Colors.warning,
  },
  warning: {
    color: Colors.warning,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
