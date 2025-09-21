import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { apiService, GroupInvite } from "@/services/api";

interface InvitesModalProps {
  visible: boolean;
  onClose: () => void;
  onInviteAccepted?: () => void;
}

export function InvitesModal({
  visible,
  onClose,
  onInviteAccepted,
}: InvitesModalProps) {
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingInvite, setProcessingInvite] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      fetchInvites();
    }
  }, [visible]);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const pendingInvites = await apiService.getPendingInvites();
      console.log("InvitesModal - Fetched invites:", pendingInvites);

      // Filter out any undefined or invalid invites
      const validInvites = pendingInvites.filter(
        (invite) =>
          invite && invite.id && invite.group_id && invite.invited_username
      );

      console.log(
        "InvitesModal - Valid invites after filtering:",
        validInvites
      );

      // Sort by created_at descending (most recent first)
      const sortedInvites = validInvites.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setInvites(sortedInvites);
    } catch (error) {
      console.error("Failed to fetch invites:", error);
      Alert.alert("Error", "Failed to load invites. Please try again.");
      setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (inviteId: number) => {
    try {
      setProcessingInvite(inviteId);
      await apiService.acceptInvite(inviteId);

      // Remove the accepted invite from the list
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId));

      Alert.alert("Success", "You've joined the group!");
      onInviteAccepted?.();
    } catch (error) {
      console.error("Failed to accept invite:", error);
      Alert.alert("Error", "Failed to accept invite. Please try again.");
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleDeclineInvite = async (inviteId: number) => {
    try {
      setProcessingInvite(inviteId);
      await apiService.declineInvite(inviteId);

      // Remove the declined invite from the list
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId));

      Alert.alert("Success", "Invite declined.");
    } catch (error) {
      console.error("Failed to decline invite:", error);
      Alert.alert("Error", "Failed to decline invite. Please try again.");
    } finally {
      setProcessingInvite(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color="#8E8E93" />
          </TouchableOpacity>
          <ThemedText style={styles.title}>Group Invites</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <ThemedText style={styles.loadingText}>
              Loading invites...
            </ThemedText>
          </View>
        ) : invites.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="envelope" size={48} color="#8E8E93" />
            <ThemedText style={styles.emptyTitle}>
              No pending invites
            </ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              You don't have any group invitations at the moment
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            style={styles.invitesList}
            showsVerticalScrollIndicator={false}
          >
            {invites
              .filter(
                (invite) =>
                  invite &&
                  invite.id &&
                  invite.group_id &&
                  invite.invited_username
              )
              .map((invite) => (
                <View key={invite.id} style={styles.inviteCard}>
                  <View style={styles.inviteHeader}>
                    <View style={styles.inviteInfo}>
                      <ThemedText style={styles.groupName}>
                        {invite.group?.name || `Group ${invite.group_id}`}
                      </ThemedText>
                      <ThemedText style={styles.invitedBy}>
                        Invited by{" "}
                        {invite.invited_by_user?.username || "Unknown User"}
                      </ThemedText>
                      <ThemedText style={styles.inviteDate}>
                        {formatDate(invite.created_at)}
                      </ThemedText>
                    </View>
                    {isExpired(invite.expires_at) && (
                      <View style={styles.expiredBadge}>
                        <ThemedText style={styles.expiredText}>
                          Expired
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  {invite.group?.description && (
                    <ThemedText style={styles.groupDescription}>
                      {invite.group.description}
                    </ThemedText>
                  )}

                  {!isExpired(invite.expires_at) && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.declineButton]}
                        onPress={() => handleDeclineInvite(invite.id)}
                        disabled={processingInvite === invite.id}
                      >
                        {processingInvite === invite.id ? (
                          <ActivityIndicator size="small" color="#FF3B30" />
                        ) : (
                          <ThemedText style={styles.declineButtonText}>
                            Decline
                          </ThemedText>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton]}
                        onPress={() => handleAcceptInvite(invite.id)}
                        disabled={processingInvite === invite.id}
                      >
                        {processingInvite === invite.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <ThemedText style={styles.acceptButtonText}>
                            Accept
                          </ThemedText>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
          </ScrollView>
        )}
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
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
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
  },
  invitesList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inviteCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  inviteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  inviteInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  invitedBy: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 2,
  },
  inviteDate: {
    fontSize: 12,
    color: "#8E8E93",
  },
  expiredBadge: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  expiredText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  groupDescription: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 16,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  declineButton: {
    backgroundColor: "#2a2a2a",
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  declineButtonText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
  },
  acceptButton: {
    backgroundColor: "#007AFF",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
