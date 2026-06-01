import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme } from '@react-navigation/native';
// @ts-expect-error — ThemeProvider re-exported from @react-navigation/core but types missing
import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { AuthProvider } from '@/contexts/AuthContext';
import { CreditsProvider } from '@/contexts/CreditsContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const WilsonDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.border,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <CreditsProvider>
      <AuthProvider>
        <ThemeProvider value={WilsonDarkTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="auth/spotify-login"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="analysis/[id]"
              options={{
                title: 'Analiza',
                headerStyle: { backgroundColor: Colors.surface },
                headerTintColor: Colors.text,
              }}
            />
            <Stack.Screen
              name="session/[personaId]"
              options={{
                title: 'Sesja DJ',
                headerStyle: { backgroundColor: Colors.surface },
                headerTintColor: Colors.text,
              }}
            />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </CreditsProvider>
  );
}
