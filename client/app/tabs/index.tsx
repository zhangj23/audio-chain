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
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GroupDetail } from "@/components/group-detail";
import { CreateGroupModal } from "@/components/create-group-modal";
import { useGroups } from "@/contexts/GroupsContext";
import { useAuth } from "@/contexts/AuthContext";

export default function HomeScreen() {
  const router = useRouter();
  const { groups, isLoading, error, refreshGroups, createGroup } = useGroups();
  const { user } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submittedVideos] = useState<{
    [groupId: string]: any;
  }>({});

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshGroups();
    setRefreshing(false);
  };

  const handleCreateGroup = async (groupData: {
    name: string;
    prompt: string;
    deadline: string;
    members: string[];
  }) => {
    try {
      console.log("HomeScreen - Creating group with data:", groupData);
      const newGroup = await createGroup(groupData.name, groupData.prompt);
      console.log("HomeScreen - Group created successfully:", newGroup);
      setShowCreateModal(false);
    } catch (error) {
      console.error("HomeScreen - Error creating group:", error);
      // Error handling is done in the context
    }
  };

  const handleGroupPress = (group: any) => {
    setSelectedGroup(group);
  };

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
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Your Groups</ThemedText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <IconSymbol name="plus" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

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
            groups.map((group) => (
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
                <View style={styles.groupStats}>
                  <View style={styles.stat}>
                    <IconSymbol name="person.2" size={14} color="#8E8E93" />
                    <ThemedText style={styles.statText}>
                      {(group.members || []).length} members
                    </ThemedText>
                  </View>
                  <View style={styles.stat}>
                    <IconSymbol name="video" size={14} color="#8E8E93" />
                    <ThemedText style={styles.statText}>0 videos</ThemedText>
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
            submittedVideo={
              selectedGroup ? submittedVideos[selectedGroup.id] || null : null
            }
            currentUserId={user?.id}
          />
        )}
      </Modal>

      {/* Create Group Modal */}
      <CreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
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
  scrollView: {
    flex: 1,
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
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  groupsList: {
    paddingHorizontal: 20,
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
});
