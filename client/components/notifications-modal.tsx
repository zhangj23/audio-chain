import React from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";

const { height } = Dimensions.get("window");

interface NotificationItem {
  id: string;
  type: "invite" | "submission" | "deadline";
  title: string;
  message: string;
  timestamp: string;
  groupName?: string;
  userName?: string;
  groupId?: number;
  inviteId?: number;
  isRead: boolean;
}

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead?: (notificationId: string) => void;
  onNotificationPress?: (notification: NotificationItem) => void;
  onAcceptInvite?: (inviteId: number) => void;
  onDeclineInvite?: (inviteId: number) => void;
}

export function NotificationsModal({
  visible,
  onClose,
  notifications,
  onMarkAsRead,
  onNotificationPress,
  onAcceptInvite,
  onDeclineInvite,
}: NotificationsModalProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "invite":
        return "person.badge.plus";
      case "submission":
        return "video.fill";
      case "deadline":
        return "clock.fill";
      default:
        return "bell";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "invite":
        return "#007AFF";
      case "submission":
        return "#4CAF50";
      case "deadline":
        return "#FF9500";
      default:
        return "#8E8E93";
    }
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    
    if (onNotificationPress) {
      onNotificationPress(notification);
    }
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
          <View style={styles.headerContent}>
            <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </ThemedText>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <IconSymbol name="xmark" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Notifications List */}
        <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="bell.slash" size={48} color="#8E8E93" />
              <ThemedText style={styles.emptyTitle}>No notifications</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                You'll see notifications here when people post videos or invite you to groups
              </ThemedText>
            </View>
          ) : (
            notifications.map((notification) => (
              <View
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.isRead && styles.unreadNotification,
                ]}
              >
                <View style={styles.notificationContent}>
                  <View style={styles.notificationIcon}>
                    <IconSymbol
                      name={getNotificationIcon(notification.type)}
                      size={20}
                      color={getNotificationColor(notification.type)}
                    />
                  </View>
                  <View style={styles.notificationText}>
                    <ThemedText style={styles.notificationTitle}>
                      {notification.title}
                    </ThemedText>
                    <ThemedText style={styles.notificationMessage}>
                      {notification.message}
                    </ThemedText>
                    <ThemedText style={styles.notificationTime}>
                      {formatTimestamp(notification.timestamp)}
                    </ThemedText>
                  </View>
                  {!notification.isRead && <View style={styles.unreadDot} />}
                </View>
                
                {/* Action buttons for invite notifications */}
                {notification.type === "invite" && notification.inviteId && (
                  <View style={styles.inviteActions}>
                    <TouchableOpacity
                      style={styles.declineButton}
                      onPress={() => onDeclineInvite?.(notification.inviteId!)}
                    >
                      <ThemedText style={styles.declineButtonText}>Decline</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => onAcceptInvite?.(notification.inviteId!)}
                    >
                      <ThemedText style={styles.acceptButtonText}>Accept</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* For non-invite notifications, make the whole item clickable */}
                {notification.type !== "invite" && (
                  <TouchableOpacity
                    style={styles.clickableOverlay}
                    onPress={() => handleNotificationPress(notification)}
                  />
                )}
              </View>
            ))
          )}
        </ScrollView>

        {/* Footer Actions */}
        {notifications.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.markAllReadButton}
              onPress={() => {
                notifications.forEach(notification => {
                  if (!notification.isRead && onMarkAsRead) {
                    onMarkAsRead(notification.id);
                  }
                });
              }}
            >
              <ThemedText style={styles.markAllReadText}>
                Mark all as read
              </ThemedText>
            </TouchableOpacity>
          </View>
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
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  notificationItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  unreadNotification: {
    backgroundColor: "rgba(0, 122, 255, 0.05)",
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF",
    marginTop: 6,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  markAllReadButton: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  markAllReadText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  inviteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 8,
  },
  declineButton: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8E8E93",
  },
  acceptButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  clickableOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
