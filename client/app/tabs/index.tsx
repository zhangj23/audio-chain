import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GroupDetail } from "@/components/group-detail";
import { CreateGroupModal } from "@/components/create-group-modal";
import { useState, useEffect } from "react";
import { videoStorage } from "../../utils/videoStorage";
import { useGroups } from "@/contexts/GroupsContext";
import { useAuth } from "@/contexts/AuthContext";

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
    message: "Time to show your workout!",
    time: "1d ago",
    urgent: false,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { groups, isLoading, error, refreshGroups } = useGroups();
  const { user } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleCreateGroup = () => {
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
  };

  const handleGroupCreated = () => {
    setShowCreateModal(false);
    refreshGroups();
  };

  const renderNotification = (notification: any) => (
    <View
      key={notification.id}
      style={[
        styles.notificationItem,
        notification.urgent && styles.urgentNotification,
      ]}
    >
      <View style={styles.notificationContent}>
        <ThemedText style={styles.notificationMessage}>
          {notification.message}
        </ThemedText>
        <ThemedText style={styles.notificationTime}>
          {notification.time}
        </ThemedText>
      </View>
      {notification.urgent && (
        <View style={styles.urgentBadge}>
          <ThemedText style={styles.urgentText}>!</ThemedText>
        </View>
      )}
    </View>
  );

  const renderGroupCard = (group: any) => (
    <TouchableOpacity
      key={group.id}
      style={styles.groupCard}
      onPress={() => handleGroupPress(group)}
    >
      <View style={styles.groupHeader}>
        <ThemedText style={styles.groupName}>{group.name}</ThemedText>
        <View style={styles.groupStatus}>
          <ThemedText style={styles.memberCount}>
            {group.memberCount} members
          </ThemedText>
          <ThemedText style={styles.dueDate}>{group.dueDate}</ThemedText>
        </View>
      </View>

      <ThemedText style={styles.groupPrompt}>{group.current_prompt}</ThemedText>

      <View style={styles.groupActions}>
        <TouchableOpacity style={styles.actionButton}>
          <IconSymbol name="camera" size={16} color="#2563eb" />
          <ThemedText style={styles.actionText}>Record</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <IconSymbol name="play" size={16} color="#10b981" />
          <ThemedText style={styles.actionText}>View</ThemedText>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
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
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.welcomeText}>
              Welcome back!
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Ready to create some memories?
            </ThemedText>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/(tabs)/explore")}
          >
            <IconSymbol name="person.circle" size={32} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Notifications</ThemedText>
            <TouchableOpacity>
              <ThemedText style={styles.seeAllText}>See all</ThemedText>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.notificationsScroll}
          >
            {mockNotifications.map(renderNotification)}
          </ScrollView>
        </View>

        {/* Groups */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Your Groups</ThemedText>
            <TouchableOpacity onPress={handleCreateGroup}>
              <ThemedText style={styles.seeAllText}>+ Create</ThemedText>
            </TouchableOpacity>
          </View>

          {groups.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="person.2" size={48} color="#9ca3af" />
              <ThemedText style={styles.emptyTitle}>No groups yet</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Create your first group or join one to get started!
              </ThemedText>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateGroup}
              >
                <ThemedText style={styles.createButtonText}>
                  Create Group
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.groupsContainer}>
              {groups.map(renderGroupCard)}
            </View>
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
            onClose={() => setSelectedGroup(null)}
          />
        )}
      </Modal>

      {/* Create Group Modal */}
      <CreateGroupModal
        visible={showCreateModal}
        onClose={handleCloseModal}
        onGroupCreated={handleGroupCreated}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
  },
  profileButton: {
    padding: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  seeAllText: {
    fontSize: 16,
    color: "#2563eb",
    fontWeight: "600",
  },
  notificationsScroll: {
    paddingLeft: 20,
  },
  notificationItem: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: width * 0.7,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  urgentNotification: {
    borderColor: "#fbbf24",
    backgroundColor: "#fef3c7",
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  urgentBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#f59e0b",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  urgentText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  groupsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  groupCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  groupStatus: {
    alignItems: "flex-end",
  },
  memberCount: {
    fontSize: 12,
    opacity: 0.6,
  },
  dueDate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563eb",
  },
  groupPrompt: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 16,
    fontStyle: "italic",
  },
  groupActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
