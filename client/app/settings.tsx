import { useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "../contexts/AuthContext";

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, deleteAccount } = useAuth();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [weaveActivityEnabled, setWeaveActivityEnabled] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (e) {
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  const confirmDeleteAccount = () => {
    setDeletePassword("");
    setShowDeleteModal(true);
  };

  const performDelete = async () => {
    if (!deletePassword) {
      Alert.alert("Password required", "Please enter your password.");
      return;
    }
    try {
      setIsDeleting(true);
      await deleteAccount(deletePassword);
      setShowDeleteModal(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete account";
      Alert.alert("Error", message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header with back button (reverse animation) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <IconSymbol name="chevron.left" size={18} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifications */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Notifications</ThemedText>

          <View style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <View style={styles.itemIcon}><IconSymbol name="bell" size={18} color="#007AFF" /></View>
              <View>
                <ThemedText style={styles.itemTitle}>Push notifications</ThemedText>
                <ThemedText style={styles.itemSubtitle}>Announcements, reminders, and activity</ThemedText>
              </View>
            </View>
            <Switch value={pushEnabled} onValueChange={setPushEnabled} />
          </View>

          <View style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <View style={styles.itemIcon}><IconSymbol name="video" size={18} color="#007AFF" /></View>
              <View>
                <ThemedText style={styles.itemTitle}>Weave video notifications</ThemedText>
                <ThemedText style={styles.itemSubtitle}>Friends' new posts and activity</ThemedText>
              </View>
            </View>
            <Switch value={weaveActivityEnabled} onValueChange={setWeaveActivityEnabled} />
          </View>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Alert.alert("Manage Notifications", "You can fine-tune notifications in your device settings.")}
          >
            <ThemedText style={styles.linkText}>Manage in iOS Settings</ThemedText>
            <IconSymbol name="chevron.right" size={14} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Account</ThemedText>

          <TouchableOpacity style={styles.button} onPress={handleLogout}>
            <View style={styles.buttonLeft}>
              <View style={styles.logoutIcon}><IconSymbol name="power" size={16} color="#fff" /></View>
              <ThemedText style={styles.buttonText}>Log out</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={14} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={confirmDeleteAccount}
          >
            <View style={styles.buttonLeft}>
              <View style={styles.deleteIcon}><IconSymbol name="trash" size={16} color="#fff" /></View>
              <ThemedText style={[styles.buttonText, styles.dangerText]}>Delete account</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={14} color="#666" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>Confirm deletion</ThemedText>
            <ThemedText style={styles.modalSubtitle}>
              Enter your password to permanently delete your account.
            </ThemedText>
            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Password"
              placeholderTextColor="#888"
              secureTextEntry
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDelete, isDeleting && styles.modalDeleteDisabled]}
                onPress={performDelete}
                disabled={isDeleting}
              >
                <ThemedText style={styles.modalDeleteText}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: "#000",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  headerRightPlaceholder: {
    width: 36,
    height: 36,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#111",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  itemIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  itemTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  itemSubtitle: {
    color: "#888",
    fontSize: 12,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  linkText: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "500",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  buttonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoutIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ff4444",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  dangerButton: {
    marginTop: 8,
  },
  dangerText: {
    color: "#ff6b6b",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalSubtitle: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 14,
  },
  modalCancel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: "#aaa",
    fontSize: 15,
    fontWeight: "500",
  },
  modalDelete: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ff4444",
    borderRadius: 10,
  },
  modalDeleteDisabled: {
    opacity: 0.6,
  },
  modalDeleteText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
