import {
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  Alert,
  ScrollView,
  TextInput,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState } from "react";

const { width } = Dimensions.get("window");

interface GroupSettingsProps {
  group: {
    id: number;
    name: string;
    description?: string;
    members: any[];
    current_prompt?: {
      id: number;
      text: string;
      week_start: string;
      week_end: string;
      is_active: boolean;
    };
    videoStats?: {
      group_id: number;
      total_submissions: number;
      unique_submitters: number;
      total_members: number;
      submission_rate: number;
    };
    isRevealed?: boolean;
  };
  onBack: () => void;
  onSave: (updates: any) => void;
}

export function GroupSettings({ group, onBack, onSave }: GroupSettingsProps) {
  const [groupName, setGroupName] = useState(
    group.name.replace(/[🎓👨‍👩‍👧‍👦💼]/g, "").trim()
  );
  const [selectedPrompt, setSelectedPrompt] = useState(
    group.current_prompt?.text || ""
  );
  const [showPromptSelector, setShowPromptSelector] = useState(false);

  // Engaging prompts with categories
  const promptCategories = {
    "🔥 Vibes": [
      "Show us your vibe right now! ✨",
      "What's your current energy? 🔥",
      "Give us those good vibes only 🌟",
      "Your current mood in 10 seconds 🎭",
    ],
    "💫 Main Character": [
      "Drop your main character moment 💫",
      "What's your power move today? ⚡",
      "Show us your aesthetic today 🎨",
      "What's your story today? 📚",
    ],
    "😊 Feel Good": [
      "What's making you smile rn? 😊",
      "Show us something that made your day ☀️",
      "Share your happy place 🌈",
      "What's bringing you joy today? 💕",
    ],
    "🎯 Random Fun": [
      "If you were a movie character rn, who would you be? 🎬",
      "Show us your current obsession 🔥",
      "What's your superpower today? 🦸",
      "Describe your day in one object 📱",
    ],
  };

  const changeGroupPicture = () => {
    Alert.alert("Group Picture", "Choose a new picture for your group:", [
      { text: "Camera", onPress: () => console.log("Open camera") },
      { text: "Gallery", onPress: () => console.log("Open gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const inviteFriends = () => {
    Alert.alert("Invite Friends", "Share this group with your friends!", [
      { text: "Copy Link", onPress: () => console.log("Copy link") },
      { text: "Share", onPress: () => console.log("Share group") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const changeDeadline = () => {
    Alert.alert("Change Deadline", "When should everyone submit by?", [
      { text: "1 Hour", onPress: () => console.log("1 hour") },
      { text: "6 Hours", onPress: () => console.log("6 hours") },
      { text: "1 Day", onPress: () => console.log("1 day") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const notificationSettings = () => {
    Alert.alert("Notifications", "Manage your group notifications:", [
      { text: "Turn Off", onPress: () => console.log("Notifications off") },
      { text: "Reminders Only", onPress: () => console.log("Reminders only") },
      {
        text: "All Notifications",
        onPress: () => console.log("All notifications"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const leaveGroup = () => {
    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave "${group.name}"? You won't be able to see or participate in this challenge anymore.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            console.log("Leave group");
            onBack();
          },
        },
      ]
    );
  };

  const deleteGroup = () => {
    Alert.alert(
      "Delete Group",
      `Are you sure you want to delete "${group.name}"? This action cannot be undone and will remove the group for everyone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            console.log("Delete group");
            onBack();
          },
        },
      ]
    );
  };

  const saveChanges = () => {
    console.log("GroupSettings - saveChanges called with:", {
      name: groupName,
      prompt: selectedPrompt,
    });
    onSave({
      name: groupName,
      prompt: selectedPrompt,
    });
    Alert.alert("Success!", "Group settings updated successfully!");
  };

  const renderPromptSelector = () => (
    <View style={styles.promptSelector}>
      <View style={styles.promptHeader}>
        <ThemedText style={styles.promptTitle}>Choose a Prompt</ThemedText>
        <TouchableOpacity onPress={() => setShowPromptSelector(false)}>
          <IconSymbol name="xmark" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.promptCategories}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(promptCategories).map(([category, prompts]) => (
          <View key={category} style={styles.promptCategory}>
            <ThemedText style={styles.categoryTitle}>{category}</ThemedText>
            {prompts.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.promptOption,
                  selectedPrompt === prompt && styles.selectedPrompt,
                ]}
                onPress={() => {
                  setSelectedPrompt(prompt);
                  setShowPromptSelector(false);
                }}
              >
                <ThemedText
                  style={[
                    styles.promptText,
                    selectedPrompt === prompt && styles.selectedPromptText,
                  ]}
                >
                  {prompt}
                </ThemedText>
                {selectedPrompt === prompt && (
                  <IconSymbol name="checkmark" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <IconSymbol name="chevron.left" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Group Settings</ThemedText>
        <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
          <ThemedText style={styles.saveText}>Save</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Identity */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>✨ Group Identity</ThemedText>

          {/* Group Picture */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={changeGroupPicture}
          >
            <View style={styles.settingLeft}>
              <View style={styles.groupPicture}>
                <ThemedText style={styles.groupEmoji}>
                  {group.name.includes("🎓")
                    ? "🎓"
                    : group.name.includes("👨‍👩‍👧‍👦")
                    ? "👨‍👩‍👧‍👦"
                    : group.name.includes("💼")
                    ? "💼"
                    : "👥"}
                </ThemedText>
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>
                  Group Picture
                </ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Tap to change
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#666" />
          </TouchableOpacity>

          {/* Group Name */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <IconSymbol name="textformat" size={20} color="#007AFF" />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Group Name</ThemedText>
                <TextInput
                  style={styles.nameInput}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="Enter group name..."
                  placeholderTextColor="#666"
                />
              </View>
            </View>
          </View>

          {/* Current Prompt */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowPromptSelector(true)}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <IconSymbol name="lightbulb" size={20} color="#ff9500" />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>
                  Current Prompt
                </ThemedText>
                <ThemedText style={styles.promptPreview} numberOfLines={1}>
                  {selectedPrompt}
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Group Management */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>⚙️ Management</ThemedText>

          <TouchableOpacity style={styles.settingItem} onPress={inviteFriends}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <IconSymbol
                  name="person.badge.plus"
                  size={20}
                  color="#4CAF50"
                />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>
                  Invite Friends
                </ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Share group link
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={changeDeadline}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <IconSymbol name="clock" size={20} color="#ff9500" />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>
                  Change Deadline
                </ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  {group.current_prompt?.week_end
                    ? new Date(
                        group.current_prompt.week_end
                      ).toLocaleDateString()
                    : "No deadline"}
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={notificationSettings}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <IconSymbol name="bell" size={20} color="#007AFF" />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>
                  Notifications
                </ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  All notifications
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>⚠️ Danger Zone</ThemedText>

          <TouchableOpacity style={styles.dangerItem} onPress={leaveGroup}>
            <View style={styles.settingLeft}>
              <View style={styles.dangerIcon}>
                <IconSymbol
                  name="arrow.right.square"
                  size={20}
                  color="#ff4444"
                />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.dangerTitle}>Leave Group</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  You won't see this challenge anymore
                </ThemedText>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerItem} onPress={deleteGroup}>
            <View style={styles.settingLeft}>
              <View style={styles.dangerIcon}>
                <IconSymbol name="trash" size={20} color="#ff4444" />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.dangerTitle}>Delete Group</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Permanently delete for everyone
                </ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Prompt Selector Modal */}
      {showPromptSelector && renderPromptSelector()}
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  groupPicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  groupEmoji: {
    fontSize: 20,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#888",
  },
  nameInput: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 2,
  },
  promptPreview: {
    fontSize: 14,
    color: "#ccc",
    fontStyle: "italic",
  },
  dangerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  dangerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff4444",
    marginBottom: 2,
  },
  promptSelector: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
    zIndex: 1000,
  },
  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  promptCategories: {
    flex: 1,
    padding: 20,
  },
  promptCategory: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  promptOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#222",
  },
  selectedPrompt: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  promptText: {
    fontSize: 14,
    color: "#fff",
    flex: 1,
    marginRight: 8,
  },
  selectedPromptText: {
    fontWeight: "600",
  },
});
