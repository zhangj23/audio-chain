import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  apiService,
  Group,
  VideoSubmission,
  WeeklyCompilation,
} from "../services/api";
import { useAuth } from "./AuthContext";

interface GroupsContextType {
  groups: Group[];
  isLoading: boolean;
  error: string | null;
  refreshGroups: () => Promise<void>;
  createGroup: (name: string, description?: string) => Promise<Group>;
  joinGroup: (groupId: number) => Promise<void>;
  leaveGroup: (groupId: number) => Promise<void>;
  getGroupSubmissions: (groupId: number) => Promise<VideoSubmission[]>;
  getGroupCompilations: (groupId: number) => Promise<WeeklyCompilation[]>;
  generateCompilation: (
    groupId: number
  ) => Promise<{ compilation_id: number; status: string }>;
  getCompilationStatus: (
    compilationId: number
  ) => Promise<{ status: string; download_url?: string }>;
}

const GroupsContext = createContext<GroupsContextType | undefined>(undefined);

interface GroupsProviderProps {
  children: ReactNode;
}

export function GroupsProvider({ children }: GroupsProviderProps) {
  const { isAuthenticated, user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshGroups = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const groupsData = await apiService.getGroups();
      setGroups(groupsData);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load groups";
      setError(errorMessage);
      console.error("Failed to load groups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createGroup = async (
    name: string,
    description?: string
  ): Promise<Group> => {
    try {
      setError(null);
      const newGroup = await apiService.createGroup(name, description);
      setGroups((prev) => [newGroup, ...prev]);
      return newGroup;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create group";
      setError(errorMessage);
      throw error;
    }
  };

  const joinGroup = async (groupId: number) => {
    try {
      setError(null);
      await apiService.joinGroup(groupId);
      // Refresh groups to get updated member list
      await refreshGroups();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to join group";
      setError(errorMessage);
      throw error;
    }
  };

  const leaveGroup = async (groupId: number) => {
    try {
      setError(null);
      await apiService.leaveGroup(groupId);
      // Remove group from local state
      setGroups((prev) => prev.filter((group) => group.id !== groupId));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to leave group";
      setError(errorMessage);
      throw error;
    }
  };

  const getGroupSubmissions = async (
    groupId: number
  ): Promise<VideoSubmission[]> => {
    try {
      setError(null);
      return await apiService.getVideoSubmissions(groupId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load submissions";
      setError(errorMessage);
      throw error;
    }
  };

  const getGroupCompilations = async (
    groupId: number
  ): Promise<WeeklyCompilation[]> => {
    try {
      setError(null);
      return await apiService.getCompilations(groupId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load compilations";
      setError(errorMessage);
      throw error;
    }
  };

  const generateCompilation = async (
    groupId: number
  ): Promise<{ compilation_id: number; status: string }> => {
    try {
      setError(null);
      return await apiService.generateCompilation(groupId);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate compilation";
      setError(errorMessage);
      throw error;
    }
  };

  const getCompilationStatus = async (
    compilationId: number
  ): Promise<{ status: string; download_url?: string }> => {
    try {
      setError(null);
      return await apiService.getCompilationStatus(compilationId);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get compilation status";
      setError(errorMessage);
      throw error;
    }
  };

  // Load groups when authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("GroupsContext: User authenticated, loading groups");
      refreshGroups();
    } else {
      console.log("GroupsContext: User not authenticated, clearing groups");
      setGroups([]);
      setError(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const value: GroupsContextType = {
    groups,
    isLoading,
    error,
    refreshGroups,
    createGroup,
    joinGroup,
    leaveGroup,
    getGroupSubmissions,
    getGroupCompilations,
    generateCompilation,
    getCompilationStatus,
  };

  return (
    <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>
  );
}

export function useGroups() {
  const context = useContext(GroupsContext);
  if (context === undefined) {
    throw new Error("useGroups must be used within a GroupsProvider");
  }
  return context;
}
