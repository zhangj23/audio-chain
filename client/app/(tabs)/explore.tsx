import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  Alert,
  Image,
  TextInput,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useEffect } from "react";
import { useProfile } from "../../contexts/ProfileContext";
import { videoStorage } from "../../utils/videoStorage";
import * as ImagePicker from "expo-image-picker";

const { width } = Dimensions.get("window");

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

export default function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  // Use profile context
  const { profileImage, setProfileImage, userName, setUserName } = useProfile();

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
      Alert.alert("Profile Updated", "Your changes have been saved!");
    }
    setIsEditing(!isEditing);
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

  const shareProfie = () => {
    Alert.alert("Share Profile", "Share your Weave profile with friends!");
  };

  const openSettings = () => {
    Alert.alert("Settings", "Settings page coming soon!");
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

  const renderAchievements = () => {
    const earnedCount = userData.achievements.filter((a) => a.earned).length;

    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.achievementToggle}
          onPress={() => setShowAchievements(!showAchievements)}
        >
          <View style={styles.achievementHeader}>
            <IconSymbol
              name={earnedCount > 0 ? "star.fill" : "star"}
              size={16}
              color="#888"
            />
            <ThemedText style={styles.achievementToggleText}>
              {earnedCount}/{userData.achievements.length} achievements
            </ThemedText>
          </View>
          <IconSymbol
            name={showAchievements ? "chevron.up" : "chevron.down"}
            size={14}
            color="#666"
          />
        </TouchableOpacity>

        {showAchievements && (
          <View style={styles.achievementsGrid}>
            {userData.achievements.map((achievement) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  achievement.earned && styles.achievementEarned,
                ]}
              >
                <IconSymbol
                  name={achievement.earned ? "star.fill" : "star"}
                  size={20}
                  color={achievement.earned ? "#fff" : "#666"}
                />
                <ThemedText style={styles.achievementTitle}>
                  {achievement.title}
                </ThemedText>
                <ThemedText style={styles.achievementDesc}>
                  {achievement.description}
                </ThemedText>
              </View>
            ))}
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
          <TouchableOpacity style={styles.headerButton} onPress={shareProfie}>
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
            onPress={changeProfilePicture}
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
              <IconSymbol name="camera.fill" size={12} color="#000" />
            </View>
          </TouchableOpacity>

          {isEditing ? (
            <TextInput
              style={styles.editableUserName}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Your name"
              placeholderTextColor="#666"
              multiline={false}
              maxLength={50}
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
              placeholder="Tell us about yourself..."
              placeholderTextColor="#666"
              multiline={true}
              maxLength={200}
              textAlignVertical="top"
            />
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <ThemedText style={styles.userBio}>{editedBio}</ThemedText>
            </TouchableOpacity>
          )}

          {renderStats()}

          {isEditing ? (
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
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={editProfile}>
              <ThemedText style={styles.editButtonText}>
                Edit Profile
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {renderAchievements()}
        {renderRecentActivity()}

        {/* My Groups Quick Access */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>My Groups</ThemedText>
          <TouchableOpacity style={styles.quickAction}>
            <IconSymbol name="person.3.fill" size={20} color="#fff" />
            <ThemedText style={styles.quickActionText}>
              Manage My Groups
            </ThemedText>
            <IconSymbol name="chevron.right" size={16} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Privacy & Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            Privacy & Settings
          </ThemedText>
          <TouchableOpacity style={styles.quickAction}>
            <IconSymbol name="lock.fill" size={20} color="#fff" />
            <ThemedText style={styles.quickActionText}>
              Privacy Settings
            </ThemedText>
            <IconSymbol name="chevron.right" size={16} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <IconSymbol name="bell.fill" size={20} color="#fff" />
            <ThemedText style={styles.quickActionText}>
              Notifications
            </ThemedText>
            <IconSymbol name="chevron.right" size={16} color="#888" />
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
    paddingBottom: 30,
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
    paddingVertical: 16,
    marginBottom: 24,
    backgroundColor: "#0a0a0a",
    borderRadius: 12,
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
    backgroundColor: "#0a0a0a",
    borderRadius: 12,
    marginHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#fff",
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  achievementCard: {
    width: (width - 52) / 2,
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  achievementEarned: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#555",
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 4,
    textAlign: "center",
    color: "#fff",
  },
  achievementDesc: {
    fontSize: 10,
    color: "#888",
    textAlign: "center",
    lineHeight: 12,
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
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  quickActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 12,
    color: "#fff",
  },
  achievementToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
  },
  achievementHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  achievementToggleText: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
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
    fontWeight: "700",
    marginBottom: 4,
    color: "#fff",
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  editableBio: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
    marginBottom: 20,
    fontWeight: "400",
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#333",
    minHeight: 80,
  },
  editButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#333",
    flex: 1,
    maxWidth: 120,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#333",
    flex: 1,
    maxWidth: 120,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
});
