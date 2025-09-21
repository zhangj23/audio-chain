import { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import DateTimePicker from "@react-native-community/datetimepicker";

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateGroup: (groupData: {
    name: string;
    prompt: string;
    deadline: string;
    members: string[];
  }) => void;
}

// Mock users for search functionality
const mockUsers = [
  {
    id: "1",
    username: "alice_wonder",
    displayName: "Alice Wonder",
    avatar: "👩‍💻",
  },
  { id: "2", username: "mike_codes", displayName: "Mike Codes", avatar: "👨‍💻" },
  {
    id: "3",
    username: "sara_design",
    displayName: "Sara Design",
    avatar: "👩‍🎨",
  },
  { id: "4", username: "john_dev", displayName: "John Dev", avatar: "👨‍🔬" },
  {
    id: "5",
    username: "emma_creative",
    displayName: "Emma Creative",
    avatar: "👩‍🎭",
  },
  { id: "6", username: "david_tech", displayName: "David Tech", avatar: "👨‍🚀" },
  { id: "7", username: "lisa_art", displayName: "Lisa Art", avatar: "👩‍🎨" },
  { id: "8", username: "tom_music", displayName: "Tom Music", avatar: "👨‍🎵" },
  {
    id: "9",
    username: "anna_photo",
    displayName: "Anna Photo",
    avatar: "👩‍📸",
  },
  {
    id: "10",
    username: "chris_video",
    displayName: "Chris Video",
    avatar: "👨‍🎬",
  },
];

export function CreateGroupModal({
  visible,
  onClose,
  onCreateGroup,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateGroup = () => {
    if (!groupName.trim() || !prompt.trim() || !deadline.trim()) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
      return;
    }

    onCreateGroup({
      name: groupName.trim(),
      prompt: prompt.trim(),
      deadline: deadlineDate ? deadlineDate.toISOString() : deadline.trim(),
      members: ["You", ...selectedMembers],
    });

    // Reset form
    setGroupName("");
    setPrompt("");
    setDeadline("");
    setDeadlineDate(null);
    setShowDatePicker(false);
    setSearchQuery("");
    setSelectedMembers([]);
    setShowUserSearch(false);
    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setGroupName("");
    setPrompt("");
    setDeadline("");
    setDeadlineDate(null);
    setShowDatePicker(false);
    setSearchQuery("");
    setSelectedMembers([]);
    setShowUserSearch(false);
    onClose();
  };

  const toggleMember = (username: string) => {
    setSelectedMembers((prev) =>
      prev.includes(username)
        ? prev.filter((member) => member !== username)
        : [...prev, username]
    );
  };

  const removeMember = (username: string) => {
    setSelectedMembers((prev) => prev.filter((member) => member !== username));
  };

  const renderUserItem = ({ item }: { item: (typeof mockUsers)[0] }) => {
    const isSelected = selectedMembers.includes(item.username);

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.selectedUserItem]}
        onPress={() => toggleMember(item.username)}
      >
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <ThemedText style={styles.avatarText}>{item.avatar}</ThemedText>
          </View>
          <View style={styles.userDetails}>
            <ThemedText style={styles.displayName}>
              {item.displayName}
            </ThemedText>
            <ThemedText style={styles.username}>@{item.username}</ThemedText>
          </View>
        </View>
        {isSelected && (
          <IconSymbol name="checkmark.circle.fill" size={24} color="#007AFF" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Create Group</ThemedText>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateGroup}
          >
            <ThemedText style={styles.createText}>Create</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Group Name */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Group Name</ThemedText>
              <TextInput
                style={styles.textInput}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="e.g., College Friends 🎓"
                placeholderTextColor="#666"
                maxLength={50}
              />
            </View>

            {/* Prompt */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                Challenge Prompt
              </ThemedText>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={prompt}
                onChangeText={setPrompt}
                placeholder="What should everyone record? e.g., Show us your morning routine!"
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <ThemedText style={styles.characterCount}>
                {prompt.length}/200
              </ThemedText>
            </View>

            {/* Deadline */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Deadline</ThemedText>
              <TouchableOpacity
                style={styles.textInput}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <ThemedText>
                  {deadlineDate
                    ? `${deadlineDate.toLocaleDateString()} ${deadlineDate.toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" }
                      )}`
                    : "Select date and time"}
                </ThemedText>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={deadlineDate || new Date()}
                  mode="datetime"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS !== "ios") setShowDatePicker(false);
                    if (selectedDate) {
                      setDeadlineDate(selectedDate);
                      setDeadline(selectedDate.toISOString());
                    }
                  }}
                />
              )}
            </View>

            {/* Invite Members */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>
                  Invite Friends
                </ThemedText>
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={() => setShowUserSearch(!showUserSearch)}
                >
                  <IconSymbol
                    name="magnifyingglass"
                    size={16}
                    color="#007AFF"
                  />
                  <ThemedText style={styles.searchButtonText}>
                    Search
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Selected Members */}
              {selectedMembers.length > 0 && (
                <View style={styles.selectedMembersContainer}>
                  <ThemedText style={styles.selectedMembersTitle}>
                    Selected ({selectedMembers.length})
                  </ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.selectedMembersList}>
                      {selectedMembers.map((username) => {
                        const user = mockUsers.find(
                          (u) => u.username === username
                        );
                        return (
                          <View
                            key={username}
                            style={styles.selectedMemberChip}
                          >
                            <ThemedText style={styles.chipText}>
                              {user?.avatar}
                            </ThemedText>
                            <ThemedText style={styles.chipUsername}>
                              {username}
                            </ThemedText>
                            <TouchableOpacity
                              onPress={() => removeMember(username)}
                              style={styles.removeChipButton}
                            >
                              <IconSymbol name="xmark" size={12} color="#666" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Preview */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Preview</ThemedText>
                <View style={styles.previewCard}>
                  <View style={styles.previewHeader}>
                    <ThemedText style={styles.previewName}>
                      {groupName || "Group Name"}
                    </ThemedText>
                    <ThemedText style={styles.previewTime}>
                      {deadlineDate
                        ? `${deadlineDate.toLocaleDateString()} ${deadlineDate.toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" }
                          )}`
                        : "Deadline"}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.previewPrompt}>
                    "{prompt || "Challenge prompt will appear here..."}"
                  </ThemedText>
                  <View style={styles.previewStats}>
                    <ThemedText style={styles.previewStatsText}>
                      0/{selectedMembers.length + 1} posted
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* User Search - Outside ScrollView to avoid nesting */}
          {showUserSearch && (
            <View style={styles.searchOverlay}>
              <View style={styles.searchHeader}>
                <ThemedText style={styles.searchTitle}>Search Users</ThemedText>
                <TouchableOpacity
                  style={styles.closeSearchButton}
                  onPress={() => setShowUserSearch(false)}
                >
                  <IconSymbol name="xmark" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchInputContainer}>
                <IconSymbol name="magnifyingglass" size={16} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by username or name..."
                  placeholderTextColor="#666"
                />
              </View>

              <FlatList
                data={filteredUsers}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                style={styles.usersList}
                showsVerticalScrollIndicator={false}
                maxToRenderPerBatch={10}
              />
            </View>
          )}
        </View>
      </ThemedView>
    </Modal>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    fontSize: 16,
    color: "#666",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  createButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  createText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  searchButtonText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  textInput: {
    backgroundColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#222",
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
    marginTop: 4,
  },
  selectedMembersContainer: {
    marginTop: 12,
  },
  selectedMembersTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
    marginBottom: 8,
  },
  selectedMembersList: {
    flexDirection: "row",
    gap: 8,
  },
  selectedMemberChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    gap: 6,
  },
  chipText: {
    fontSize: 14,
  },
  chipUsername: {
    fontSize: 12,
    color: "#ccc",
  },
  removeChipButton: {
    padding: 2,
  },
  searchOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
    zIndex: 1000,
  },
  searchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  closeSearchButton: {
    padding: 8,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#222",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
  },
  usersList: {
    flex: 1,
    marginHorizontal: 20,
    backgroundColor: "#111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  selectedUserItem: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
  username: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  previewCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  previewName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  previewTime: {
    fontSize: 12,
    color: "#888",
  },
  previewPrompt: {
    fontSize: 14,
    color: "#ccc",
    fontStyle: "italic",
    marginBottom: 8,
  },
  previewStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewStatsText: {
    fontSize: 12,
    color: "#888",
  },
});
