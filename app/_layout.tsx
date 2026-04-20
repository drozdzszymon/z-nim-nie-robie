import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { activateKeepAwakeAsync, useKeepAwake } from 'expo-keep-awake';

import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Critical: keep the screen on at the root level so the timer screen never dims,
  // even if a child screen unmounts/remounts during navigation.
  useKeepAwake('BJJ_TIMER_ROOT');

  useEffect(() => {
    // Belt-and-suspenders explicit activation in case the hook is delayed by Suspense/StrictMode.
    activateKeepAwakeAsync('BJJ_TIMER_ROOT_ASYNC').catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
