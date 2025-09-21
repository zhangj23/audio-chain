// API configuration for the Weave frontend
import Constants from "expo-constants";
import { Platform } from "react-native";

function getDefaultBaseUrl(): string {
  try {
    const expoGoConfig: any = (Constants as any).expoGoConfig || {};
    const expoConfig: any = (Constants as any).expoConfig || {};
    const hostFromDebugger: string | undefined = expoGoConfig.debuggerHost;
    const hostFromConfig: string | undefined = expoConfig.hostUri;
    const host = (hostFromDebugger || hostFromConfig || "").split(":")[0];
    if (host) {
      // On Android emulator, "localhost" points to the emulator, not host machine
      if (
        Platform.OS === "android" &&
        (host === "localhost" || host === "127.0.0.1")
      ) {
        return "http://10.0.2.2:8000";
      }
      return `http://${host}:8000`;
    }
  } catch (_) {
    // ignore
  }
  // Sensible platform-specific fallbacks
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }
  return "http://localhost:8000";
}

export const API_CONFIG = {
  // Base URL for the backend API (prefer env var; fallback to device's LAN host)
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || getDefaultBaseUrl(),

  // Development settings
  SKIP_AUTH: process.env.EXPO_PUBLIC_SKIP_AUTH === "true",

  // API endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: "/auth/login",
      SIGNUP: "/auth/register",
      LOGOUT: "/auth/logout",
      ME: "/auth/me",
      DELETE_ACCOUNT: "/auth/account",
    },
    GROUPS: {
      LIST: "/groups/my-groups",
      CREATE: "/groups/create",
      GET: (id: number) => `/groups/${id}`,
      JOIN: (id: number) => `/groups/join`,
      LEAVE: (id: number) => `/groups/${id}/leave`,
      INVITE: (id: number) => `/groups/${id}/invite`,
      USERS: "/groups/users",
    },
    VIDEOS: {
      SUBMISSIONS: (groupId: number) => `/videos/submissions/${groupId}`,
      UPLOAD: "/videos/upload",
      COMPILATIONS: (groupId: number) => `/videos/compilations/${groupId}`,
      GENERATE_COMPILATION: (groupId: number) =>
        `/videos/generate-compilation/${groupId}`,
      COMPILATION_STATUS: (compilationId: number) =>
        `/videos/compilation-status/${compilationId}`,
      MUSIC_TRACKS: "/videos/music-tracks",
    },
  },

  // Request timeout (in milliseconds)
  TIMEOUT: 10000,

  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000,
  },
};

export default API_CONFIG;
