import { useState } from "react";
import { StyleSheet, TextInput, View, TouchableOpacity } from "react-native";
import { Link, useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function SignupScreen() {
  const router = useRouter();
  const SKIP_AUTH =
    String(process.env.EXPO_PUBLIC_SKIP_AUTH || "").toLowerCase() === "true";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const onSignup = () => {
    if (SKIP_AUTH) {
      router.replace("/(tabs)");
      return;
    }
    console.log("Signup pressed", { username, password });
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Create account</ThemedText>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
          returnKeyType="next"
          textContentType="username"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          textContentType="password"
        />

        <TouchableOpacity style={styles.button} onPress={onSignup}>
          <ThemedText type="defaultSemiBold" style={styles.buttonText}>
            Sign Up
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <ThemedText>Already have an account? </ThemedText>
        <Link href="/auth">
          <ThemedText type="link">Log in</ThemedText>
        </Link>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 24,
  },
  form: {
    width: "100%",
    gap: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "white",
  },
  button: {
    height: 48,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "white",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
