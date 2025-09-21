// API configuration for the Weave frontend
export const API_CONFIG = {
  // Base URL for the backend API
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || "http://129.161.69.91:8000",

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
