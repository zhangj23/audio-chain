import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  Alert,
  Image,
  TextInput,
  Share,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useEffect } from "react";
import { useProfile } from "../../contexts/ProfileContext";
import { useAuth } from "../../contexts/AuthContext";
import { videoStorage } from "../../utils/videoStorage";
import * as ImagePicker from "expo-image-picker";

const { width } = Dimensions.get("window");

// Dynamic tile sizing function
const getTileWidth = () => {
  const sectionPadding = 40; // 20px on each side
  const tilesPerRow = 2.5; // Bigger tiles, showing 2.5 per row
  const gapBetweenTiles = 2; // gap between tiles
  const totalGapWidth = (tilesPerRow - 1) * gapBetweenTiles;
  const availableWidth = width - sectionPadding;
  return (availableWidth - totalGapWidth) / tilesPerRow;
};

const getTileFontSizes = () => {
  const tileWidth = getTileWidth();
  const baseFontSize = Math.max(8, Math.min(12, tileWidth * 0.08));
  return {
    group: Math.round(baseFontSize + 1),
    prompt: Math.round(baseFontSize),
    time: Math.round(baseFontSize - 1),
    duration: Math.round(baseFontSize),
  };
};

// Mock user data
const userData = {
  name: "Alex Johnson",
  username: "@alexj_creates",
  bio: "Making memories one video at a time ✨\nCollege student | Coffee lover ☕",
  profilePicture: null, // Will be actual image later
  stats: {
    groupsJoined: 12,
    videosCreated: 47,
    friendsConnected: 23,
    weavesCreated: 8,
  },
  achievements: [
    {
      id: 1,
      title: "First Video",
      description: "Created your first Weave video",
      earned: true,
    },
    {
      id: 2,
      title: "Group Creator",
      description: "Created 5 friend groups",
      earned: true,
    },
    {
      id: 3,
      title: "Weekly Warrior",
      description: "Posted videos 7 days in a row",
      earned: false,
    },
    {
      id: 4,
      title: "Social Butterfly",
      description: "Connected with 50+ friends",
      earned: false,
    },
  ],
};

// Mock recent activity
const recentActivity = [
  { id: 1, type: "video", group: "College Friends 🎓", time: "2h ago" },
  { id: 2, type: "group", group: "Work Squad 💼", time: "1d ago" },
  { id: 3, type: "video", group: "Family Fun 👨‍👩‍👧‍👦", time: "3d ago" },
];

// Mock favorited weaves
const favoritedWeaves = [
  {
    id: 1,
    groupName: "College Friends 🎓",
    prompt: "Show us your vibe right now! ✨",
    thumbnail: null,
    createdAt: "2 days ago",
    duration: "12s",
  },
  {
    id: 2,
    groupName: "Family Fun 👨‍👩‍👧‍👦",
    prompt: "What's making you smile rn? 😊",
    thumbnail: null,
    createdAt: "1 week ago",
    duration: "15s",
  },
  {
    id: 3,
    groupName: "Work Squad 💼",
    prompt: "Drop your main character moment 💫",
    thumbnail: null,
    createdAt: "2 weeks ago",
    duration: "8s",
  },
];

export default function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  // Use profile context
  const { profileImage, setProfileImage, userName, setUserName } = useProfile();

  // Use auth context for logout
  const { logout } = useAuth();

  // Profile editing state
  const [editedName, setEditedName] = useState(userName);
  const [editedBio, setEditedBio] = useState(userData.bio);

  // Dynamic counters state
  const [dynamicStats, setDynamicStats] = useState({
    groupsJoined: 0,
    videosCreated: 0,
    friendsConnected: 0,
    weavesCreated: 0,
  });

  // Calculate dynamic stats
  useEffect(() => {
    const calculateStats = () => {
      // Get all videos from storage
      const allVideos = videoStorage.getAllVideos();
      const totalVideos = Object.values(allVideos).length;

      // Mock groups data (in a real app, this would come from a groups context/API)
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
          isWeaved: false,
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
          isWeaved: true,
        },
        {
          id: "3",
          name: "Work Squad 💼",
          members: ["You", "Tom", "Emma", "Chris", "Sam"],
          videosSubmitted: 1,
          totalMembers: 5,
          dueDate: "1d left",
          prompt: "Drop your main character moment 💫",
          isRevealed: false,
          isWeaved: false,
        },
      ];

      // Calculate actual stats
      const groupsJoined = mockGroups.length;
      const videosCreated = totalVideos;
      const friendsConnected = mockGroups.reduce((total, group) => {
        // Count unique friends (excluding "You")
        return (
          total + group.members.filter((member) => member !== "You").length
        );
      }, 0);
      const weavesCreated = mockGroups.filter((group) => group.isWeaved).length;

      setDynamicStats({
        groupsJoined,
        videosCreated,
        friendsConnected,
        weavesCreated,
      });
    };

    calculateStats();

    // Subscribe to video storage changes to update counts
    const unsubscribe = videoStorage.subscribe(() => {
      calculateStats();
    });

    return unsubscribe;
  }, []);

  const editProfile = () => {
    if (isEditing) {
      // Save changes
      setUserName(editedName);
      userData.name = editedName;
      userData.bio = editedBio;
      setIsEditing(false); // Exit edit mode after saving
      Alert.alert("Profile Updated", "Your changes have been saved!");
    } else {
      setIsEditing(true); // Enter edit mode
    }
  };

  const cancelEdit = () => {
    // Reset to original values
    setEditedName(userName);
    setEditedBio(userData.bio);
    setIsEditing(false);
  };

  const openCamera = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Camera permission is required to take photos"
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
        Alert.alert("Success", "Profile picture updated!");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
      console.error(error);
    }
  };

  const openGallery = async () => {
    try {
      // Request media library permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Photo library permission is required to select photos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
        Alert.alert("Success", "Profile picture updated!");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select photo");
      console.error(error);
    }
  };

  const changeProfilePicture = () => {
    Alert.alert("Change Profile Picture", "Choose your new profile photo", [
      {
        text: "Camera",
        onPress: openCamera,
      },
      {
        text: "Gallery",
        onPress: openGallery,
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const shareProfile = async () => {
    try {
      const result = await Share.share({
        message: `Check out ${userName}'s Weave profile! 🎥✨\n\nJoin me on Weave and let's create amazing video memories together!`,
        title: "Share Weave Profile",
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log("Shared with activity type:", result.activityType);
        } else {
          console.log("Profile shared successfully");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to share profile");
      console.error("Share error:", error);
    }
  };

  const openSettings = () => {
    Alert.alert("Settings", "Settings page coming soon!");
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.error("Logout failed:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <ThemedText style={styles.statNumber}>
          {dynamicStats.groupsJoined}
        </ThemedText>
        <ThemedText style={styles.statLabel}>Groups</ThemedText>
      </View>
      <View style={styles.statItem}>
        <ThemedText style={styles.statNumber}>
          {dynamicStats.videosCreated}
        </ThemedText>
        <ThemedText style={styles.statLabel}>Videos</ThemedText>
      </View>
      <View style={styles.statItem}>
        <ThemedText style={styles.statNumber}>
          {dynamicStats.friendsConnected}
        </ThemedText>
        <ThemedText style={styles.statLabel}>Friends</ThemedText>
      </View>
      <View style={styles.statItem}>
        <ThemedText style={styles.statNumber}>
          {dynamicStats.weavesCreated}
        </ThemedText>
        <ThemedText style={styles.statLabel}>Weaves</ThemedText>
      </View>
    </View>
  );

  const renderFavoritedWeaves = () => (
    <View style={styles.favoritesSection}>
      <ThemedText style={styles.sectionTitle}>Favorited Weaves</ThemedText>
      {favoritedWeaves.length > 0 ? (
        <View style={styles.weavesGrid}>
          {favoritedWeaves.map((weave) => (
            <TouchableOpacity key={weave.id} style={styles.weaveTile}>
              <View style={styles.weaveTileContainer}>
                <View style={styles.weaveTileThumbnail}>
                  {weave.thumbnail ? (
                    <Image
                      source={{ uri: weave.thumbnail }}
                      style={styles.weaveTileImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <IconSymbol name="video.fill" size={32} color="#666" />
                  )}
                  <View style={styles.weaveTileDuration}>
                    <ThemedText style={styles.weaveTileDurationText}>
                      {weave.duration}
                    </ThemedText>
                  </View>
                  <TouchableOpacity style={styles.weaveTileFavoriteButton}>
                    <IconSymbol name="heart.fill" size={12} color="#ff6b6b" />
                  </TouchableOpacity>
                  {/* Subtle timestamp overlay */}
                  <View style={styles.weaveTileTimestamp}>
                    <ThemedText style={styles.weaveTileTimestampText}>
                      {weave.createdAt}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.weaveTileInfo}>
                  <ThemedText style={styles.weaveTileGroup} numberOfLines={1}>
                    {weave.groupName}
                  </ThemedText>
                  <ThemedText style={styles.weaveTilePrompt} numberOfLines={2}>
                    {weave.prompt}
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol name="heart" size={32} color="#666" />
          <ThemedText style={styles.emptyStateText}>
            No favorited weaves yet
          </ThemedText>
          <ThemedText style={styles.emptyStateSubtext}>
            Tap the heart icon on weaves you love to save them here
          </ThemedText>
        </View>
      )}
    </View>
  );

  const renderAchievements = () => {
    const earnedCount = userData.achievements.filter((a) => a.earned).length;

    return (
      <View style={styles.achievementSection}>
        <TouchableOpacity
          style={styles.achievementToggle}
          onPress={() => setShowAchievements(!showAchievements)}
        >
          <View style={styles.achievementHeader}>
            <View style={styles.achievementBadge}>
              <IconSymbol
                name="star.fill"
                size={12}
                color={earnedCount > 0 ? "#FFD700" : "#555"}
              />
              <ThemedText style={styles.achievementCount}>
                {earnedCount}
              </ThemedText>
            </View>
            <ThemedText style={styles.achievementToggleText}>
              Achievements
            </ThemedText>
          </View>
          <IconSymbol
            name={showAchievements ? "chevron.up" : "chevron.down"}
            size={12}
            color="#666"
          />
        </TouchableOpacity>

        {showAchievements && (
          <View style={styles.achievementsContainer}>
            <View style={styles.achievementsGrid}>
              {userData.achievements.map((achievement) => (
                <TouchableOpacity
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    achievement.earned && styles.achievementEarned,
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={styles.achievementIcon}>
                    <IconSymbol
                      name={achievement.earned ? "star.fill" : "star"}
                      size={14}
                      color={achievement.earned ? "#FFD700" : "#555"}
                    />
                  </View>
                  <View style={styles.achievementContent}>
                    <ThemedText style={styles.achievementTitle}>
                      {achievement.title}
                    </ThemedText>
                    <ThemedText style={styles.achievementDesc}>
                      {achievement.description}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderRecentActivity = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Recent Activity</ThemedText>
      {recentActivity.map((activity) => (
        <View key={activity.id} style={styles.activityItem}>
          <View style={styles.activityIcon}>
            <IconSymbol
              name={activity.type === "video" ? "video.fill" : "person.2.fill"}
              size={16}
              color="#007AFF"
            />
          </View>
          <View style={styles.activityInfo}>
            <ThemedText style={styles.activityText}>
              {activity.type === "video" ? "Posted video in" : "Joined"}{" "}
              {activity.group}
            </ThemedText>
            <ThemedText style={styles.activityTime}>{activity.time}</ThemedText>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Profile</ThemedText>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={shareProfile}>
            <IconSymbol name="square.and.arrow.up" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={openSettings}>
            <IconSymbol name="gearshape.fill" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            style={styles.profilePictureContainer}
          >
            <View style={styles.profilePicture}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <IconSymbol name="person.fill" size={40} color="#666" />
              )}
            </View>
            <View style={styles.editBadge}>
              <IconSymbol name="pencil" size={10} color="#000" />
            </View>
          </TouchableOpacity>

          {/* Profile Picture Change Button - only visible in edit mode */}
          {isEditing && (
            <TouchableOpacity
              onPress={changeProfilePicture}
              style={styles.changePhotoButton}
            >
              <IconSymbol name="camera.fill" size={14} color="#007AFF" />
              <ThemedText style={styles.changePhotoText}>
                Change Photo
              </ThemedText>
            </TouchableOpacity>
          )}

          {isEditing ? (
            <TextInput
              style={styles.editableUserName}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Enter your name"
              placeholderTextColor="#888"
              multiline={false}
              maxLength={50}
              autoCapitalize="words"
              returnKeyType="next"
              selectionColor="#007AFF"
            />
          ) : (
            <ThemedText style={styles.userName}>{editedName}</ThemedText>
          )}

          <ThemedText style={styles.userHandle}>{userData.username}</ThemedText>

          {isEditing ? (
            <TextInput
              style={styles.editableBio}
              value={editedBio}
              onChangeText={setEditedBio}
              placeholder="Tell us about yourself... Share what makes you unique, your interests, or what you love about creating videos!"
              placeholderTextColor="#888"
              multiline={true}
              maxLength={200}
              textAlignVertical="top"
              autoCapitalize="sentences"
              returnKeyType="done"
              selectionColor="#007AFF"
              scrollEnabled={true}
            />
          ) : (
            <ThemedText style={styles.userBio}>{editedBio}</ThemedText>
          )}

          {renderStats()}

          {isEditing && (
            <View style={styles.editButtonsContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelEdit}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={editProfile}>
                <ThemedText style={styles.saveButtonText}>
                  Save Changes
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {renderFavoritedWeaves()}
        {renderRecentActivity()}

        {/* Achievements */}
        <View style={styles.section}>{renderAchievements()}</View>

        {/* Account Actions */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Account</ThemedText>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.logoutButtonContent}>
              <View style={styles.logoutIconContainer}>
                <IconSymbol name="power" size={18} color="#fff" />
              </View>
              <ThemedText style={styles.logoutButtonText}>Sign Out</ThemedText>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: 20,
    backgroundColor: "#000",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  profilePictureContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#333",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
    color: "#fff",
  },
  userHandle: {
    fontSize: 16,
    color: "#888",
    marginBottom: 12,
    fontWeight: "400",
  },
  userBio: {
    fontSize: 14,
    textAlign: "center",
    color: "#ccc",
    lineHeight: 20,
    marginBottom: 20,
    fontWeight: "400",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingVertical: 20,
    marginBottom: 8,
    backgroundColor: "transparent",
    marginHorizontal: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    color: "#fff",
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
  },
  editButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
    backgroundColor: "transparent",
    marginHorizontal: 20,
    paddingVertical: 8,
  },
  favoritesSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
    marginTop: 12,
    backgroundColor: "transparent",
    marginHorizontal: 20,
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#fff",
  },
  achievementsGrid: {
    gap: 10,
  },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    padding: 12,
    borderWidth: 0,
    marginBottom: 8,
  },
  achievementEarned: {
    opacity: 1,
  },
  achievementIcon: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
    gap: 2,
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    lineHeight: 16,
  },
  achievementDesc: {
    fontSize: 10,
    color: "#aaa",
    lineHeight: 14,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  activityInfo: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    marginBottom: 2,
    color: "#fff",
  },
  activityTime: {
    fontSize: 12,
    color: "#888",
  },
  achievementSection: {
    marginTop: 16,
  },
  achievementToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  achievementHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  achievementBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  achievementCount: {
    fontSize: 10,
    color: "#FFD700",
    fontWeight: "600",
  },
  achievementToggleText: {
    fontSize: 13,
    color: "#ccc",
    fontWeight: "500",
  },
  achievementsContainer: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  profileImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileImagePlaceholder: {
    fontSize: 30,
  },
  editableUserName: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
    color: "#fff",
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 8,
    textAlign: "center",
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
  },
  editableBio: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
    marginBottom: 20,
    fontWeight: "400",
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 8,
    textAlign: "center",
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
    minHeight: 60,
  },
  editButtonsContainer: {
    flexDirection: "row",
    gap: 24,
    width: "100%",
    justifyContent: "center",
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#888",
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
    textAlign: "center",
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  logoutButton: {
    backgroundColor: "#ff4444",
    borderRadius: 12,
    marginTop: 8,
    shadowColor: "#ff4444",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  logoutIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    marginTop: 8,
    gap: 6,
  },
  changePhotoText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  weavesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  weaveTile: {
    width: getTileWidth(),
    marginBottom: 3,
    marginRight: 2,
  },
  weaveTileContainer: {
    backgroundColor: "#111",
    borderRadius: 8,
    borderWidth: 0,
    overflow: "hidden",
  },
  weaveTileThumbnail: {
    width: "100%",
    aspectRatio: 9 / 16, // Vertical video aspect ratio
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  weaveTileImage: {
    width: "100%",
    height: "100%",
  },
  weaveTileDuration: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  weaveTileDurationText: {
    fontSize: getTileFontSizes().duration,
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  weaveTileFavoriteButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  weaveTileTimestamp: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  weaveTileTimestampText: {
    fontSize: Math.max(7, getTileFontSizes().time - 1),
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  weaveTileInfo: {
    padding: 10,
    gap: 4,
  },
  weaveTileGroup: {
    fontSize: getTileFontSizes().group,
    fontWeight: "600",
    color: "#fff",
  },
  weaveTilePrompt: {
    fontSize: getTileFontSizes().prompt,
    color: "#aaa",
    lineHeight: getTileFontSizes().prompt + 3,
    marginTop: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});
