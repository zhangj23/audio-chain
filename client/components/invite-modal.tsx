import { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Switch,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  onInvite: (userIds: string[]) => void;
  groupId: string;
  existingMembers?: string[];
  invitedUsers?: string[];
}

// Mock users for search functionality
const mockUsers = [
  { id: '1', username: 'alice_wonder', displayName: 'Alice Wonder', avatar: '👩‍💻' },
  { id: '2', username: 'mike_codes', displayName: 'Mike Codes', avatar: '👨‍💻' },
  { id: '3', username: 'sara_design', displayName: 'Sara Design', avatar: '👩‍🎨' },
  { id: '4', username: 'john_dev', displayName: 'John Dev', avatar: '👨‍🔬' },
  { id: '5', username: 'emma_creative', displayName: 'Emma Creative', avatar: '👩‍🎭' },
  { id: '6', username: 'david_tech', displayName: 'David Tech', avatar: '👨‍🚀' },
  { id: '7', username: 'lisa_art', displayName: 'Lisa Art', avatar: '👩‍🎨' },
  { id: '8', username: 'tom_music', displayName: 'Tom Music', avatar: '👨‍🎵' },
  { id: '9', username: 'anna_photo', displayName: 'Anna Photo', avatar: '👩‍📸' },
  { id: '10', username: 'chris_video', displayName: 'Chris Video', avatar: '👨‍🎬' },
];

export function InviteModal({
  visible,
  onClose,
  onInvite,
  groupId,
  existingMembers = [],
  invitedUsers = [],
}: InviteModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showExistingMembers, setShowExistingMembers] = useState(false);

  // Filter users based on search query, existing members, and invited users
  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchQuery.toLowerCase());
    const isExisting = existingMembers.includes(user.id);
    const isInvited = invitedUsers.includes(user.id);
    const isAlreadyInvolved = isExisting || isInvited;
    
    // If showExistingMembers is true, show all users (including existing and invited)
    // If showExistingMembers is false, only show users who are neither existing nor invited
    return matchesSearch && (showExistingMembers || !isAlreadyInvolved);
  });

  // Count existing members and invited users for display
  const hiddenCount = mockUsers.filter(user => {
    const isExisting = existingMembers.includes(user.id);
    const isInvited = invitedUsers.includes(user.id);
    const isAlreadyInvolved = isExisting || isInvited;
    const matchesSearch = user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    return isAlreadyInvolved && matchesSearch;
  }).length;

  const handleUserSelect = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleInvite = () => {
    if (selectedMembers.length === 0) {
      Alert.alert('No Selection', 'Please select at least one person to invite.');
      return;
    }

    onInvite(selectedMembers);
    setSelectedMembers([]);
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSelectedMembers([]);
    setSearchQuery('');
    onClose();
  };

  const renderUserItem = ({ item }: { item: typeof mockUsers[0] }) => {
    const isSelected = selectedMembers.includes(item.id);
    const isExisting = existingMembers.includes(item.id);
    const isInvited = invitedUsers.includes(item.id);
    const isAlreadyInvolved = isExisting || isInvited;

    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          isSelected && styles.userItemSelected,
          isAlreadyInvolved && styles.userItemExisting,
        ]}
        onPress={() => !isAlreadyInvolved && handleUserSelect(item.id)}
        disabled={isAlreadyInvolved}
      >
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <ThemedText style={styles.avatarText}>{item.avatar}</ThemedText>
          </View>
          <View style={styles.userDetails}>
            <ThemedText style={styles.userDisplayName}>
              {item.displayName}
            </ThemedText>
            <ThemedText style={styles.userUsername}>
              @{item.username}
            </ThemedText>
          </View>
        </View>
        
        {isExisting && (
          <View style={styles.existingBadge}>
            <ThemedText style={styles.existingBadgeText}>Member</ThemedText>
          </View>
        )}
        
        {isInvited && !isExisting && (
          <View style={styles.invitedBadge}>
            <ThemedText style={styles.invitedBadgeText}>Invited</ThemedText>
          </View>
        )}
        
        {!isAlreadyInvolved && (
          <View style={styles.selectionIndicator}>
            {isSelected ? (
              <IconSymbol name="checkmark.circle.fill" size={24} color="#007AFF" />
            ) : (
              <IconSymbol name="circle" size={24} color="#8E8E93" />
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Invite to Group</ThemedText>
          <TouchableOpacity 
            onPress={handleInvite} 
            style={[
              styles.inviteButton,
              selectedMembers.length === 0 && styles.inviteButtonDisabled
            ]}
            disabled={selectedMembers.length === 0}
          >
            <ThemedText style={[
              styles.inviteButtonText,
              selectedMembers.length === 0 && styles.inviteButtonTextDisabled
            ]}>
              Invite ({selectedMembers.length})
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <IconSymbol name="magnifyingglass" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
        </View>

        {/* Toggle for existing members */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelContainer}>
              <ThemedText style={styles.toggleLabel}>
                Show existing & invited
              </ThemedText>
              {!showExistingMembers && hiddenCount > 0 && (
                <ThemedText style={styles.countText}> ({hiddenCount} hidden)</ThemedText>
              )}
            </View>
            <Switch
              value={showExistingMembers}
              onValueChange={setShowExistingMembers}
              trackColor={{ false: '#2C2C2E', true: '#007AFF' }}
              thumbColor={showExistingMembers ? '#FFFFFF' : '#8E8E93'}
              ios_backgroundColor="#2C2C2E"
            />
          </View>
        </View>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="person.2.slash" size={48} color="#8E8E93" />
            <ThemedText style={styles.emptyTitle}>No one to add</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              {showExistingMembers 
                ? "No users match your search" 
                : "All users are already members or have been invited"
              }
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            style={styles.usersList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inviteButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  inviteButtonDisabled: {
    backgroundColor: '#2C2C2E',
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  inviteButtonTextDisabled: {
    color: '#8E8E93',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  toggleContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  countText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
    marginLeft: 4,
  },
  usersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  userItemSelected: {
    backgroundColor: '#1A1A2E',
  },
  userItemExisting: {
    opacity: 0.6,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  userDetails: {
    flex: 1,
  },
  userDisplayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#8E8E93',
  },
  existingBadge: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  existingBadgeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  invitedBadge: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  invitedBadgeText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  selectionIndicator: {
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
});
