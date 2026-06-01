/**
 * In-App Purchase Service
 * Handles Google Play consumable products for credits
 */

import * as RNIap from 'react-native-iap';

// Product IDs configured in Google Play Console
export const PRODUCT_IDS = {
  STARTER: 'credits_starter_099', // $0.99 = 1000 credits
  POPULAR: 'credits_popular_499', // $4.99 = 5000 credits
  POWER: 'credits_power_999', // $9.99 = 10000 credits
};

export const PRODUCT_CREDITS = {
  [PRODUCT_IDS.STARTER]: 1000,
  [PRODUCT_IDS.POPULAR]: 5000,
  [PRODUCT_IDS.POWER]: 10000,
};

export interface CreditProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  credits: number;
  badge?: string;
}

let purchaseUpdateSubscription: any = null;
let purchaseErrorSubscription: any = null;

export async function initIAP(): Promise<void> {
  try {
    await RNIap.initConnection();
    console.log('[IAP] Connection initialized');
  } catch (error) {
    console.error('[IAP] Init error:', error);
    throw error;
  }
}

export async function disconnectIAP(): Promise<void> {
  try {
    await RNIap.endConnection();
    if (purchaseUpdateSubscription) {
      purchaseUpdateSubscription.remove();
      purchaseUpdateSubscription = null;
    }
    if (purchaseErrorSubscription) {
      purchaseErrorSubscription.remove();
      purchaseErrorSubscription = null;
    }
    console.log('[IAP] Connection ended');
  } catch (error) {
    console.error('[IAP] Disconnect error:', error);
  }
}

export async function fetchProducts(): Promise<CreditProduct[]> {
  try {
    const products = await (RNIap as any).getProducts({ skus: Object.values(PRODUCT_IDS) });

    return products.map((product: any) => ({
      productId: product.productId,
      title: product.title,
      description: product.description,
      price: product.localizedPrice,
      credits: PRODUCT_CREDITS[product.productId as keyof typeof PRODUCT_CREDITS] || 0,
      badge: product.productId === PRODUCT_IDS.POPULAR ? 'Najlepsza wartość!' : undefined,
    }));
  } catch (error) {
    console.error('[IAP] Fetch products error:', error);
    throw error;
  }
}

export async function purchaseCredits(
  productId: string,
  onSuccess: (credits: number) => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase: any) => {
      console.log('[IAP] Purchase update:', purchase);

      if (purchase.productId === productId) {
        try {
          const credits = PRODUCT_CREDITS[productId as keyof typeof PRODUCT_CREDITS];

          if (credits) {
            onSuccess(credits);
          }

          await RNIap.finishTransaction({ purchase, isConsumable: true });
          console.log('[IAP] Transaction finished');
        } catch (error) {
          console.error('[IAP] Transaction finish error:', error);
          onError(error as Error);
        }
      }
    });

    purchaseErrorSubscription = RNIap.purchaseErrorListener((error: any) => {
      console.error('[IAP] Purchase error:', error);
      onError(new Error(error.message || 'Purchase failed'));
    });

    await (RNIap as any).requestPurchase({ skus: [productId] });
  } catch (error) {
    console.error('[IAP] Purchase request error:', error);
    onError(error as Error);
  }
}

export async function restorePurchases(): Promise<void> {
  console.log('[IAP] Restore purchases called (no-op for consumables)');
}
