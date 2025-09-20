import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { IconSymbol } from "./ui/icon-symbol";
import { ThemedText } from "./themed-text";
import { useProfile } from "../contexts/ProfileContext";

interface ProfileTabIconProps {
  color: string;
  focused: boolean;
}

export function ProfileTabIcon({ color, focused }: ProfileTabIconProps) {
  const { profileImage } = useProfile();

  return (
    <View style={[styles.container, focused && styles.containerFocused]}>
      {profileImage ? (
        <View
          style={[
            styles.profilePicture,
            focused && styles.profilePictureFocused,
          ]}
        >
          <Image
            source={{ uri: profileImage }}
            style={styles.tabProfileImage}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View
          style={[
            styles.profilePicture,
            focused && styles.profilePictureFocused,
          ]}
        >
          <IconSymbol
            size={16}
            name="person.fill"
            color={focused ? "#000" : "#666"}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  containerFocused: {
    borderWidth: 2,
    borderColor: "#fff",
  },
  profilePicture: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  profilePictureFocused: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  profileImagePlaceholder: {
    fontSize: 12,
  },
  tabProfileImage: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
