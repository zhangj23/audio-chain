import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ProfileProvider } from "../contexts/ProfileContext";
import { AuthProvider } from "../contexts/AuthContext";
import { GroupsProvider } from "../contexts/GroupsContext";
import { AuthGuard } from "../components/AuthGuard";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootLayoutInner />
    </SafeAreaProvider>
  );
}

function RootLayoutInner() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    (async () => {
      try {
        await Notifications.requestPermissionsAsync();
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  return (
    <AuthProvider>
      <GroupsProvider>
        <ProfileProvider>
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }} edges={["top"]}>
              <Stack initialRouteName="index">
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen
                name="auth"
                options={{ title: "Log in", headerShown: false }}
              />
              <Stack.Screen
                name="signup"
                options={{ title: "Sign up", headerShown: false }}
              />
              <Stack.Screen name="tabs" options={{ headerShown: false }} />
              <Stack.Screen
                name="settings"
                options={{
                  title: "Settings",
                  headerShown: false,
                  presentation: "card",
                }}
              />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
              </Stack>
              <StatusBar style="light" backgroundColor="#000" translucent={false} />
            </SafeAreaView>
          </ThemeProvider>
        </ProfileProvider>
      </GroupsProvider>
    </AuthProvider>
  );
}
