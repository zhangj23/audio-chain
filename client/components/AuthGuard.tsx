import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { useAuth } from "../contexts/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // Add a small delay to ensure all contexts are properly initialized
        setTimeout(() => {
          router.replace("/tabs");
        }, 500);
      } else {
        router.replace("/auth");
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <ThemedView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={{ marginTop: 16, fontSize: 16 }}>
          Loading...
        </ThemedText>
      </ThemedView>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to auth
  }

  return <>{children}</>;
}
