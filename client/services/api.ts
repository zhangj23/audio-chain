// API service for communicating with the Weave backend
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../config/api";

// Types for API responses
export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  created_at: string;
  members: GroupMember[];
  current_prompt?: Prompt;
}

export interface GroupMember {
  id: number;
  user_id: number;
  group_id: number;
  joined_at: string;
  user: User;
}

export interface Prompt {
  id: number;
  text: string;
  group_id: number;
  created_at: string;
  expires_at?: string;
}

export interface VideoSubmission {
  id: number;
  user_id: number;
  group_id: number;
  s3_key: string;
  duration: number;
  created_at: string;
  user: User;
}

export interface WeeklyCompilation {
  id: number;
  group_id: number;
  week_start: string;
  week_end: string;
  status: "processing" | "completed" | "failed";
  s3_key?: string;
  created_at: string;
  completed_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiError {
  detail: string;
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    // Get API URL from configuration
    this.baseUrl = API_CONFIG.BASE_URL;
    this.loadToken();
  }

  private async loadToken() {
    try {
      this.token = await AsyncStorage.getItem("auth_token");
    } catch (error) {
      console.error("Failed to load auth token:", error);
    }
  }

  private async saveToken(token: string) {
    try {
      await AsyncStorage.setItem("auth_token", token);
      // Token is already set in the calling method
    } catch (error) {
      console.error("Failed to save auth token:", error);
    }
  }

  private async clearToken() {
    try {
      await AsyncStorage.removeItem("auth_token");
      this.token = null;
    } catch (error) {
      console.error("Failed to clear auth token:", error);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );

    // Set token immediately before saving to AsyncStorage
    this.token = response.access_token;
    await this.saveToken(response.access_token);
    return response;
  }

  async signup(
    email: string,
    username: string,
    password: string
  ): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      API_CONFIG.ENDPOINTS.AUTH.SIGNUP,
      {
        method: "POST",
        body: JSON.stringify({ email, username, password }),
      }
    );

    // Set token immediately before saving to AsyncStorage
    this.token = response.access_token;
    await this.saveToken(response.access_token);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, { method: "POST" });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      await this.clearToken();
    }
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>(API_CONFIG.ENDPOINTS.AUTH.ME);
  }

  async deleteAccount(password: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      API_CONFIG.ENDPOINTS.AUTH.DELETE_ACCOUNT,
      {
        method: "DELETE",
        body: JSON.stringify({ password }),
      }
    );
  }

  // Group methods
  async getGroups(): Promise<Group[]> {
    return this.request<Group[]>(API_CONFIG.ENDPOINTS.GROUPS.LIST);
  }

  async createGroup(name: string, description?: string): Promise<Group> {
    return this.request<Group>(API_CONFIG.ENDPOINTS.GROUPS.CREATE, {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  }

  async getGroup(groupId: number): Promise<Group> {
    return this.request<Group>(API_CONFIG.ENDPOINTS.GROUPS.GET(groupId));
  }

  async joinGroup(groupId: number): Promise<GroupMember> {
    return this.request<GroupMember>(
      API_CONFIG.ENDPOINTS.GROUPS.JOIN(groupId),
      {
        method: "POST",
      }
    );
  }

  async leaveGroup(groupId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      API_CONFIG.ENDPOINTS.GROUPS.LEAVE(groupId),
      {
        method: "POST",
      }
    );
  }

  // Video methods
  async getVideoSubmissions(groupId: number): Promise<VideoSubmission[]> {
    return this.request<VideoSubmission[]>(
      API_CONFIG.ENDPOINTS.VIDEOS.SUBMISSIONS(groupId)
    );
  }

  async submitVideo(
    groupId: number,
    videoFile: File | Blob,
    duration: number
  ): Promise<VideoSubmission> {
    // Upload video directly to backend
    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("group_id", groupId.toString());
    formData.append("duration", duration.toString());

    const response = await fetch(
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.VIDEOS.UPLOAD}`,
      {
        method: "POST",
        body: formData,
        headers: {
          ...this.getHeaders(),
          // Remove Content-Type to let browser set it for FormData
        },
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  async getCompilations(groupId: number): Promise<WeeklyCompilation[]> {
    return this.request<WeeklyCompilation[]>(
      API_CONFIG.ENDPOINTS.VIDEOS.COMPILATIONS(groupId)
    );
  }

  async generateCompilation(groupId: number): Promise<{
    message: string;
    compilation_id: number;
    status: string;
  }> {
    return this.request<{
      message: string;
      compilation_id: number;
      status: string;
    }>(API_CONFIG.ENDPOINTS.VIDEOS.GENERATE_COMPILATION(groupId), {
      method: "POST",
    });
  }

  async getCompilationStatus(compilationId: number): Promise<{
    status: string;
    download_url?: string;
    error?: string;
  }> {
    return this.request<{
      status: string;
      download_url?: string;
      error?: string;
    }>(API_CONFIG.ENDPOINTS.VIDEOS.COMPILATION_STATUS(compilationId));
  }

  // Music tracks
  async getMusicTracks(): Promise<
    { id: number; name: string; s3_key: string }[]
  > {
    return this.request<{ id: number; name: string; s3_key: string }[]>(
      API_CONFIG.ENDPOINTS.VIDEOS.MUSIC_TRACKS
    );
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  async verifyToken(): Promise<boolean> {
    if (!this.token) return false;

    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      console.error("Token verification failed:", error);
      await this.logout();
      return false;
    }
  }

  async refreshToken(): Promise<void> {
    try {
      await this.getCurrentUser();
      // Token is still valid
    } catch (error) {
      // Token is invalid, clear it
      await this.clearToken();
      throw error;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
