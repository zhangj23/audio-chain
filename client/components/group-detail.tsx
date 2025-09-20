import {
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GroupSettings } from "@/components/group-settings";
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
  const [showSettings, setShowSettings] = useState(false);

  const openSettings = () => {
    setShowSettings(true);
  };

  const handleSettingsSave = (updates: any) => {
    console.log("Settings updated:", updates);
    setShowSettings(false);
  };

  const getGridDimensions = () => {
    const memberCount = group.members.length;
    const screenWidth = width - 40; // Account for padding

    if (memberCount <= 2) {
      return {
        columns: memberCount,
        tileWidth: (screenWidth - 12) / memberCount,
      };
    } else if (memberCount <= 4) {
      return { columns: 2, tileWidth: (screenWidth - 12) / 2 };
    } else {
      return { columns: 3, tileWidth: (screenWidth - 24) / 3 };
    }
  };

  const renderMemberGrid = () => {
    const { columns, tileWidth } = getGridDimensions();

    return (
      <View style={styles.videoGrid}>
        {group.members.map((member, index) => {
          const hasSubmitted = index < group.videosSubmitted;
          const isYou = member === "You";
          const canViewVideo = group.isRevealed && hasSubmitted;

          return (
            <View key={index} style={[styles.videoTile, { width: tileWidth }]}>
              {/* Video Content */}
              <TouchableOpacity
                style={styles.videoContainer}
                onPress={() => {
                  if (hasSubmitted && (canViewVideo || isYou)) {
                    console.log(`Play ${member}'s video`);
                  } else if (!hasSubmitted && isYou) {
                    onRecord(group.id);
                  }
                }}
              >
                <View style={styles.videoContent}>
                  {hasSubmitted ? (
                    <>
                      {/* Video Background */}
                      <View
                        style={[
                          styles.videoBackground,
                          !canViewVideo && !isYou && styles.blurredBackground,
                        ]}
                      >
                        <IconSymbol
                          name={
                            canViewVideo || isYou
                              ? "play.fill"
                              : "eye.slash.fill"
                          }
                          size={24}
                          color={canViewVideo || isYou ? "#fff" : "#666"}
                        />
                      </View>

                      {/* Blur overlay */}
                      {!canViewVideo && !isYou && (
                        <View style={styles.videoBlur}>
                          <IconSymbol name="lock.fill" size={12} color="#888" />
                        </View>
                      )}

                      {/* Play indicator */}
                      {canViewVideo && (
                        <View style={styles.playIndicator}>
                          <IconSymbol
                            name="play.circle.fill"
                            size={32}
                            color="rgba(255,255,255,0.9)"
                          />
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.emptyVideo}>
                      {isYou ? (
                        <>
                          <IconSymbol name="plus" size={20} color="#666" />
                          <ThemedText style={styles.addVideoText}>
                            Add
                          </ThemedText>
                        </>
                      ) : (
                        <IconSymbol name="clock" size={20} color="#444" />
                      )}
                    </View>
                  )}
                </View>

                {/* Member name */}
                <View style={styles.memberLabel}>
                  <ThemedText style={styles.memberName} numberOfLines={1}>
                    {isYou ? "You" : member.split(" ")[0]}
                  </ThemedText>
                  {hasSubmitted && <View style={styles.statusDot} />}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{group.name}</ThemedText>
        <TouchableOpacity style={styles.moreButton} onPress={openSettings}>
          <IconSymbol name="ellipsis" size={20} color="#fff" />
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
            {group.totalMembers} members
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
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <GroupSettings
          group={group}
          onBack={() => setShowSettings(false)}
          onSave={handleSettingsSave}
        />
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
    flex: 1,
    textAlign: "center",
    color: "#fff",
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  groupInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  prompt: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#ccc",
    fontWeight: "400",
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: "center",
    color: "#888",
    fontWeight: "500",
  },
  dueDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dueDate: {
    fontSize: 12,
    fontWeight: "500",
    color: "#888",
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    color: "#fff",
  },
  videoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  videoTile: {
    marginBottom: 12,
  },
  videoContainer: {
    flex: 1,
  },
  videoContent: {
    aspectRatio: 9 / 16,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    marginBottom: 8,
  },
  videoBackground: {
    flex: 1,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  blurredBackground: {
    backgroundColor: "#222",
  },
  videoBlur: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  playIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyVideo: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  addVideoText: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
  },
  memberLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  memberName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
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
});
