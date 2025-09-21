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
  videoStats?: {
    group_id: number;
    total_submissions: number;
    unique_submitters: number;
    total_members: number;
    submission_rate: number;
  };
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

export interface GroupInvite {
  id: number;
  group_id: number;
  invited_username: string;
  invited_by: number;
  status: "pending" | "accepted" | "declined" | "expired";
  created_at: string;
  expires_at: string;
  group: {
    id: number;
    name: string;
    description?: string;
  };
  invited_by_user: {
    id: number;
    username: string;
  };
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

    console.log("API Service - Making request:", {
      url,
      method: config.method || "GET",
      headers: config.headers,
      body: config.body,
    });

    // Test basic connectivity first
    try {
      console.log("API Service - Testing connectivity to:", this.baseUrl);
      const healthResponse = await fetch(`${this.baseUrl}/health`);
      console.log(
        "API Service - Health check response:",
        healthResponse.status
      );
    } catch (healthError) {
      console.error("API Service - Health check failed:", healthError);
      throw new Error(
        `Cannot connect to backend at ${this.baseUrl}. Please check if the server is running.`
      );
    }

    try {
      const response = await fetch(url, config);

      console.log("API Service - Response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));
        console.log("API Service - Error response:", errorData);
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("API Service - Success response:", result);
      return result;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      console.error("Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
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
    console.log("API Service - createGroup called with:", {
      name,
      description,
    });
    console.log(
      "API Service - Making request to:",
      `${this.baseUrl}${API_CONFIG.ENDPOINTS.GROUPS.CREATE}`
    );
    console.log("API Service - Base URL:", this.baseUrl);
    console.log("API Service - Token available:", !!this.token);

    try {
      const result = await this.request<Group>(
        API_CONFIG.ENDPOINTS.GROUPS.CREATE,
        {
          method: "POST",
          body: JSON.stringify({ name, description }),
        }
      );

      console.log("API Service - createGroup response:", result);
      return result;
    } catch (error) {
      console.error("API Service - createGroup failed:", error);
      throw error;
    }
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

  async inviteUsers(groupId: number, usernames: string[]): Promise<{
    message: string;
    successful_invites: string[];
    failed_invites: string[];
  }> {
    return this.request<{
      message: string;
      successful_invites: string[];
      failed_invites: string[];
    }>(API_CONFIG.ENDPOINTS.GROUPS.INVITE(groupId), {
      method: "POST",
      body: JSON.stringify({ usernames }),
    });
  }

  async getUsers(): Promise<{
    id: number;
    username: string;
    email: string;
    created_at: string;
  }[]> {
    return this.request<{
      id: number;
      username: string;
      email: string;
      created_at: string;
    }[]>(API_CONFIG.ENDPOINTS.GROUPS.USERS);
  }

  // Invite methods
  async getPendingInvites(): Promise<GroupInvite[]> {
    return this.request<GroupInvite[]>("/groups/pending-invites");
  }

  async acceptInvite(inviteId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/groups/invites/${inviteId}/accept`, {
      method: "POST",
    });
  }

  async declineInvite(inviteId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/groups/invites/${inviteId}/decline`, {
      method: "POST",
    });
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
    duration: number,
    promptId: number = 1
  ): Promise<VideoSubmission> {
    // Upload video directly to backend
    const formData = new FormData();
    formData.append("file", videoFile); // Changed from "video" to "file" to match backend

    // Add query parameters to URL
    const url = new URL(`${this.baseUrl}${API_CONFIG.ENDPOINTS.VIDEOS.UPLOAD}`);
    url.searchParams.append("group_id", groupId.toString());
    url.searchParams.append("prompt_id", promptId.toString());
    url.searchParams.append("duration", duration.toString());

    // Get headers without Content-Type for FormData
    const headers = this.getHeaders();
    delete headers["Content-Type"];

    console.log(
      "API Service - Making video upload request to:",
      url.toString()
    );
    console.log("API Service - Headers:", headers);

    const response = await fetch(url.toString(), {
      method: "POST",
      body: formData,
      headers,
    });

    console.log("API Service - Video upload response status:", response.status);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        console.log("API Service - Video upload error response:", errorData);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("API Service - Video upload success response:", result);
    return result;
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

  async getGroupVideoStats(groupId: number): Promise<{
    group_id: number;
    total_submissions: number;
    unique_submitters: number;
    total_members: number;
    submission_rate: number;
  }> {
    return this.request<{
      group_id: number;
      total_submissions: number;
      unique_submitters: number;
      total_members: number;
      submission_rate: number;
    }>(`/groups/${groupId}/video-stats`);
  }

  async getGroupSubmissions(groupId: number): Promise<VideoSubmission[]> {
    return this.request<VideoSubmission[]>(`/videos/submissions/${groupId}`);
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
