import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GroupDetail } from "@/components/group-detail";
import { CreateGroupModal } from "@/components/create-group-modal";
import { useState, useEffect } from "react";
import { videoStorage } from "../../utils/videoStorage";

const { width, height } = Dimensions.get("window");

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

// Mock group data
const mockGroups = [
  {
    id: "1",
    name: "College Friends 🎓",
    members: ["You", "Alice", "Mike", "Sara"],
    videosSubmitted: 2,
    totalMembers: 4,
    dueDate: "2h left",
    prompt: "Show us your vibe right now! ✨",
    isRevealed: false,
  },
  {
    id: "2",
    name: "Family Fun 👨‍👩‍👧‍👦",
    members: ["You", "Mom", "Dad", "Sister"],
    videosSubmitted: 4,
    totalMembers: 4,
    dueDate: "Completed",
    prompt: "What's making you smile rn? 😊",
    isRevealed: true,
  },
  {
    id: "3",
    name: "Work Squad 💼",
    members: ["You", "John", "Emma", "David", "Lisa"],
    videosSubmitted: 1,
    totalMembers: 5,
    dueDate: "1d left",
    prompt: "Drop your main character moment 💫",
    isRevealed: false,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState(mockGroups);
  // const [selectedGroup, setSelectedGroup] = useState(mockGroups[0]); // Unused for now
  const [showGroupDetail, setShowGroupDetail] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRecordPrompt, setShowRecordPrompt] = useState(false);
  const [newlyCreatedGroup, setNewlyCreatedGroup] = useState<any>(null);
  const [detailGroup, setDetailGroup] = useState<any>(null);
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

  const createNewGroup = () => {
    setShowCreateGroup(true);
  };

  const openNotifications = () => {
    setShowNotifications(true);
  };

  const handleCreateGroup = (groupData: {
    name: string;
    prompt: string;
    deadline: string;
    members: string[];
  }) => {
    const newGroup = {
      id: Date.now().toString(),
      name: groupData.name,
      members: groupData.members,
      videosSubmitted: 0,
      totalMembers: groupData.members.length,
      dueDate: groupData.deadline,
      prompt: groupData.prompt,
      isRevealed: false,
    };

    setGroups((prevGroups) => [newGroup, ...prevGroups]);
    setNewlyCreatedGroup(newGroup);
    setShowRecordPrompt(true);
  };

  const navigateToGroup = (group: any) => {
    setDetailGroup(group);
    setShowGroupDetail(true);
  };

  const handleRecordNow = () => {
    setShowRecordPrompt(false);
    // Navigate to record tab with the new group pre-selected
    router.push({
      pathname: "/record",
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

  const joinGroup = (groupId: string) => {
    Alert.alert(
      "Record Video",
      "Navigate to recording screen for this group?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Record", onPress: () => console.log("Navigate to record") },
      ]
    );
  };

  const viewCompletedGroup = (group: any) => {
    Alert.alert(
      "View Group Videos",
      `All ${group.totalMembers} members have submitted their videos!`,
      [{ text: "Watch", onPress: () => console.log("View videos") }]
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header - BeReal Style */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={openNotifications}
          >
            <IconSymbol name="bell" size={20} color="#fff" />
            <View style={styles.notificationBadge}>
              <ThemedText style={styles.notificationBadgeText}>
                {mockNotifications.filter((n) => n.urgent).length}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <View style={styles.titleContainer}>
            <ThemedText style={styles.headerTitle}>WEAVE</ThemedText>
            <View style={styles.titleGlow} />
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.addButton} onPress={createNewGroup}>
            <ThemedText style={styles.addButtonText}>+</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Your Groups - Vertical Card Layout */}
      <ScrollView
        style={styles.groupsSection}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((group) => {
          const hasSubmittedVideo = submittedVideos[group.id];

          return (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => navigateToGroup(group)}
            >
              <View style={styles.groupContent}>
                <View style={styles.groupHeader}>
                  <ThemedText style={styles.groupName}>{group.name}</ThemedText>
                  <View style={styles.groupHeaderRight}>
                    <ThemedText style={styles.groupTime}>
                      {group.dueDate}
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
                  {group.prompt}
                </ThemedText>

                {/* Video Preview Section */}
                <View style={styles.previewSection}>
                  {group.videosSubmitted > 0 || hasSubmittedVideo ? (
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
                        {!group.isRevealed &&
                          Array.from({
                            length: Math.min(
                              group.videosSubmitted,
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
                        {group.isRevealed &&
                          Array.from({
                            length: Math.min(
                              group.videosSubmitted,
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
                        {group.videosSubmitted > 4 && (
                          <View style={styles.moreVideos}>
                            <ThemedText style={styles.moreVideosText}>
                              +{group.videosSubmitted - 4}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText style={styles.previewText}>
                        {group.isRevealed
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
                        {group.members.includes("You")
                          ? "Be the first to post! 🚀"
                          : "Waiting for the first video..."}
                      </ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.groupStats}>
                  <ThemedText style={styles.statsText}>
                    {group.videosSubmitted}/{group.totalMembers} posted
                  </ThemedText>
                  <View style={styles.rightSection}>
                    {group.videosSubmitted < group.totalMembers && (
                      <View style={styles.pendingIndicator}>
                        <ThemedText style={styles.pendingText}>
                          pending
                        </ThemedText>
                      </View>
                    )}
                    {group.isRevealed && (
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
      </ScrollView>

      {/* Group Detail Modal */}
      <Modal
        visible={showGroupDetail}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {detailGroup && (
          <GroupDetail
            group={detailGroup}
            onBack={() => setShowGroupDetail(false)}
            onRecord={(groupId) => {
              setShowGroupDetail(false);
              joinGroup(groupId);
            }}
            onWatchVideos={(group) => {
              setShowGroupDetail(false);
              viewCompletedGroup(group);
            }}
            submittedVideo={submittedVideos[detailGroup.id] || null}
          />
        )}
      </Modal>

      {/* Create Group Modal */}
      <CreateGroupModal
        visible={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreateGroup={handleCreateGroup}
      />

      {/* Record Prompt Modal */}
      <Modal
        visible={showRecordPrompt}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRecordPrompt(false)}
      >
        <View style={styles.recordPromptOverlay}>
          <View style={styles.recordPromptContainer}>
            <View style={styles.recordPromptHeader}>
              <IconSymbol name="camera.fill" size={32} color="#007AFF" />
              <ThemedText style={styles.recordPromptTitle}>
                Group Created! 🎉
              </ThemedText>
              <ThemedText style={styles.recordPromptSubtitle}>
                &quot;{newlyCreatedGroup?.name}&quot; is ready for videos
              </ThemedText>
            </View>

            <View style={styles.recordPromptContent}>
              <ThemedText style={styles.recordPromptQuestion}>
                Want to record your video now?
              </ThemedText>
              <ThemedText style={styles.recordPromptDescription}>
                &quot;{newlyCreatedGroup?.prompt}&quot;
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
                <IconSymbol name="camera.fill" size={20} color="#fff" />
                <ThemedText style={styles.recordNowText}>Record Now</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal - BeReal Style */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.notificationModal}>
          {/* Header */}
          <View style={styles.notificationHeader}>
            <TouchableOpacity
              style={styles.notificationCloseButton}
              onPress={() => setShowNotifications(false)}
            >
              <IconSymbol name="xmark" size={18} color="#fff" />
            </TouchableOpacity>
            <ThemedText style={styles.notificationTitle}>
              Notifications
            </ThemedText>
            <View style={styles.notificationHeaderSpacer} />
          </View>

          {/* Notifications List */}
          <ScrollView
            style={styles.notificationsList}
            showsVerticalScrollIndicator={false}
          >
            {mockNotifications.map((notification) => (
              <TouchableOpacity
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
                        ? "checkmark.circle.fill"
                        : "camera"
                    }
                    size={20}
                    color={notification.urgent ? "#ff4444" : "#888"}
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
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Math.max(16, width * 0.04),
    paddingTop: height > 800 ? 60 : 50,
    paddingBottom: height > 800 ? 20 : 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.08)",
    minHeight: height > 800 ? 100 : 85,
    backgroundColor: "rgba(0,0,0,0.98)",
  },
  headerLeft: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 3,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingHorizontal: 8,
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: Math.min(Math.max(26, width * 0.07), 32),
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 2,
    textAlign: "center",
    fontFamily: "System",
    textShadowColor: "rgba(255,255,255,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
    lineHeight: Math.min(Math.max(32, width * 0.08), 40),
  },
  addButton: {
    width: Math.max(32, width * 0.085),
    height: Math.max(32, width * 0.085),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  addButtonText: {
    fontSize: Math.min(Math.max(18, width * 0.045), 24),
    fontWeight: "200",
    color: "#fff",
    lineHeight: Math.min(Math.max(18, width * 0.045), 24),
  },
  titleContainer: {
    position: "relative",
    alignItems: "center",
    width: "100%",
    paddingVertical: 4,
    paddingTop: 6,
  },
  titleGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 4,
    transform: [{ scaleX: 1.1 }, { scaleY: 1.2 }],
  },
  notificationButton: {
    position: "relative",
    width: Math.max(32, width * 0.085),
    height: Math.max(32, width * 0.085),
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    includeFontPadding: false,
    lineHeight: 13,
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
    gap: 8,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  groupTime: {
    fontSize: 12,
    color: "#888",
    fontWeight: "400",
  },
  groupPrompt: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 18,
    fontWeight: "400",
  },
  previewSection: {
    marginVertical: 12,
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
    width: 32,
    height: 32,
    borderRadius: 6,
    overflow: "hidden",
  },
  blurredVideo: {
    flex: 1,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.7,
  },
  moreVideos: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
  },
  moreVideosText: {
    fontSize: 10,
    color: "#888",
    fontWeight: "600",
  },
  previewText: {
    fontSize: 11,
    color: "#888",
    fontStyle: "italic",
  },
  emptyPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
    borderStyle: "dashed",
  },
  emptyPreviewIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyPreviewText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  groupStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
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
    alignSelf: "flex-start",
    marginTop: 4,
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
    fontSize: 16,
    color: "#888",
    fontWeight: "500",
  },
  groupHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submittedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  userVideo: {
    width: "100%",
    height: "100%",
    backgroundColor: "#333",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  revealedVideo: {
    width: "100%",
    height: "100%",
    backgroundColor: "#444",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
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
