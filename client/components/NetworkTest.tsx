import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { apiService } from "../services/api";
import { API_CONFIG } from "../config/api";

export function NetworkTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const testConnection = async () => {
    setIsLoading(true);
    setResult("Testing...");

    try {
      // Test basic connectivity using the actual API config
      const response = await fetch(`${API_CONFIG.BASE_URL}/`);
      const data = await response.json();
      setResult(`✅ Backend connected: ${JSON.stringify(data)}`);
    } catch (error) {
      setResult(
        `❌ Connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testAuth = async () => {
    setIsLoading(true);
    setResult("Testing auth...");

    try {
      // Test auth endpoint using the actual API config
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          username: "testuser",
          password: "testpass123",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(`✅ Auth endpoint working: ${JSON.stringify(data)}`);
      } else {
        const errorText = await response.text();
        setResult(`❌ Auth endpoint error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      setResult(
        `❌ Auth test failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Test</Text>

      <Text style={styles.debugText}>API URL: {API_CONFIG.BASE_URL}</Text>

      <Text style={styles.debugText}>
        Env URL: {process.env.EXPO_PUBLIC_API_URL || "undefined"}
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={testConnection}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Test Basic Connection</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={testAuth}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Test Auth Endpoint</Text>
      </TouchableOpacity>

      <Text style={styles.result}>{result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f5f5f5",
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
  },
  result: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: "monospace",
  },
  debugText: {
    fontSize: 10,
    fontFamily: "monospace",
    marginBottom: 5,
    color: "#666",
  },
});
