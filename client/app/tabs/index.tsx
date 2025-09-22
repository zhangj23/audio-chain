import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
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
import { NotificationsModal } from "@/components/notifications-modal";
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
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
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
  const SEEN_NOTIFICATIONS_KEY = "weave_seen_notifications";
  const [prevSubmissionCounts, setPrevSubmissionCounts] = useState<Record<number, number>>({});
  const [scheduledDeadlines, setScheduledDeadlines] = useState<Record<number, number>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [seenNotifications, setSeenNotifications] = useState<Set<string>>(new Set());
  const [isGeneratingNotifications, setIsGeneratingNotifications] = useState(false);

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
      console.log("Fetched pending invites:", invites);

      // Filter out any undefined or invalid invites
      const validInvites = invites.filter(
        (invite) =>
          invite && invite.id && invite.group_id && invite.invited_username
      );

      console.log("Valid invites after filtering:", validInvites);
      setPendingInvites(validInvites);
      
      // Generate notifications from invites
      await generateNotifications(validInvites);
    } catch (error) {
      console.error("Failed to fetch pending invites:", error);
      setPendingInvites([]);
    } finally {
      setInvitesLoading(false);
    }
  };

  const generateNotifications = async (invites: GroupInvite[]) => {
    if (isGeneratingNotifications) return; // Prevent concurrent execution
    
    setIsGeneratingNotifications(true);
    const notificationList: any[] = [];
    
    try {
      // First, clean up any existing invite notifications for invites that no longer exist
      const currentInviteIds = new Set(invites.map(invite => invite.id));
      setNotifications(prev => {
        const filtered = prev.filter(notification => {
          if (notification.type === "invite" && notification.inviteId) {
            return currentInviteIds.has(notification.inviteId);
          }
          return true; // Keep non-invite notifications
        });
        console.log(`Cleaned up invite notifications, removed ${prev.length - filtered.length} stale notifications`);
        return filtered;
      });
    
      // Add invite notifications (only if not already seen)
      invites.forEach((invite) => {
        const notificationId = `invite-${invite.id}`;
        if (!seenNotifications.has(notificationId)) {
          notificationList.push({
            id: notificationId,
            type: "invite",
            title: "Group Invitation",
            message: `${invite.invited_by_user?.username || "Someone"} invited you to join "${invite.group?.name || "a group"}"`,
            timestamp: invite.created_at,
            groupName: invite.group?.name,
            userName: invite.invited_by_user?.username,
            groupId: invite.group_id,
            inviteId: invite.id,
            isRead: false,
          });
        }
      });

    // Add submission notifications - check actual submission data
    for (const group of groups) {
      if (group.videoStats && group.videoStats.total_submissions > 0) {
        try {
          // Fetch actual submissions for this group
          const submissions = await apiService.getGroupSubmissions(group.id);
          
          // Filter out submissions from the current user
          const otherUserSubmissions = submissions.filter((submission: any) => 
            submission.user_id !== user?.id
          );
          
          // Only create notification if there are submissions from other users
          if (otherUserSubmissions.length > 0) {
            // Get the most recent submission from other users
            const latestSubmission = otherUserSubmissions.sort((a: any, b: any) => 
              new Date(b.submitted_at || b.created_at).getTime() - new Date(a.submitted_at || a.created_at).getTime()
            )[0];
            
            const notificationId = `submission-${group.id}-${latestSubmission.id}`;
            
            // Only add if not already seen
            if (!seenNotifications.has(notificationId)) {
              // Get username from submission data (now includes user info from backend)
              const username = latestSubmission.user?.username || "Someone";
              
              notificationList.push({
                id: notificationId,
                type: "submission",
                title: "New Video Posted",
                message: `${username} posted a video in "${group.name}"`,
                timestamp: latestSubmission.submitted_at || latestSubmission.created_at,
                groupName: group.name,
                groupId: group.id,
                userName: username,
                isRead: false,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to fetch submissions for group ${group.id}:`, error);
        }
      }
    }

    // Add deadline notifications (only if not already seen)
    groups.forEach((group) => {
      if (group.deadline_at) {
        const deadline = new Date(group.deadline_at);
        const now = new Date();
        const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 24) {
          const notificationId = `deadline-${group.id}`;
          if (!seenNotifications.has(notificationId)) {
            notificationList.push({
              id: notificationId,
              type: "deadline",
              title: "Deadline Reminder",
              message: `"${group.name}" deadline is ${Math.round(hoursUntilDeadline)} hours away`,
              timestamp: new Date().toISOString(),
              groupName: group.name,
              groupId: group.id,
              isRead: false,
            });
          }
        }
      }
    });

    // Remove duplicates based on ID
    const uniqueNotifications = notificationList.filter((notification, index, self) => 
      index === self.findIndex(n => n.id === notification.id)
    );
    
    // Sort by timestamp (newest first)
    uniqueNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setNotifications(uniqueNotifications);
    } catch (error) {
      console.error("Error generating notifications:", error);
    } finally {
      setIsGeneratingNotifications(false);
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
    
    // Mark as seen in persistent storage
    const newSeenNotifications = new Set(seenNotifications);
    newSeenNotifications.add(notificationId);
    setSeenNotifications(newSeenNotifications);
    saveSeenNotifications(newSeenNotifications);
  };

  const handleAcceptInvite = async (inviteId: number) => {
    try {
      await apiService.acceptInvite(inviteId);
      
      // Show success message
      Alert.alert("Success", "You've joined the group!");
      
      // Refresh groups to show the new group
      await refreshGroups();
      
      // Refresh invites to remove the accepted invite
      await fetchPendingInvites();
      
      // Mark the notification as seen to remove it from the list
      const notificationId = `invite-${inviteId}`;
      console.log(`Accepting invite ${inviteId}, removing notification ${notificationId}`);
      const newSeenNotifications = new Set(seenNotifications);
      newSeenNotifications.add(notificationId);
      setSeenNotifications(newSeenNotifications);
      saveSeenNotifications(newSeenNotifications);
      
      // Remove the notification from the current notifications list
      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== notificationId);
        console.log(`Removed notification ${notificationId}, remaining: ${filtered.length}`);
        return filtered;
      });
      
      // Close the notifications modal
      setShowNotificationsModal(false);
    } catch (error) {
      console.error("Failed to accept invite:", error);
      
      // Check if the error is because invite was already processed
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already processed") || errorMessage.includes("not found")) {
        // Invite was already processed, just remove the notification
        const notificationId = `invite-${inviteId}`;
        console.log(`Invite ${inviteId} already processed, removing notification ${notificationId}`);
        
        // Mark as seen and remove from list
        const newSeenNotifications = new Set(seenNotifications);
        newSeenNotifications.add(notificationId);
        setSeenNotifications(newSeenNotifications);
        saveSeenNotifications(newSeenNotifications);
        
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setShowNotificationsModal(false);
        
        Alert.alert("Info", "This invite has already been processed.");
      } else {
        Alert.alert("Error", "Failed to accept invite. Please try again.");
      }
    }
  };

  const handleDeclineInvite = async (inviteId: number) => {
    try {
      await apiService.declineInvite(inviteId);
      
      // Show success message
      Alert.alert("Success", "Invite declined.");
      
      // Refresh invites to remove the declined invite
      await fetchPendingInvites();
      
      // Mark the notification as seen to remove it from the list
      const notificationId = `invite-${inviteId}`;
      console.log(`Declining invite ${inviteId}, removing notification ${notificationId}`);
      const newSeenNotifications = new Set(seenNotifications);
      newSeenNotifications.add(notificationId);
      setSeenNotifications(newSeenNotifications);
      saveSeenNotifications(newSeenNotifications);
      
      // Remove the notification from the current notifications list
      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== notificationId);
        console.log(`Removed notification ${notificationId}, remaining: ${filtered.length}`);
        return filtered;
      });
      
      // Close the notifications modal
      setShowNotificationsModal(false);
    } catch (error) {
      console.error("Failed to decline invite:", error);
      
      // Check if the error is because invite was already processed
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already processed") || errorMessage.includes("not found")) {
        // Invite was already processed, just remove the notification
        const notificationId = `invite-${inviteId}`;
        console.log(`Invite ${inviteId} already processed, removing notification ${notificationId}`);
        
        // Mark as seen and remove from list
        const newSeenNotifications = new Set(seenNotifications);
        newSeenNotifications.add(notificationId);
        setSeenNotifications(newSeenNotifications);
        saveSeenNotifications(newSeenNotifications);
        
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setShowNotificationsModal(false);
        
        Alert.alert("Info", "This invite has already been processed.");
      } else {
        Alert.alert("Error", "Failed to decline invite. Please try again.");
      }
    }
  };

  const handleNotificationPress = async (notification: any) => {
    // Mark notification as seen
    const newSeenNotifications = new Set(seenNotifications);
    newSeenNotifications.add(notification.id);
    setSeenNotifications(newSeenNotifications);
    saveSeenNotifications(newSeenNotifications);
    
    // Close the notifications modal
    setShowNotificationsModal(false);
    
    // For non-invite notifications, navigate to group
    const group = groups.find(g => g.id === notification.groupId);
    if (group) {
      handleGroupPress(group);
    }
  };

  // Fetch invites on component mount
  React.useEffect(() => {
    const initializeData = async () => {
      await loadSeenNotifications();
      await loadLastOpened();
      await loadPrevSubmissionCounts();
      await loadScheduledDeadlines();
      await fetchPendingInvites();
    };
    initializeData();
  }, []);

  // Regenerate notifications when groups or invites change
  React.useEffect(() => {
    if (groups.length > 0 && seenNotifications.size >= 0) {
      generateNotifications(pendingInvites);
    }
  }, [groups, pendingInvites, seenNotifications]);

  // Periodically cleanup stale notifications
  React.useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanupStaleNotifications();
    }, 30000); // Clean up every 30 seconds

    return () => clearInterval(cleanupInterval);
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

  const loadSeenNotifications = async () => {
    try {
      const raw = await AsyncStorage.getItem(SEEN_NOTIFICATIONS_KEY);
      if (raw) {
        const seenArray = JSON.parse(raw) || [];
        setSeenNotifications(new Set(seenArray));
      }
    } catch (error) {
      console.error("Failed to load seen notifications:", error);
    }
  };

  const saveSeenNotifications = async (seenSet: Set<string>) => {
    try {
      const seenArray = Array.from(seenSet);
      await AsyncStorage.setItem(SEEN_NOTIFICATIONS_KEY, JSON.stringify(seenArray));
    } catch (error) {
      console.error("Failed to save seen notifications:", error);
    }
  };

  const cleanupStaleNotifications = async () => {
    try {
      // Get current pending invites
      const invites = await apiService.getPendingInvites();
      const currentInviteIds = new Set(invites.map(invite => invite.id));
      
      // Remove notifications for invites that no longer exist
      setNotifications(prev => {
        const filtered = prev.filter(notification => {
          if (notification.type === "invite" && notification.inviteId) {
            const shouldKeep = currentInviteIds.has(notification.inviteId);
            if (!shouldKeep) {
              console.log(`Removing stale notification for invite ${notification.inviteId}`);
            }
            return shouldKeep;
          }
          return true; // Keep non-invite notifications
        });
        
        if (prev.length !== filtered.length) {
          console.log(`Cleaned up ${prev.length - filtered.length} stale invite notifications`);
        }
        
        return filtered;
      });
    } catch (error) {
      console.error("Failed to cleanup stale notifications:", error);
    }
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
      if (!user || !groups || groups.length === 0 || seenNotifications.size < 0) return;
      const map: Record<number, number> = { ...prevSubmissionCounts };
      for (const g of groups) {
        try {
          const subs = await apiService.getGroupSubmissions(g.id);
          const othersCount = subs.filter((s: any) => s.user_id !== user.id).length;
          const prev = map[g.id] || 0;
          if (othersCount > prev) {
            // Check if we've already seen notifications for recent submissions
            const recentSubmissions = subs.filter((s: any) => s.user_id !== user.id)
              .sort((a: any, b: any) => new Date(b.submitted_at || b.created_at).getTime() - new Date(a.submitted_at || a.created_at).getTime())
              .slice(0, othersCount - prev);
            
            // Only send system notification if we haven't seen these specific submissions
            const unseenSubmissions = recentSubmissions.filter((sub: any) => 
              !seenNotifications.has(`submission-${g.id}-${sub.id}`)
            );
            
            if (unseenSubmissions.length > 0) {
              try {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: "New video posted",
                    body: `${unseenSubmissions.length} new video(s) in ${g.name}`,
                  },
                  trigger: null,
                });
                
                // Mark these submissions as seen to prevent duplicate notifications
                const newSeenNotifications = new Set(seenNotifications);
                unseenSubmissions.forEach((sub: any) => {
                  newSeenNotifications.add(`submission-${g.id}-${sub.id}`);
                });
                setSeenNotifications(newSeenNotifications);
                saveSeenNotifications(newSeenNotifications);
              } catch {}
            }
          }
          map[g.id] = othersCount;
        } catch {}
      }
      if (isMounted) await savePrevSubmissionCounts(map);
    };

    // Only start polling after seenNotifications is loaded
    if (seenNotifications.size >= 0) {
      poll();
      const id = setInterval(poll, 120000);
      return () => {
        isMounted = false;
        clearInterval(id);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, user, seenNotifications]);

  // Schedule deadline reminders (1 hour before deadline)
  React.useEffect(() => {
    const schedule = async () => {
      if (!groups || groups.length === 0 || seenNotifications.size < 0) return;
      const now = Date.now();
      const updated: Record<number, number> = { ...scheduledDeadlines };
      for (const g of groups) {
        if (!g.deadline_at) continue;
        const deadlineMs = new Date(g.deadline_at).getTime();
        const triggerMs = deadlineMs - 60 * 60 * 1000;
        const notificationId = `deadline-${g.id}`;
        
        // Only schedule if not already scheduled and not already seen
        if (triggerMs > now && updated[g.id] !== triggerMs && !seenNotifications.has(notificationId)) {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Reminder to post",
                body: `Don't forget to post in ${g.name} before the deadline!`,
              },
              trigger: null,
            });
            updated[g.id] = triggerMs;
          } catch {}
        }
      }
      await saveScheduledDeadlines(updated);
    };

    // Only schedule after seenNotifications is loaded
    if (seenNotifications.size >= 0) {
      schedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, seenNotifications]);

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
            onPress={() => {
              cleanupStaleNotifications();
              setShowNotificationsModal(true);
            }}
          >
            <IconSymbol name="bell" size={20} color="#007AFF" />
            {notifications.filter(n => !n.isRead).length > 0 && (
              <View style={styles.notificationBadge}>
                <ThemedText style={styles.notificationBadgeText}>
                  {notifications.filter(n => !n.isRead).length}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
          <ThemedText style={styles.title}>Weave</ThemedText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <IconSymbol name="plus" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Notifications Banner */}
        {notifications.filter(n => !n.isRead).length > 0 && (
          <View style={styles.invitesNotification}>
            <View style={styles.invitesContent}>
              <View style={styles.invitesInfo}>
                <IconSymbol name="bell" size={20} color="#007AFF" />
                <ThemedText style={styles.invitesText}>
                  {notifications.filter(n => !n.isRead).length} new notification{notifications.filter(n => !n.isRead).length !== 1 ? 's' : ''}
                </ThemedText>
              </View>
              <TouchableOpacity
                style={styles.viewInvitesButton}
                onPress={() => {
                  cleanupStaleNotifications();
                  setShowNotificationsModal(true);
                }}
              >
                <ThemedText style={styles.viewInvitesButtonText}>View All</ThemedText>
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
              router.push(`/tabs/record?groupId=${groupId}`);
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

      {/* Notifications Modal */}
      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={notifications}
        onMarkAsRead={markNotificationAsRead}
        onNotificationPress={handleNotificationPress}
        onAcceptInvite={handleAcceptInvite}
        onDeclineInvite={handleDeclineInvite}
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
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
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
