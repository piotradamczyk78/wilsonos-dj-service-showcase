import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Colors } from '@/constants/Colors';
import { useCredits } from '@/contexts/CreditsContext';
import { initIAP, disconnectIAP, fetchProducts, purchaseCredits, type CreditProduct } from '@/services/iapService';

export default function BuyCreditsScreen() {
  const router = useRouter();
  const { credits, addCredits } = useCredits();
  const [products, setProducts] = useState<CreditProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      try {
        await initIAP();
        const fetchedProducts = await fetchProducts();
        setProducts(fetchedProducts);
      } catch (error) {
        console.error('Error loading products:', error);
        Alert.alert('Błąd', 'Nie udało się załadować produktów. Spróbuj ponownie później.');
      } finally {
        setLoading(false);
      }
    }

    loadProducts();

    return () => {
      disconnectIAP();
    };
  }, []);

  const handlePurchase = async (product: CreditProduct) => {
    setPurchasing(true);
    try {
      await purchaseCredits(
        product.productId,
        async (creditsAmount) => {
          // Success
          await addCredits(creditsAmount);
          Alert.alert(
            'Sukces! 🎉',
            `Dodano ${creditsAmount} kredytów do Twojego konta.`,
            [{ text: 'OK', onPress: () => router.back() }]
          );
        },
        (error) => {
          // Error
          Alert.alert('Błąd zakupu', error.message || 'Spróbuj ponownie.');
        }
      );
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Doładuj kredyty</Text>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Aktualny stan:</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceAmount}>{Math.floor(credits)}</Text>
              <Text style={styles.balanceIcon}>🪙</Text>
            </View>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Jak to działa?</Text>
          <Text style={styles.infoText}>
            • Kredyty zużywane są per token AI{'\n'}
            • Różne modele mają różne ceny{'\n'}
            • Gemini Flash: najtańszy (~13k tokenów za 1000 🪙){'\n'}
            • LLM Sonnet: najlepszy, ale droższy (~3k tokenów za 1000 🪙){'\n'}
            • Nieużyte kredyty nie wygasają
          </Text>
        </View>

        {/* Products */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Ładowanie pakietów...</Text>
          </View>
        ) : (
          <View style={styles.productsContainer}>
            {products.map((product) => (
              <TouchableOpacity
                key={product.productId}
                style={[styles.productCard, product.badge && styles.productCardFeatured]}
                onPress={() => handlePurchase(product)}
                disabled={purchasing}
                activeOpacity={0.7}
              >
                {product.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{product.badge}</Text>
                  </View>
                )}

                <View style={styles.productHeader}>
                  <Text style={styles.productCredits}>{product.credits.toLocaleString()} 🪙</Text>
                  <Text style={styles.productPrice}>{product.price}</Text>
                </View>

                <Text style={styles.productDescription}>
                  {product.credits === 1000 && 'Starter - wypróbuj wszystkie modele'}
                  {product.credits === 5000 && 'Popular - najlepsza wartość! 💎'}
                  {product.credits === 10000 && 'Power User - nigdy nie zabraknie Ci kredytów'}
                </Text>

                <View style={styles.buyButton}>
                  <Text style={styles.buyButtonText}>
                    {purchasing ? 'Przetwarzanie...' : 'Kup teraz'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Bezpieczne płatności przez Google Play{'\n'}
            Kredyty dodawane natychmiast po zakupie
          </Text>
        </View>
      </ScrollView>

      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  balanceCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.text,
    marginRight: 8,
  },
  balanceIcon: {
    fontSize: 24,
  },
  infoCard: {
    backgroundColor: Colors.primary + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 16,
  },
  productsContainer: {
    gap: 16,
  },
  productCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  productCardFeatured: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  productCredits: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  productDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  buyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginTop: 32,
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeButtonText: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '300',
  },
});
