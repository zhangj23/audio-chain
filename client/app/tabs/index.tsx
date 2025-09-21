import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GroupDetail } from "@/components/group-detail";
import { CreateGroupModal } from "@/components/create-group-modal";
import { InvitesModal } from "@/components/invites-modal";
import { useGroups } from "@/contexts/GroupsContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiService, GroupInvite } from "@/services/api";

export default function HomeScreen() {
  const router = useRouter();
  const { groups, isLoading, error, refreshGroups, createGroup } = useGroups();
  const { user } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInvitesModal, setShowInvitesModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submittedVideos] = useState<{
    [groupId: string]: any;
  }>({});
  const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<GroupInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [lastOpened, setLastOpened] = useState<Record<number, number>>({});

  const LAST_OPENED_STORAGE_KEY = "weave_groups_last_opened";
  const SUBMISSIONS_KEY = "weave_prev_submission_counts";
  const DEADLINE_NOTIFS_KEY = "weave_deadline_notifs";
  const [prevSubmissionCounts, setPrevSubmissionCounts] = useState<Record<number, number>>({});
  const [scheduledDeadlines, setScheduledDeadlines] = useState<Record<number, number>>({});

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshGroups();
    await fetchPendingInvites();
    await loadLastOpened();
    setRefreshing(false);
  };

  const fetchPendingInvites = async () => {
    try {
      setInvitesLoading(true);
      const invites = await apiService.getPendingInvites();
      setPendingInvites(invites);
    } catch (error) {
      console.error("Failed to fetch pending invites:", error);
    } finally {
      setInvitesLoading(false);
    }
  };

  // Fetch invites on component mount
  React.useEffect(() => {
    fetchPendingInvites();
    loadLastOpened();
    loadPrevSubmissionCounts();
    loadScheduledDeadlines();
  }, []);

  const loadPrevSubmissionCounts = async () => {
    try {
      const raw = await AsyncStorage.getItem(SUBMISSIONS_KEY);
      if (raw) setPrevSubmissionCounts(JSON.parse(raw) || {});
    } catch {}
  };

  const savePrevSubmissionCounts = async (data: Record<number, number>) => {
    setPrevSubmissionCounts(data);
    try {
      await AsyncStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(data));
    } catch {}
  };

  const loadScheduledDeadlines = async () => {
    try {
      const raw = await AsyncStorage.getItem(DEADLINE_NOTIFS_KEY);
      if (raw) setScheduledDeadlines(JSON.parse(raw) || {});
    } catch {}
  };

  const saveScheduledDeadlines = async (data: Record<number, number>) => {
    setScheduledDeadlines(data);
    try {
      await AsyncStorage.setItem(DEADLINE_NOTIFS_KEY, JSON.stringify(data));
    } catch {}
  };

  const loadLastOpened = async () => {
    try {
      const raw = await AsyncStorage.getItem(LAST_OPENED_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setLastOpened(parsed || {});
      }
    } catch (e) {
      console.error("Failed to load last opened map", e);
    }
  };

  const updateLastOpened = async (groupId: number) => {
    try {
      const now = Date.now();
      setLastOpened((prev) => {
        const next = { ...prev, [groupId]: now };
        AsyncStorage.setItem(LAST_OPENED_STORAGE_KEY, JSON.stringify(next)).catch(
          () => {}
        );
        return next;
      });
    } catch (e) {
      // Non-fatal
    }
  };

  const fetchUserSubmissions = async (groupId: number) => {
    try {
      const submissions = await apiService.getGroupSubmissions(groupId);
      setUserSubmissions(submissions);
    } catch (error) {
      console.error("Failed to fetch user submissions:", error);
      setUserSubmissions([]);
    }
  };

  const handleCreateGroup = async (groupData: {
    name: string;
    prompt: string;
    deadline: string;
    members: string[];
  }) => {
    try {
      console.log("HomeScreen - Creating group with data:", groupData);
      const newGroup = await createGroup(
        groupData.name,
        groupData.prompt,
        groupData.deadline
      );
      console.log("HomeScreen - Group created successfully:", newGroup);
      setShowCreateModal(false);
    } catch (error) {
      console.error("HomeScreen - Error creating group:", error);
      // Error handling is done in the context
    }
  };

  const handleGroupPress = (group: any) => {
    updateLastOpened(group.id);
    setSelectedGroup(group);
    fetchUserSubmissions(group.id);
  };

  // Poll for other members' submissions and notify on increases
  React.useEffect(() => {
    let isMounted = true;
    const poll = async () => {
      if (!user || !groups || groups.length === 0) return;
      const map: Record<number, number> = { ...prevSubmissionCounts };
      for (const g of groups) {
        try {
          const subs = await apiService.getGroupSubmissions(g.id);
          const othersCount = subs.filter((s: any) => s.user_id !== user.id).length;
          const prev = map[g.id] || 0;
          if (othersCount > prev) {
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "New video posted",
                  body: `${othersCount - prev} new video(s) in ${g.name}`,
                },
                trigger: null,
              });
            } catch {}
          }
          map[g.id] = othersCount;
        } catch {}
      }
      if (isMounted) await savePrevSubmissionCounts(map);
    };

    poll();
    const id = setInterval(poll, 120000);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, user]);

  // Schedule deadline reminders (1 hour before deadline)
  React.useEffect(() => {
    const schedule = async () => {
      if (!groups || groups.length === 0) return;
      const now = Date.now();
      const updated: Record<number, number> = { ...scheduledDeadlines };
      for (const g of groups) {
        if (!g.deadline_at) continue;
        const deadlineMs = new Date(g.deadline_at).getTime();
        const triggerMs = deadlineMs - 60 * 60 * 1000;
        if (triggerMs > now && updated[g.id] !== triggerMs) {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Reminder to post",
                body: `Don't forget to post in ${g.name} before the deadline!`,
              },
              trigger: new Date(triggerMs),
            });
            updated[g.id] = triggerMs;
          } catch {}
        }
      }
      await saveScheduledDeadlines(updated);
    };

    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Loading groups...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Error: {error}</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={refreshGroups}>
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* StatusBar handled at root */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header inside scroll so it scrolls with content */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowInvitesModal(true)}
          >
            <IconSymbol name="bell" size={20} color="#007AFF" />
          </TouchableOpacity>
          <ThemedText style={styles.title}>Weave</ThemedText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <IconSymbol name="plus" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Invites Notification */}
        {pendingInvites.length > 0 && (
          <View style={styles.invitesNotification}>
            <View style={styles.invitesContent}>
              <View style={styles.invitesInfo}>
                <IconSymbol name="bell" size={20} color="#007AFF" />
                <ThemedText style={styles.invitesText}>Notifications</ThemedText>
              </View>
              <TouchableOpacity
                style={styles.viewInvitesButton}
                onPress={() => setShowInvitesModal(true)}
              >
                <ThemedText style={styles.viewInvitesButtonText}>Notifications</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Groups List */}
        <View style={styles.groupsList}>
          {groups.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="person.2" size={48} color="#8E8E93" />
              <ThemedText style={styles.emptyTitle}>No groups yet</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Create your first group to start sharing videos with friends
              </ThemedText>
              <TouchableOpacity
                style={styles.createFirstGroupButton}
                onPress={() => setShowCreateModal(true)}
              >
                <ThemedText style={styles.createFirstGroupButtonText}>
                  Create Group
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            [...groups]
              .sort((a: any, b: any) => {
                const ta = lastOpened[a.id] || 0;
                const tb = lastOpened[b.id] || 0;
                if (tb !== ta) return tb - ta; // most recently opened first
                // fallback: newest created first
                const ca = new Date(a.created_at).getTime() || 0;
                const cb = new Date(b.created_at).getTime() || 0;
                return cb - ca;
              })
              .map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.groupCard}
                onPress={() => handleGroupPress(group)}
              >
                <View style={styles.groupHeader}>
                  <ThemedText style={styles.groupName}>{group.name}</ThemedText>
                  <IconSymbol name="chevron.right" size={16} color="#8E8E93" />
                </View>
                <ThemedText style={styles.groupDescription}>
                  {group.description || "No description"}
                </ThemedText>
                {group.deadline_at && (
                  <ThemedText style={styles.groupDeadline}>
                    Deadline:{" "}
                    {new Date(group.deadline_at).toLocaleString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </ThemedText>
                )}
                <View style={styles.groupStats}>
                  <View style={styles.stat}>
                    <IconSymbol name="person.2" size={14} color="#8E8E93" />
                    <ThemedText style={styles.statText}>
                      {(group.members || []).length} members
                    </ThemedText>
                  </View>
                  <View style={styles.stat}>
                    <IconSymbol name="video" size={14} color="#8E8E93" />
                    <ThemedText style={styles.statText}>
                      {group.videoStats?.total_submissions || 0} videos
                    </ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
              ))
          )}
        </View>
      </ScrollView>

      {/* Group Detail Modal */}
      <Modal
        visible={selectedGroup !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedGroup && (
          <GroupDetail
            group={selectedGroup}
            onBack={() => setSelectedGroup(null)}
            onRecord={(groupId) => {
              setSelectedGroup(null);
              router.push("/tabs/record");
            }}
            onWatchVideos={(group) => {
              setSelectedGroup(null);
              // TODO: Navigate to watch videos
            }}
            onRefresh={refreshGroups}
            submittedVideo={
              selectedGroup ? submittedVideos[selectedGroup.id] || null : null
            }
            currentUserId={user?.id}
            userSubmissions={userSubmissions}
          />
        )}
      </Modal>

      {/* Create Group Modal */}
      <CreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateGroup={handleCreateGroup}
      />

      {/* Invites Modal */}
      <InvitesModal
        visible={showInvitesModal}
        onClose={() => setShowInvitesModal(false)}
        onInviteAccepted={() => {
          fetchPendingInvites();
          refreshGroups();
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100, // Add bottom padding to prevent content from being cut off by tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    marginBottom: 10, // Add bottom margin for better spacing
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    flex: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  groupsList: {
    paddingHorizontal: 20,
    paddingTop: 10, // Add top padding for better spacing
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 24,
  },
  createFirstGroupButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstGroupButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  groupCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  groupDescription: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 12,
  },
  groupDeadline: {
    fontSize: 12,
    color: "#ccc",
    marginTop: -4,
    marginBottom: 8,
  },
  groupStats: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "#8E8E93",
  },
  invitesNotification: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  invitesContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  invitesInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  invitesText: {
    fontSize: 16,
    color: "#fff",
    marginLeft: 8,
    fontWeight: "500",
  },
  viewInvitesButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewInvitesButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
