import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ProfileProvider } from '../contexts/ProfileContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ProfileProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack initialRouteName="(tabs)">
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="auth" options={{ title: 'Log in' }} />
          <Stack.Screen name="signup" options={{ title: 'Sign up' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ProfileProvider>
  );
}
