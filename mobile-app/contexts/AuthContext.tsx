import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  saveTokens,
  getAccessToken,
  clearTokens,
  getValidAccessToken,
} from '@/services/auth';
import { getUserProfile } from '@/services/spotify';

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
  product: string; // 'premium' | 'free' | 'open'
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: SpotifyUser | null;
  accessToken: string | null;
}

interface AuthContextValue extends AuthState {
  login: (accessToken: string, refreshToken: string, expiresIn: number) => Promise<void>;
  logout: () => Promise<void>;
  getValidToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    accessToken: null,
  });

  // Przy starcie — sprawdź czy jest zapisany token
  useEffect(() => {
    checkExistingAuth();
  }, []);

  async function checkExistingAuth() {
    try {
      const token = await getValidAccessToken();
      if (token) {
        const profile = await getUserProfile(token);
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: profile,
          accessToken: token,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      // Token nieprawidłowy — wyczyść
      await clearTokens();
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  const login = useCallback(
    async (accessToken: string, refreshToken: string, expiresIn: number) => {
      await saveTokens(accessToken, refreshToken, expiresIn);
      try {
        const profile = await getUserProfile(accessToken);
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: profile,
          accessToken,
        });
      } catch {
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: null,
          accessToken,
        });
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await clearTokens();
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      accessToken: null,
    });
  }, []);

  const getValidToken = useCallback(async () => {
    const token = await getValidAccessToken();
    if (token && token !== state.accessToken) {
      setState((prev) => ({ ...prev, accessToken: token }));
    }
    return token;
  }, [state.accessToken]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        getValidToken,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
