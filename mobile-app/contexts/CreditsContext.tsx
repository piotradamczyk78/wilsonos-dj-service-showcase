import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STARTER_CREDITS, type AIModel } from '@/services/aiModels';
import { calculateCreditCost } from '@/services/aiModels';

interface CreditsContextType {
  credits: number;
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  deductCredits: (inputTokens: number, outputTokens: number, model: AIModel) => Promise<void>;
  addCredits: (amount: number) => Promise<void>;
  hasEnoughCredits: (model: AIModel, estimatedTokens: number) => boolean;
  isLowCredits: boolean;
  isLoading: boolean;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CREDITS: '@wilsonos_credits',
  SELECTED_MODEL: '@wilsonos_selected_model',
};

const LOW_CREDITS_THRESHOLD = 0.1; // 10% of starter pack

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState(STARTER_CREDITS);
  const [selectedModel, setSelectedModelState] = useState<AIModel>('gemini-flash-2.0');
  const [isLoading, setIsLoading] = useState(true);

  // Load credits and selected model from storage on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [storedCredits, storedModel] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CREDITS),
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_MODEL),
        ]);

        if (storedCredits) {
          setCredits(parseFloat(storedCredits));
        }
        if (storedModel) {
          setSelectedModelState(storedModel as AIModel);
        }
      } catch (error) {
        console.error('Error loading credits data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Save credits to storage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.CREDITS, credits.toString()).catch((error) =>
        console.error('Error saving credits:', error)
      );
    }
  }, [credits, isLoading]);

  // Save selected model to storage whenever it changes
  const setSelectedModel = async (model: AIModel) => {
    setSelectedModelState(model);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, model);
    } catch (error) {
      console.error('Error saving selected model:', error);
    }
  };

  // Deduct credits based on actual token usage
  const deductCredits = async (inputTokens: number, outputTokens: number, model: AIModel) => {
    const cost = calculateCreditCost(model, inputTokens, outputTokens);
    setCredits((prev) => Math.max(0, prev - cost));
    console.log(
      `[CREDITS] Deducted ${cost} credits (${inputTokens} input + ${outputTokens} output tokens on ${model}). Remaining: ${credits - cost}`
    );
  };

  // Add credits (from purchase)
  const addCredits = async (amount: number) => {
    setCredits((prev) => prev + amount);
    console.log(`[CREDITS] Added ${amount} credits. New balance: ${credits + amount}`);
  };

  // Check if user has enough credits for estimated usage
  const hasEnoughCredits = (model: AIModel, estimatedTokens: number) => {
    const estimatedCost = calculateCreditCost(model, estimatedTokens, estimatedTokens);
    return credits >= estimatedCost;
  };

  const isLowCredits = credits <= STARTER_CREDITS * LOW_CREDITS_THRESHOLD;

  return (
    <CreditsContext.Provider
      value={{
        credits,
        selectedModel,
        setSelectedModel,
        deductCredits,
        addCredits,
        hasEnoughCredits,
        isLowCredits,
        isLoading,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (!context) {
    throw new Error('useCredits must be used within CreditsProvider');
  }
  return context;
}
