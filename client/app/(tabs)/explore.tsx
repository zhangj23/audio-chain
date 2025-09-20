import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  Alert,
  Image,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState } from "react";

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
    totalViews: "2.1K",
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
  const router = useRouter();

  const editProfile = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      Alert.alert("Profile Updated", "Your changes have been saved!");
    }
  };

  const changeProfilePicture = () => {
    Alert.alert("Change Profile Picture", "Choose your new profile photo", [
      { text: "Camera", onPress: () => console.log("Open camera") },
      { text: "Gallery", onPress: () => console.log("Open gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const shareProfie = () => {
    Alert.alert("Share Profile", "Share your Weave profile with friends!");
  };

  const openSettings = () => {
    router.push("/settings");
  };

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <ThemedText style={styles.statNumber}>
          {userData.stats.groupsJoined}
        </ThemedText>
        <ThemedText style={styles.statLabel}>Groups</ThemedText>
      </View>
      <View style={styles.statItem}>
        <ThemedText style={styles.statNumber}>
          {userData.stats.videosCreated}
        </ThemedText>
        <ThemedText style={styles.statLabel}>Videos</ThemedText>
      </View>
      <View style={styles.statItem}>
        <ThemedText style={styles.statNumber}>
          {userData.stats.friendsConnected}
        </ThemedText>
        <ThemedText style={styles.statLabel}>Friends</ThemedText>
      </View>
      <View style={styles.statItem}>
        <ThemedText style={styles.statNumber}>
          {userData.stats.totalViews}
        </ThemedText>
        <ThemedText style={styles.statLabel}>Views</ThemedText>
      </View>
    </View>
  );

  const renderAchievements = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Achievements</ThemedText>
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
              size={24}
              color={achievement.earned ? "#FFD700" : "#666"}
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
    </View>
  );

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
              <IconSymbol name="person.fill" size={40} color="#666" />
            </View>
            <View style={styles.editBadge}>
              <IconSymbol name="camera.fill" size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          <ThemedText style={styles.userName}>{userData.name}</ThemedText>
          <ThemedText style={styles.userHandle}>{userData.username}</ThemedText>

          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <ThemedText style={styles.userBio}>{userData.bio}</ThemedText>
          </TouchableOpacity>

          {renderStats()}

          <TouchableOpacity style={styles.editButton} onPress={editProfile}>
            <ThemedText style={styles.editButtonText}>
              {isEditing ? "Save Changes" : "Edit Profile"}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {renderAchievements()}
        {renderRecentActivity()}

        {/* My Groups Quick Access */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>My Groups</ThemedText>
          <TouchableOpacity style={styles.quickAction}>
            <IconSymbol name="person.3.fill" size={20} color="#007AFF" />
            <ThemedText style={styles.quickActionText}>
              Manage My Groups
            </ThemedText>
            <IconSymbol name="chevron.right" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Privacy & Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            Privacy & Settings
          </ThemedText>
          <TouchableOpacity style={styles.quickAction}>
            <IconSymbol name="lock.fill" size={20} color="#007AFF" />
            <ThemedText style={styles.quickActionText}>
              Privacy Settings
            </ThemedText>
            <IconSymbol name="chevron.right" size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <IconSymbol name="bell.fill" size={20} color="#007AFF" />
            <ThemedText style={styles.quickActionText}>
              Notifications
            </ThemedText>
            <IconSymbol name="chevron.right" size={16} color="#666" />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
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
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 12,
  },
  userBio: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.8,
    lineHeight: 20,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingVertical: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  editButton: {
    backgroundColor: "#007AFF",
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  achievementCard: {
    width: (width - 52) / 2,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  achievementEarned: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
  },
  achievementDesc: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  activityInfo: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  quickActionText: {
    flex: 1,
    fontSize: 16,
  },
});
