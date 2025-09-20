import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  Alert,
  Modal,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GroupDetail } from "@/components/group-detail";
import { useState } from "react";

const { width } = Dimensions.get("window");

// Mock group data
const mockGroups = [
  {
    id: "1",
    name: "College Friends 🎓",
    members: ["You", "Alice", "Mike", "Sara"],
    videosSubmitted: 2,
    totalMembers: 4,
    dueDate: "2h left",
    prompt: "Show us your morning routine!",
    isRevealed: false,
  },
  {
    id: "2",
    name: "Family Fun 👨‍👩‍👧‍👦",
    members: ["You", "Mom", "Dad", "Sister"],
    videosSubmitted: 4,
    totalMembers: 4,
    dueDate: "Completed",
    prompt: "What's your favorite family memory?",
    isRevealed: true,
  },
  {
    id: "3",
    name: "Work Squad 💼",
    members: ["You", "John", "Emma", "David", "Lisa"],
    videosSubmitted: 1,
    totalMembers: 5,
    dueDate: "1d left",
    prompt: "Share your workspace setup!",
    isRevealed: false,
  },
];

export default function HomeScreen() {
  const [selectedGroup, setSelectedGroup] = useState(mockGroups[0]);
  const [showGroupDetail, setShowGroupDetail] = useState(false);
  const [detailGroup, setDetailGroup] = useState<any>(null);

  const createNewGroup = () => {
    Alert.alert(
      "Create New Group",
      "Group creation functionality will be implemented next!",
      [{ text: "OK" }]
    );
    // TODO: Navigate to group creation screen
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
        {mockGroups.map((group) => (
          <TouchableOpacity
            key={group.id}
            style={styles.groupCard}
            onPress={() => navigateToGroup(group)}
          >
            <View style={styles.groupContent}>
              <View style={styles.groupHeader}>
                <ThemedText style={styles.groupName}>{group.name}</ThemedText>
                <ThemedText style={styles.groupTime}>
                  {group.dueDate}
                </ThemedText>
              </View>

              <ThemedText style={styles.groupPrompt}>{group.prompt}</ThemedText>

              <View style={styles.groupStats}>
                <ThemedText style={styles.statsText}>
                  {group.videosSubmitted}/{group.totalMembers} posted
                </ThemedText>
                {group.videosSubmitted < group.totalMembers && (
                  <View style={styles.pendingIndicator}>
                    <ThemedText style={styles.pendingText}>pending</ThemedText>
                  </View>
                )}
              </View>

              {group.isRevealed && (
                <View style={styles.revealedBadge}>
                  <ThemedText style={styles.revealedText}>
                    ⚡ Ready to view
                  </ThemedText>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

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
          />
        )}
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
  groupStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
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
});
