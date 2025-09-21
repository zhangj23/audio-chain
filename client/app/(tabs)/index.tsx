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
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GroupDetail } from "@/components/group-detail";
import { CreateGroupModal } from "@/components/create-group-modal";
import { useState, useEffect } from "react";
import { useGroups } from "@/contexts/GroupsContext";
import { videoStorage } from "../../utils/videoStorage";

// Mock notifications data
const mockNotifications = [
  {
    id: 1,
    type: "submission_reminder",
    groupName: "College Friends 🎓",
    message: "Don't forget to submit your photo! 2h left",
    time: "5 min ago",
    urgent: true,
  },
  {
    id: 2,
    type: "submission_reminder",
    groupName: "Work Squad 💼",
    message: "Your friends are waiting for your photo",
    time: "1h ago",
    urgent: false,
  },
  {
    id: 3,
    type: "group_complete",
    groupName: "Family Fun 👨‍👩‍👧‍👦",
    message: "All photos submitted! Ready to view",
    time: "3h ago",
    urgent: false,
  },
  {
    id: 4,
    type: "submission_reminder",
    groupName: "Fitness Crew 💪",
    message: "Last chance! Submit before deadline",
    time: "6h ago",
    urgent: true,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { groups, isLoading, error, refreshGroups } = useGroups();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRecordPrompt, setShowRecordPrompt] = useState(false);
  const [newlyCreatedGroup, setNewlyCreatedGroup] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submittedVideos, setSubmittedVideos] = useState<{
    [groupId: string]: any;
  }>({});

  // Subscribe to video storage changes
  useEffect(() => {
    const unsubscribe = videoStorage.subscribe((videos) => {
      setSubmittedVideos(videos);
    });

    // Load initial videos
    setSubmittedVideos(videoStorage.getAllVideos());

    return unsubscribe;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshGroups();
    } finally {
      setRefreshing(false);
    }
  };

  const handleGroupPress = (group: any) => {
    setSelectedGroup(group);
  };

  const handleCreateGroup = (groupData: {
    name: string;
    prompt: string;
    deadline: string;
    members: string[];
  }) => {
    // TODO: Create group with API
    setNewlyCreatedGroup({
      name: groupData.name,
      prompt: groupData.prompt,
    });
    setShowCreateModal(false);
    setShowRecordPrompt(true);
    refreshGroups();
  };

  const openNotifications = () => {
    setShowNotifications(true);
  };

  const handleRecordNow = () => {
    setShowRecordPrompt(false);
    // Navigate to record tab with the new group pre-selected
    router.push({
      pathname: "/(tabs)/record",
      params: { selectedGroupId: newlyCreatedGroup?.id },
    });
  };

  const handleRecordLater = () => {
    setShowRecordPrompt(false);
    setNewlyCreatedGroup(null);
    Alert.alert(
      "Group Created! 🎉",
      `"${newlyCreatedGroup?.name}" has been created successfully!`,
      [{ text: "OK" }]
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
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
      {/* Header - Enhanced BeReal Style */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={openNotifications}
          >
            <IconSymbol name="bell" size={20} color="#fff" />
            {mockNotifications.filter((n) => n.urgent).length > 0 && (
              <View style={styles.notificationBadge}>
                <ThemedText style={styles.notificationBadgeText}>
                  {mockNotifications.filter((n) => n.urgent).length}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <View style={styles.titleContainer}>
            <ThemedText style={styles.headerTitle}>WEAVE</ThemedText>
            <View style={styles.titleGlow} />
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <ThemedText style={styles.addButtonText}>+</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Your Groups - Enhanced Vertical Card Layout */}
      <ScrollView
        style={styles.groupsSection}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
      >
        {groups.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="person.2" size={48} color="#666" />
            <ThemedText style={styles.emptyTitle}>No groups yet</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Create your first group to get started!
            </ThemedText>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <ThemedText style={styles.createButtonText}>
                Create Group
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {groups.map((group: any) => {
              const hasSubmittedVideo = submittedVideos[group.id];
              const isRevealed =
                (group.submissions_count || 0) ===
                  (group.members?.length || 0) &&
                (group.members?.length || 0) > 0;

              return (
                <TouchableOpacity
                  key={group.id}
                  style={styles.groupCard}
                  onPress={() => handleGroupPress(group)}
                >
                  <View style={styles.groupContent}>
                    <View style={styles.groupHeader}>
                      <ThemedText style={styles.groupName}>
                        {group.name}
                      </ThemedText>
                      <View style={styles.groupHeaderRight}>
                        <ThemedText style={styles.groupTime}>
                          {group.expires_at
                            ? new Date(group.expires_at).toLocaleDateString()
                            : "No deadline"}
                        </ThemedText>
                        {hasSubmittedVideo && (
                          <View style={styles.submittedBadge}>
                            <IconSymbol
                              name="checkmark.circle.fill"
                              size={16}
                              color="#4CAF50"
                            />
                          </View>
                        )}
                      </View>
                    </View>

                    <ThemedText style={styles.groupPrompt}>
                      {group.current_prompt?.text || "No prompt yet"}
                    </ThemedText>

                    {/* Enhanced Video Preview Section */}
                    <View style={styles.previewSection}>
                      {(group.submissions_count || 0) > 0 ||
                      hasSubmittedVideo ? (
                        <View style={styles.videoPreviewContainer}>
                          <View style={styles.videoPreviewGrid}>
                            {/* Show user's own video if submitted */}
                            {hasSubmittedVideo && (
                              <View style={styles.videoThumbnail}>
                                <View style={styles.userVideo}>
                                  <IconSymbol
                                    name="play.fill"
                                    size={12}
                                    color="#fff"
                                  />
                                </View>
                              </View>
                            )}
                            {/* Show blurred thumbnails for other submitted videos only if group not revealed */}
                            {!isRevealed &&
                              Array.from({
                                length: Math.min(
                                  group.submissions_count || 0,
                                  hasSubmittedVideo ? 3 : 4
                                ),
                              }).map((_, index) => (
                                <View key={index} style={styles.videoThumbnail}>
                                  <View style={styles.blurredVideo}>
                                    <IconSymbol
                                      name="eye.slash.fill"
                                      size={12}
                                      color="#666"
                                    />
                                  </View>
                                </View>
                              ))}
                            {/* Show clear thumbnails if group is revealed */}
                            {isRevealed &&
                              Array.from({
                                length: Math.min(
                                  group.submissions_count || 0,
                                  hasSubmittedVideo ? 3 : 4
                                ),
                              }).map((_, index) => (
                                <View key={index} style={styles.videoThumbnail}>
                                  <View style={styles.revealedVideo}>
                                    <IconSymbol
                                      name="play.fill"
                                      size={12}
                                      color="#fff"
                                    />
                                  </View>
                                </View>
                              ))}
                            {(group.submissions_count || 0) > 4 && (
                              <View style={styles.moreVideos}>
                                <ThemedText style={styles.moreVideosText}>
                                  +{(group.submissions_count || 0) - 4}
                                </ThemedText>
                              </View>
                            )}
                          </View>
                          <ThemedText style={styles.previewText}>
                            {isRevealed
                              ? "Tap to watch all videos"
                              : hasSubmittedVideo
                              ? "Your video submitted! Others hidden until everyone posts"
                              : "Videos are hidden until everyone posts"}
                          </ThemedText>
                        </View>
                      ) : (
                        <View style={styles.emptyPreviewContainer}>
                          <View style={styles.emptyPreviewIcon}>
                            <IconSymbol name="camera" size={24} color="#444" />
                          </View>
                          <ThemedText style={styles.emptyPreviewText}>
                            Be the first to post! 🚀
                          </ThemedText>
                        </View>
                      )}
                    </View>

                    <View style={styles.groupStats}>
                      <ThemedText style={styles.statsText}>
                        {group.submissions_count || 0}/
                        {group.members?.length || 0} posted
                      </ThemedText>
                      <View style={styles.rightSection}>
                        {(group.submissions_count || 0) <
                          (group.members?.length || 0) && (
                          <View style={styles.pendingIndicator}>
                            <ThemedText style={styles.pendingText}>
                              pending
                            </ThemedText>
                          </View>
                        )}
                        {isRevealed && (
                          <View style={styles.revealedBadge}>
                            <ThemedText style={styles.revealedText}>
                              ⚡ Ready to view
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Create New Group - BeReal Style */}
            <TouchableOpacity
              style={styles.createGroupCard}
              onPress={() => setShowCreateModal(true)}
            >
              <View style={styles.createGroupContent}>
                <ThemedText style={styles.createGroupText}>
                  + Start a new challenge
                </ThemedText>
              </View>
            </TouchableOpacity>
          </>
        )}
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
              // TODO: Navigate to record screen
            }}
            onWatchVideos={(group) => {
              setSelectedGroup(null);
              // TODO: Navigate to watch videos
            }}
            submittedVideo={
              selectedGroup ? submittedVideos[selectedGroup.id] || null : null
            }
          />
        )}
      </Modal>

      {/* Create Group Modal */}
      <CreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateGroup={handleCreateGroup}
      />

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.notificationModal}>
          <View style={styles.notificationHeader}>
            <View style={styles.notificationHeaderSpacer} />
            <ThemedText style={styles.notificationTitle}>
              Notifications
            </ThemedText>
            <TouchableOpacity
              style={styles.notificationCloseButton}
              onPress={() => setShowNotifications(false)}
            >
              <IconSymbol name="xmark" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.notificationsList}>
            {mockNotifications.map((notification) => (
              <View
                key={notification.id}
                style={[
                  styles.notificationItem,
                  notification.urgent && styles.notificationItemUrgent,
                ]}
              >
                <View style={styles.notificationIcon}>
                  <IconSymbol
                    name={
                      notification.type === "group_complete"
                        ? "checkmark.circle"
                        : "bell"
                    }
                    size={18}
                    color="#fff"
                  />
                </View>
                <View style={styles.notificationContent}>
                  <ThemedText style={styles.notificationGroup}>
                    {notification.groupName}
                  </ThemedText>
                  <ThemedText style={styles.notificationMessage}>
                    {notification.message}
                  </ThemedText>
                  <ThemedText style={styles.notificationTime}>
                    {notification.time}
                  </ThemedText>
                </View>
                {notification.urgent && <View style={styles.urgentDot} />}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Record Prompt Modal */}
      <Modal visible={showRecordPrompt} animationType="fade" transparent={true}>
        <View style={styles.recordPromptOverlay}>
          <View style={styles.recordPromptContainer}>
            <View style={styles.recordPromptHeader}>
              <ThemedText style={styles.recordPromptTitle}>
                Group Created! 🎉
              </ThemedText>
              <ThemedText style={styles.recordPromptSubtitle}>
                {newlyCreatedGroup?.name}
              </ThemedText>
            </View>
            <View style={styles.recordPromptContent}>
              <ThemedText style={styles.recordPromptQuestion}>
                {newlyCreatedGroup?.prompt}
              </ThemedText>
              <ThemedText style={styles.recordPromptDescription}>
                Be the first to record and set the vibe for your group!
              </ThemedText>
            </View>
            <View style={styles.recordPromptActions}>
              <TouchableOpacity
                style={styles.recordLaterButton}
                onPress={handleRecordLater}
              >
                <ThemedText style={styles.recordLaterText}>Later</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recordNowButton}
                onPress={handleRecordNow}
              >
                <ThemedText style={styles.recordNowText}>Record Now</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#000",
  },
  loadingText: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 24,
    backgroundColor: "#000",
  },
  errorText: {
    fontSize: 16,
    color: "#ff4444",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#000",
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  headerLeft: {
    width: 50,
    alignItems: "flex-start",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    width: 50,
    alignItems: "flex-end",
  },
  titleContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  titleGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    lineHeight: 18,
  },
  addButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: "300",
    color: "#000",
  },
  groupsSection: {
    flex: 1,
    paddingTop: 20,
  },
  groupCard: {
    backgroundColor: "#111",
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  groupContent: {
    gap: 12,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
  },
  groupTime: {
    fontSize: 12,
    color: "#888",
    fontWeight: "400",
  },
  submittedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  groupPrompt: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 18,
    fontWeight: "400",
  },
  previewSection: {
    marginVertical: 4,
  },
  videoPreviewContainer: {
    gap: 8,
  },
  videoPreviewGrid: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  videoThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  userVideo: {
    width: "100%",
    height: "100%",
    backgroundColor: "#333",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  blurredVideo: {
    width: "100%",
    height: "100%",
    backgroundColor: "#222",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  revealedVideo: {
    width: "100%",
    height: "100%",
    backgroundColor: "#444",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  moreVideos: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  moreVideosText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  previewText: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
  emptyPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  emptyPreviewIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyPreviewText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  groupStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statsText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },
  pendingIndicator: {
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingText: {
    fontSize: 10,
    color: "#888",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  revealedBadge: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  revealedText: {
    fontSize: 11,
    color: "#000",
    fontWeight: "600",
  },
  createGroupCard: {
    backgroundColor: "#111",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
    borderStyle: "dashed",
  },
  createGroupContent: {
    alignItems: "center",
  },
  createGroupText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  createButtonText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 14,
  },
  // Notification Modal Styles
  notificationModal: {
    flex: 1,
    backgroundColor: "#000",
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  notificationCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.5,
  },
  notificationHeaderSpacer: {
    width: 32,
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.05)",
  },
  notificationItemUrgent: {
    backgroundColor: "rgba(255,68,68,0.08)",
    borderColor: "rgba(255,68,68,0.2)",
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationGroup: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: "#888",
    fontWeight: "400",
  },
  urgentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff4444",
    marginLeft: 8,
    marginTop: 6,
  },
  // Record Prompt Modal Styles
  recordPromptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  recordPromptContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    margin: 20,
    maxWidth: 350,
    width: "90%",
  },
  recordPromptHeader: {
    padding: 24,
    paddingBottom: 16,
    alignItems: "center",
  },
  recordPromptTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  recordPromptSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  recordPromptContent: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  recordPromptQuestion: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  recordPromptDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  recordPromptActions: {
    flexDirection: "row",
    padding: 24,
    paddingTop: 16,
    gap: 12,
  },
  recordLaterButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  recordLaterText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  recordNowButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#9C27B0",
    alignItems: "center",
  },
  recordNowText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
