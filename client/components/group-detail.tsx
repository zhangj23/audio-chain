import {
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  Alert,
  ScrollView,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState } from "react";

const { width } = Dimensions.get("window");

interface GroupDetailProps {
  group: {
    id: string;
    name: string;
    members: string[];
    videosSubmitted: number;
    totalMembers: number;
    dueDate: string;
    prompt: string;
    isRevealed: boolean;
  };
  onBack: () => void;
  onRecord: (groupId: string) => void;
  onWatchVideos: (group: any) => void;
}

export function GroupDetail({
  group,
  onBack,
  onRecord,
  onWatchVideos,
}: GroupDetailProps) {
  const [showInviteOptions, setShowInviteOptions] = useState(false);

  const inviteFriends = () => {
    Alert.alert("Invite Friends", "Share this group with your friends!", [
      { text: "Copy Link", onPress: () => console.log("Copy link") },
      { text: "Share", onPress: () => console.log("Share group") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const leaveGroup = () => {
    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave "${group.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => console.log("Leave group"),
        },
      ]
    );
  };

  const renderMemberGrid = () => (
    <View style={styles.membersGrid}>
      {group.members.map((member, index) => (
        <View key={index} style={styles.memberCard}>
          <View
            style={[
              styles.memberAvatar,
              index < group.videosSubmitted
                ? styles.completedAvatar
                : styles.pendingAvatar,
            ]}
          >
            {index < group.videosSubmitted ? (
              group.isRevealed ? (
                <TouchableOpacity
                  onPress={() => console.log(`Play ${member}'s video`)}
                >
                  <IconSymbol name="play.fill" size={24} color="#fff" />
                </TouchableOpacity>
              ) : (
                <IconSymbol name="checkmark" size={20} color="#fff" />
              )
            ) : member === "You" ? (
              <IconSymbol name="camera.fill" size={20} color="#666" />
            ) : (
              <IconSymbol name="clock" size={20} color="#666" />
            )}
          </View>
          <ThemedText style={styles.memberName}>{member}</ThemedText>
          {member === "You" && index >= group.videosSubmitted && (
            <TouchableOpacity
              style={styles.recordButton}
              onPress={() => onRecord(group.id)}
            >
              <ThemedText style={styles.recordButtonText}>
                Record Now
              </ThemedText>
            </TouchableOpacity>
          )}
          {group.isRevealed && index < group.videosSubmitted && (
            <TouchableOpacity style={styles.playButton}>
              <ThemedText style={styles.playButtonText}>Watch</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{group.name}</ThemedText>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setShowInviteOptions(!showInviteOptions)}
        >
          <IconSymbol name="ellipsis" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Group Info */}
        <View style={styles.groupInfo}>
          <ThemedText style={styles.prompt}>"{group.prompt}"</ThemedText>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      (group.videosSubmitted / group.totalMembers) * 100
                    }%`,
                  },
                ]}
              />
            </View>
            <ThemedText style={styles.progressText}>
              {group.videosSubmitted}/{group.totalMembers} videos submitted
            </ThemedText>
          </View>

          <View style={styles.dueDateContainer}>
            <IconSymbol name="clock" size={16} color="#ff9500" />
            <ThemedText style={styles.dueDate}>{group.dueDate}</ThemedText>
          </View>
        </View>

        {/* Members */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            Members ({group.totalMembers})
          </ThemedText>
          {renderMemberGrid()}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {group.isRevealed ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => onWatchVideos(group)}
            >
              <IconSymbol name="play.circle.fill" size={24} color="#fff" />
              <ThemedText style={styles.primaryButtonText}>
                Watch All Videos
              </ThemedText>
            </TouchableOpacity>
          ) : (
            <View style={styles.waitingContainer}>
              <IconSymbol name="hourglass" size={40} color="#666" />
              <ThemedText style={styles.waitingTitle}>
                Waiting for everyone...
              </ThemedText>
              <ThemedText style={styles.waitingSubtitle}>
                Videos will be revealed when all members submit
              </ThemedText>
            </View>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={inviteFriends}
          >
            <IconSymbol name="person.badge.plus" size={20} color="#007AFF" />
            <ThemedText style={styles.secondaryButtonText}>
              Invite Friends
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Group Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Group Settings</ThemedText>

          <TouchableOpacity style={styles.settingItem}>
            <IconSymbol name="bell" size={20} color="#666" />
            <ThemedText style={styles.settingText}>Notifications</ThemedText>
            <IconSymbol name="chevron.right" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <IconSymbol name="clock.arrow.circlepath" size={20} color="#666" />
            <ThemedText style={styles.settingText}>Change Deadline</ThemedText>
            <IconSymbol name="chevron.right" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.dangerItem]}
            onPress={leaveGroup}
          >
            <IconSymbol name="arrow.right.square" size={20} color="#ff4444" />
            <ThemedText style={[styles.settingText, styles.dangerText]}>
              Leave Group
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  groupInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  prompt: {
    fontSize: 18,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 20,
    opacity: 0.9,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.8,
  },
  dueDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dueDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ff9500",
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  membersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  memberCard: {
    width: (width - 60) / 2,
    alignItems: "center",
    marginBottom: 20,
  },
  memberAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  completedAvatar: {
    backgroundColor: "#4CAF50",
  },
  pendingAvatar: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  memberName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    textAlign: "center",
  },
  recordButton: {
    backgroundColor: "#007AFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  recordButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  playButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  playButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  actionSection: {
    padding: 20,
    gap: 16,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    borderRadius: 25,
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderRadius: 25,
    paddingVertical: 16,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  waitingContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  waitingSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    flex: 1,
  },
  dangerItem: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  dangerText: {
    color: "#ff4444",
  },
});
