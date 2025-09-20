import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Modal,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GroupDetail } from "@/components/group-detail";
import { CreateGroupModal } from "@/components/create-group-modal";
import { useState, useEffect } from "react";
import { videoStorage } from "../../utils/videoStorage";

// const { width } = Dimensions.get("window"); // Unused for now

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
  const [groups, setGroups] = useState(mockGroups);
  // const [selectedGroup, setSelectedGroup] = useState(mockGroups[0]); // Unused for now
  const [showGroupDetail, setShowGroupDetail] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
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

    Alert.alert(
      "Group Created! 🎉",
      `"${groupData.name}" has been created successfully!`,
      [{ text: "OK" }]
    );
  };

  const navigateToGroup = (group: any) => {
    setDetailGroup(group);
    setShowGroupDetail(true);
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
        <ThemedText style={styles.headerTitle}>Weave.</ThemedText>
        <TouchableOpacity style={styles.addButton} onPress={createNewGroup}>
          <ThemedText style={styles.addButtonText}>+</ThemedText>
        </TouchableOpacity>
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

        {/* Create New Group - BeReal Style */}
        <TouchableOpacity
          style={styles.createGroupCard}
          onPress={createNewGroup}
        >
          <View style={styles.createGroupContent}>
            <ThemedText style={styles.createGroupText}>
              + Start a new challenge
            </ThemedText>
          </View>
        </TouchableOpacity>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
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
});
