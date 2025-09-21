import {
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GroupSettings } from "@/components/group-settings";
import { InviteModal } from "@/components/invite-modal";
import { useState, useRef } from "react";
import { Video } from "expo-av";
import { apiService } from "@/services/api";

const { width } = Dimensions.get("window");

interface GroupDetailProps {
  group: {
    id: number;
    name: string;
    description?: string;
    members: any[]; // Can be string[] (mock) or GroupMember[] (real data)
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
    isWeaved?: boolean; // New state for after weaving is complete
  };
  onBack: () => void;
  onRecord: (groupId: number) => void;
  onWatchVideos: (group: any) => void;
  submittedVideo?: {
    uri: string;
    duration: number;
    timestamp: number;
  } | null;
  currentUserId?: number;
  userSubmissions?: {
    id: number;
    user_id: number;
    group_id: number;
    prompt_id: number;
    s3_key: string;
    duration: number;
    submitted_at: string;
  }[];
}

export function GroupDetail({
  group,
  onBack,
  onRecord,
  onWatchVideos,
  submittedVideo,
  currentUserId,
  userSubmissions = [],
}: GroupDetailProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentVideoUri, setCurrentVideoUri] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isCreatingCollage, setIsCreatingCollage] = useState(false);
  const [compilationId, setCompilationId] = useState<number | null>(null); // For future compilation status tracking
  const videoRef = useRef<Video>(null);

  const openSettings = () => {
    setShowSettings(true);
  };

  const createCollage = async () => {
    try {
      setIsCreatingCollage(true);
      console.log("Creating collage for group:", group.name);

      const response = await apiService.generateCompilation(group.id);
      console.log("Compilation response:", response);

      setCompilationId(response.compilation_id);

      // TODO: Show success message or navigate to compilation status
      console.log("Collage creation started with ID:", response.compilation_id);
    } catch (error) {
      console.error("Failed to create collage:", error);
      // TODO: Show error message to user
    } finally {
      setIsCreatingCollage(false);
    }
  };

  const handleSettingsSave = (updates: any) => {
    console.log("Settings updated:", updates);
    setShowSettings(false);
  };

  const openInviteModal = () => {
    setShowInviteModal(true);
  };

  const handleInvite = (userIds: string[]) => {
    console.log("Inviting users to group:", group.id, userIds);
    // TODO: Implement actual invite API call
    Alert.alert(
      "Invites Sent!",
      `Successfully invited ${userIds.length} people to ${group.name}.`
    );
    setShowInviteModal(false);
  };

  const openVideoPlayer = (videoUri: string) => {
    setCurrentVideoUri(videoUri);
    setShowVideoPlayer(true);
    setIsVideoPlaying(false);
  };

  const closeVideoPlayer = () => {
    setShowVideoPlayer(false);
    setCurrentVideoUri(null);
    setIsVideoPlaying(false);
    if (videoRef.current) {
      videoRef.current.pauseAsync();
    }
  };

  const toggleVideoPlayback = async () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        await videoRef.current.pauseAsync();
        setIsVideoPlaying(false);
      } else {
        await videoRef.current.playAsync();
        setIsVideoPlaying(true);
      }
    }
  };

  const replayVideo = async () => {
    if (videoRef.current) {
      await videoRef.current.replayAsync();
      setIsVideoPlaying(true);
    }
  };

  const getGridDimensions = () => {
    const memberCount = group.members?.length || 0;
    const screenWidth = width - 40; // Account for padding

    // Always calculate tile width based on 3 columns for consistency in small groups
    // But use actual column count for layout logic
    let displayColumns = Math.max(3, Math.min(memberCount, 4)); // Max 4 columns for readability

    // For very large groups (8+), use 4 columns
    if (memberCount >= 8) {
      displayColumns = 4;
    }

    // Always use minimum 3 columns for tile width calculation to maintain consistent sizing
    const tileWidthColumns = Math.max(3, displayColumns);
    const gap = (tileWidthColumns - 1) * 12; // 12px gap between columns

    return {
      columns: displayColumns,
      tileWidth: (screenWidth - gap) / tileWidthColumns,
    };
  };

  const renderMemberGrid = () => {
    const { tileWidth } = getGridDimensions();

    return (
      <View style={styles.videoGrid}>
        {(group.members || []).map((member, index) => {
          const isYou =
            typeof member === "string"
              ? member === "You"
              : currentUserId && member.user_id === currentUserId;

          // Check if this user has submitted a video
          const hasSubmitted = isYou && userSubmissions.length > 0;

          // If weaved, no individual videos can be viewed
          const userHasSubmittedVideo = isYou && submittedVideo;
          const canViewVideo = group.isWeaved
            ? false // No individual videos viewable after weaving
            : (isYou && userHasSubmittedVideo) ||
              (group.isRevealed && hasSubmitted);
          const actuallyHasSubmitted = hasSubmitted || userHasSubmittedVideo;

          return (
            <View key={index} style={[styles.videoTile, { width: tileWidth }]}>
              {/* Video Content */}
              <TouchableOpacity
                style={styles.videoContainer}
                onPress={() => {
                  if (actuallyHasSubmitted && canViewVideo) {
                    if (userHasSubmittedVideo && submittedVideo) {
                      // Play the user's own submitted video
                      openVideoPlayer(submittedVideo.uri);
                    } else if (group.isRevealed && hasSubmitted) {
                      // Play other members' videos only if group is revealed
                      console.log(`Play ${member}'s video`);
                      // TODO: In a real app, this would play the actual video from storage
                    }
                  } else if (!actuallyHasSubmitted && isYou) {
                    // Record new video if user hasn't submitted yet
                    onRecord(group.id);
                  }
                }}
              >
                <View style={styles.videoContent}>
                  {actuallyHasSubmitted ? (
                    <>
                      {/* Video Background */}
                      <View
                        style={[
                          styles.videoBackground,
                          !canViewVideo && styles.blurredBackground,
                        ]}
                      >
                        <IconSymbol
                          name={canViewVideo ? "play.fill" : "eye.slash.fill"}
                          size={24}
                          color={canViewVideo ? "#fff" : "#666"}
                        />
                      </View>

                      {/* Blur overlay for non-viewable videos */}
                      {!canViewVideo && (
                        <View style={styles.videoBlur}>
                          <IconSymbol name="lock.fill" size={12} color="#888" />
                        </View>
                      )}

                      {/* Play indicator - only for viewable videos */}
                      {canViewVideo && (
                        <View style={styles.playIndicator}>
                          <IconSymbol
                            name="play.circle.fill"
                            size={32}
                            color="rgba(255,255,255,0.9)"
                          />
                        </View>
                      )}

                      {/* Your video indicator */}
                      {userHasSubmittedVideo && (
                        <View style={styles.yourVideoIndicator}>
                          <ThemedText style={styles.yourVideoText}>
                            {submittedVideo?.duration}s
                          </ThemedText>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.emptyVideo}>
                      {isYou ? (
                        // Check if user has submitted a video
                        userSubmissions.length > 0 ? (
                          <>
                            <IconSymbol
                              name="checkmark.circle.fill"
                              size={20}
                              color="#4CAF50"
                            />
                            <ThemedText style={styles.submittedVideoText}>
                              Submitted
                            </ThemedText>
                          </>
                        ) : (
                          <>
                            <IconSymbol name="plus" size={20} color="#666" />
                            <ThemedText style={styles.addVideoText}>
                              Add
                            </ThemedText>
                          </>
                        )
                      ) : (
                        <IconSymbol name="clock" size={20} color="#444" />
                      )}
                    </View>
                  )}
                </View>

                {/* Member name */}
                <View style={styles.memberLabel}>
                  <ThemedText style={styles.memberName} numberOfLines={1}>
                    {isYou
                      ? "You"
                      : typeof member === "string"
                      ? member.split(" ")[0]
                      : member.user?.username || "Unknown"}
                  </ThemedText>
                  {actuallyHasSubmitted && <View style={styles.statusDot} />}
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
      {/* BeReal Style Header */}
      <View style={styles.berealHeader}>
        <View style={styles.berealHeaderRow}>
          <TouchableOpacity style={styles.berealBackButton} onPress={onBack}>
            <IconSymbol name="chevron.left" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.berealHeaderContent}>
            <ThemedText style={styles.berealHeaderTitle}>
              {group.name}
            </ThemedText>
            <View style={styles.berealHeaderStats}>
              <ThemedText style={styles.berealMemberCount}>
                {group.members?.length || 0} members
              </ThemedText>
              <View style={styles.berealDot} />
              <ThemedText style={styles.berealDueDate}>
                {group.current_prompt?.week_end
                  ? new Date(group.current_prompt.week_end).toLocaleDateString()
                  : "No deadline"}
              </ThemedText>
            </View>
          </View>

          <TouchableOpacity
            style={styles.berealMoreButton}
            onPress={openSettings}
          >
            <IconSymbol name="ellipsis" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Enhanced Group Hero Section */}
        <View style={styles.heroSection}>
          {/* Group Cover/Background */}
          <View style={styles.groupCover}>
            <View style={styles.coverGradient}>
              <ThemedText style={styles.promptLarge}>
                &quot;{group.current_prompt?.text || "No prompt available"}
                &quot;
              </ThemedText>
            </View>
          </View>

          {/* Group Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statNumber}>
                  {userSubmissions?.length || 0}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Submitted</ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <ThemedText style={styles.statNumber}>
                  {group.members?.length || 0}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Members</ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <ThemedText style={styles.statNumber}>
                  {group.members?.length > 0 
                    ? Math.round(((userSubmissions?.length || 0) / group.members.length) * 100)
                    : 0}%
                </ThemedText>
                <ThemedText style={styles.statLabel}>Complete</ThemedText>
              </View>
            </View>

            {/* Due Date with Status */}
            <View style={styles.dueDateContainer}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: group.isWeaved
                      ? "#9C27B0"
                      : group.isRevealed
                      ? "#4CAF50"
                      : "#ff9500",
                  },
                ]}
              >
                <IconSymbol
                  name={
                    group.isWeaved
                      ? "play.circle.fill"
                      : group.isRevealed
                      ? "checkmark.circle.fill"
                      : "clock.fill"
                  }
                  size={14}
                  color="#fff"
                />
                <ThemedText style={styles.statusText}>
                  {group.isWeaved
                    ? "Ready to View"
                    : group.isRevealed
                    ? "Complete"
                    : group.current_prompt?.week_end
                    ? new Date(
                        group.current_prompt.week_end
                      ).toLocaleDateString()
                    : "No deadline"}
                </ThemedText>
              </View>

              {/* Action button next to status */}
              {group.isWeaved ? (
                <TouchableOpacity
                  style={styles.viewButtonCompact}
                  onPress={() => {
                    // TODO: Navigate to compiled video viewer
                    console.log(
                      "View Weaved Video pressed for group:",
                      group.name
                    );
                  }}
                >
                  <IconSymbol name="play.fill" size={16} color="#fff" />
                  <ThemedText style={styles.viewButtonCompactText}>
                    View
                  </ThemedText>
                </TouchableOpacity>
              ) : group.isRevealed ? (
                <TouchableOpacity
                  style={styles.weaveButtonCompact}
                  onPress={() => {
                    // TODO: Navigate to weaving/compilation screen
                    console.log("Let's Weave pressed for group:", group.name);
                  }}
                >
                  <IconSymbol name="wand.and.stars" size={16} color="#fff" />
                  <ThemedText style={styles.weaveButtonCompactText}>
                    Let&apos;s Weave
                  </ThemedText>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* Activity Feed Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Recent Activity</ThemedText>
            <TouchableOpacity style={styles.sectionAction}>
              <ThemedText style={styles.sectionActionText}>View All</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.activityFeed}>
            {/* Activity Items */}
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <IconSymbol name="video.fill" size={16} color="#4CAF50" />
              </View>
              <View style={styles.activityContent}>
                <ThemedText style={styles.activityText}>
                  <ThemedText style={styles.activityUser}>You</ThemedText>{" "}
                  submitted a video
                </ThemedText>
                <ThemedText style={styles.activityTime}>
                  2 minutes ago
                </ThemedText>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <IconSymbol name="video.fill" size={16} color="#4CAF50" />
              </View>
              <View style={styles.activityContent}>
                <ThemedText style={styles.activityText}>
                  <ThemedText style={styles.activityUser}>Alice</ThemedText>{" "}
                  submitted a video
                </ThemedText>
                <ThemedText style={styles.activityTime}>1 hour ago</ThemedText>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <IconSymbol
                  name="person.badge.plus"
                  size={16}
                  color="#007AFF"
                />
              </View>
              <View style={styles.activityContent}>
                <ThemedText style={styles.activityText}>
                  <ThemedText style={styles.activityUser}>Mike</ThemedText>{" "}
                  joined the group
                </ThemedText>
                <ThemedText style={styles.activityTime}>2 hours ago</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Video Grid Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              {group.isWeaved
                ? "Weaved Video"
                : `Videos (${userSubmissions?.length || 0}/${group.members?.length || 0})`}
            </ThemedText>
            {group.isWeaved ? (
              <TouchableOpacity
                style={styles.sectionAction}
                onPress={() => {
                  // TODO: Navigate to compiled video viewer
                  console.log(
                    "View Weaved Video pressed for group:",
                    group.name
                  );
                }}
              >
                <IconSymbol name="play.circle.fill" size={16} color="#9C27B0" />
                <ThemedText style={styles.sectionActionText}>Watch</ThemedText>
              </TouchableOpacity>
            ) : group.isRevealed ? (
              <TouchableOpacity
                style={styles.sectionAction}
                onPress={() => onWatchVideos(group)}
              >
                <IconSymbol name="play.circle" size={16} color="#007AFF" />
                <ThemedText style={styles.sectionActionText}>
                  Watch All
                </ThemedText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.sectionAction,
                  isCreatingCollage && styles.sectionActionDisabled,
                ]}
                onPress={createCollage}
                disabled={isCreatingCollage}
              >
                <IconSymbol
                  name={isCreatingCollage ? "clock" : "wand.and.stars"}
                  size={16}
                  color={isCreatingCollage ? "#666" : "#9C27B0"}
                />
                <ThemedText
                  style={[
                    styles.sectionActionText,
                    isCreatingCollage && styles.sectionActionTextDisabled,
                  ]}
                >
                  {isCreatingCollage ? "Creating..." : "Create Collage"}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {group.isWeaved ? (
            // Show weaved video preview instead of individual tiles
            <View style={styles.weavedVideoPreview}>
              <TouchableOpacity
                style={styles.weavedVideoContainer}
                onPress={() => {
                  // TODO: Navigate to compiled video viewer
                  console.log(
                    "View Weaved Video pressed for group:",
                    group.name
                  );
                }}
              >
                <View style={styles.weavedVideoThumbnail}>
                  <IconSymbol
                    name="play.circle.fill"
                    size={48}
                    color="#9C27B0"
                  />
                </View>
                <View style={styles.weavedVideoInfo}>
                  <ThemedText style={styles.weavedVideoTitle}>
                    {group.name} - Compilation
                  </ThemedText>
                  <ThemedText style={styles.weavedVideoSubtitle}>
                    All {group.members?.length || 0} videos woven together
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            renderMemberGrid()
          )}
        </View>

        {/* Enhanced Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Members ({group.members?.length || 0})
            </ThemedText>
            <TouchableOpacity style={styles.sectionAction} onPress={openInviteModal}>
              <IconSymbol name="person.badge.plus" size={16} color="#007AFF" />
              <ThemedText style={styles.sectionActionText}>Invite</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Member List with Enhanced Cards */}
          <View style={styles.memberList}>
            {(group.members || []).map((member, index) => {
              const isYou =
                typeof member === "string"
                  ? member === "You"
                  : currentUserId && member.user_id === currentUserId;

              // Check if this user has submitted a video
              const hasSubmitted = isYou && userSubmissions.length > 0;
              const userHasSubmittedVideo = isYou && submittedVideo;
              const actuallyHasSubmitted =
                hasSubmitted || userHasSubmittedVideo;

              return (
                <View key={index} style={styles.memberCard}>
                  <View style={styles.memberInfo}>
                    <View
                      style={[
                        styles.memberAvatar,
                        actuallyHasSubmitted
                          ? styles.memberAvatarSubmitted
                          : null,
                      ]}
                    >
                      <ThemedText style={styles.memberInitial}>
                        {typeof member === "string"
                          ? member.charAt(0)
                          : member.user?.username?.charAt(0) || "U"}
                      </ThemedText>
                      {actuallyHasSubmitted && (
                        <View style={styles.submittedBadge}>
                          <IconSymbol name="checkmark" size={8} color="#fff" />
                        </View>
                      )}
                    </View>

                    <View style={styles.memberDetails}>
                      <ThemedText style={styles.memberNameCard}>
                        {isYou ? "You" : member}
                      </ThemedText>
                      <ThemedText style={styles.memberStatus}>
                        {actuallyHasSubmitted
                          ? group.isRevealed
                            ? "Video ready"
                            : "Submitted"
                          : "Pending..."}
                      </ThemedText>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.memberAction}
                    onPress={() => {
                      if (actuallyHasSubmitted && (isYou || group.isRevealed)) {
                        if (userHasSubmittedVideo && submittedVideo) {
                          openVideoPlayer(submittedVideo.uri);
                        }
                      } else if (!actuallyHasSubmitted && isYou) {
                        onRecord(group.id);
                      }
                    }}
                  >
                    {actuallyHasSubmitted ? (
                      <IconSymbol
                        name={
                          group.isRevealed || isYou
                            ? "play.circle"
                            : "lock.circle"
                        }
                        size={20}
                        color={group.isRevealed || isYou ? "#4CAF50" : "#666"}
                      />
                    ) : isYou ? (
                      <IconSymbol
                        name="plus.circle"
                        size={20}
                        color="#007AFF"
                      />
                    ) : (
                      <IconSymbol name="clock" size={20} color="#666" />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {group.isWeaved && (
            // Weaved state - only show weaved video option
            <TouchableOpacity
              style={styles.primaryWeavedButton}
              onPress={() => {
                // TODO: Navigate to compiled video viewer
                console.log(
                  "View Compiled Video pressed for group:",
                  group.name
                );
              }}
            >
              <IconSymbol name="play.circle.fill" size={24} color="#fff" />
              <ThemedText style={styles.primaryWeavedButtonText}>
                Watch Weaved Video
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Video Player Modal */}
      <Modal
        visible={showVideoPlayer}
        animationType="fade"
        presentationStyle="fullScreen"
      >
        <ThemedView style={styles.videoPlayerContainer}>
          {/* Video Player Header */}
          <View style={styles.videoPlayerHeader}>
            <TouchableOpacity
              onPress={closeVideoPlayer}
              style={styles.closeVideoButton}
            >
              <IconSymbol name="xmark" size={24} color="#fff" />
            </TouchableOpacity>
            <ThemedText style={styles.videoPlayerTitle}>Your Video</ThemedText>
            <View style={styles.placeholder} />
          </View>

          {/* Video Player */}
          <View style={styles.videoPlayerContent}>
            {currentVideoUri && (
              <Video
                ref={videoRef}
                source={{ uri: currentVideoUri }}
                style={styles.video}
                useNativeControls={false}
                isLooping={false}
                onPlaybackStatusUpdate={(status) => {
                  if (status.isLoaded && status.didJustFinish) {
                    setIsVideoPlaying(false);
                  }
                }}
              />
            )}

            {/* Video Controls Overlay */}
            <TouchableOpacity
              style={styles.videoControlsOverlay}
              onPress={toggleVideoPlayback}
            >
              {!isVideoPlaying && (
                <View style={styles.playButton}>
                  <IconSymbol name="play.fill" size={48} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Video Info */}
            <View style={styles.videoInfo}>
              <ThemedText style={styles.videoGroup}>{group.name}</ThemedText>
              {submittedVideo && (
                <ThemedText style={styles.videoDuration}>
                  {submittedVideo.duration}s
                </ThemedText>
              )}
            </View>
          </View>

          {/* Video Player Actions */}
          <View style={styles.videoPlayerActions}>
            <TouchableOpacity
              style={styles.videoActionButton}
              onPress={replayVideo}
            >
              <IconSymbol name="arrow.clockwise" size={24} color="#fff" />
              <ThemedText style={styles.videoActionText}>Replay</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.videoActionButton}
              onPress={closeVideoPlayer}
            >
              <IconSymbol name="checkmark" size={24} color="#fff" />
              <ThemedText style={styles.videoActionText}>Done</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </Modal>

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

      {/* Invite Modal */}
      <InviteModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        groupId={group.id.toString()}
        existingMembers={group.members?.map(member => 
          typeof member === 'string' ? member : member.user_id?.toString() || ''
        ) || []}
        invitedUsers={['2', '5']} // Mock invited users for testing
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  // BeReal Style Header
  berealHeader: {
    backgroundColor: "#000",
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  berealHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  berealBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  berealMoreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  berealHeaderContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  berealHeaderTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  berealHeaderStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  berealMemberCount: {
    fontSize: 12,
    fontWeight: "500",
    color: "#888",
  },
  berealDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#888",
  },
  berealDueDate: {
    fontSize: 12,
    fontWeight: "500",
    color: "#888",
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
  heroSection: {
    marginBottom: 20,
  },
  groupCover: {
    height: 200,
    backgroundColor: "#1a1a1a",
    position: "relative",
    overflow: "hidden",
  },
  coverGradient: {
    flex: 1,
    backgroundColor: "linear-gradient(45deg, #007AFF, #4CAF50)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  promptLarge: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    lineHeight: 32,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statsCard: {
    backgroundColor: "#1a1a1a",
    marginHorizontal: 20,
    marginTop: -30,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#333",
    marginHorizontal: 10,
  },
  dueDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  weaveButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#667eea",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  weaveButtonCompactText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  viewButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#9C27B0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#9C27B0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  viewButtonCompactText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionActionText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  sectionActionDisabled: {
    opacity: 0.6,
  },
  sectionActionTextDisabled: {
    color: "#666",
  },
  activityFeed: {
    gap: 12,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 2,
  },
  activityUser: {
    fontWeight: "600",
    color: "#fff",
  },
  activityTime: {
    fontSize: 12,
    color: "#888",
  },
  memberList: {
    gap: 12,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  memberAvatarSubmitted: {
    borderWidth: 3,
    borderColor: "#4CAF50",
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  submittedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1a1a1a",
  },
  memberDetails: {
    flex: 1,
  },
  memberNameCard: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  memberStatus: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },
  memberAction: {
    padding: 8,
  },
  // Weaved Video Preview Styles
  weavedVideoPreview: {
    marginTop: 8,
  },
  weavedVideoContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 2,
    borderColor: "#9C27B0",
  },
  weavedVideoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  weavedVideoInfo: {
    flex: 1,
  },
  weavedVideoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  weavedVideoSubtitle: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  videoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
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
  submittedVideoText: {
    fontSize: 10,
    color: "#4CAF50",
    fontWeight: "600",
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
  completedActions: {
    gap: 12,
  },
  weavedActions: {
    gap: 12,
  },
  primaryWeavedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9C27B0",
    borderRadius: 20,
    paddingVertical: 16,
    gap: 8,
    shadowColor: "#9C27B0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryWeavedButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  weaveButton: {
    backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  weaveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weaveButtonText: {
    flex: 1,
    marginLeft: 16,
  },
  weaveButtonTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  weaveButtonSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
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
  yourVideoIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(76, 175, 80, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  yourVideoText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
  },
  // Video Player Modal Styles
  videoPlayerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoPlayerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeVideoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlayerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  videoPlayerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoControlsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoInfo: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  videoGroup: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  videoDuration: {
    fontSize: 14,
    color: "#fff",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "600",
  },
  videoPlayerActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 40,
    paddingVertical: 30,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  videoActionButton: {
    alignItems: "center",
    gap: 8,
  },
  videoActionText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
});
