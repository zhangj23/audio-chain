import { StyleSheet, TouchableOpacity, View, Alert } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState } from "react";

export default function RecordScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentGroup, setCurrentGroup] = useState("College Friends 🎓");
  const [groupPrompt, setGroupPrompt] = useState(
    "Show us your morning routine!"
  );

  const MAX_RECORDING_TIME = 10; // 10 seconds max

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);

    // Start timer
    const timer = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= MAX_RECORDING_TIME - 1) {
          stopRecording();
          clearInterval(timer);
          return MAX_RECORDING_TIME;
        }
        return prev + 1;
      });
    }, 1000);

    Alert.alert(
      "Recording Started",
      `You have ${MAX_RECORDING_TIME} seconds to record for "${currentGroup}"`,
      [{ text: "OK" }]
    );
    // TODO: Implement actual camera recording
  };

  const stopRecording = () => {
    setIsRecording(false);

    if (recordingTime >= 3) {
      // Minimum 3 seconds
      Alert.alert(
        "Recording Complete!",
        `Great ${recordingTime}s video! Do you want to submit it to "${currentGroup}"?`,
        [
          { text: "Re-record", onPress: () => setRecordingTime(0) },
          {
            text: "Submit",
            onPress: () => {
              Alert.alert("Success!", "Video submitted to your group!");
              setRecordingTime(0);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        "Too Short!",
        "Videos must be at least 3 seconds long. Try again!",
        [{ text: "OK", onPress: () => setRecordingTime(0) }]
      );
    }
    // TODO: Navigate to video editing screen
  };

  const selectFromGallery = () => {
    Alert.alert(
      "Gallery Access",
      "Photo library access will be implemented next!",
      [{ text: "OK" }]
    );
    // TODO: Implement gallery picker
  };

  return (
    <ThemedView style={styles.container}>
      {/* Group Header */}
      <View style={styles.groupHeader}>
        <ThemedText style={styles.groupName}>{currentGroup}</ThemedText>
        <ThemedText style={styles.prompt}>"{groupPrompt}"</ThemedText>
      </View>

      {/* Camera Preview Placeholder */}
      <View style={styles.cameraPreview}>
        <IconSymbol name="camera.fill" size={100} color="#666" />
        <ThemedText style={styles.cameraText}>Camera Preview</ThemedText>

        {/* Timer Display */}
        {(isRecording || recordingTime > 0) && (
          <View style={styles.timerContainer}>
            <View style={styles.timerCircle}>
              <ThemedText style={styles.timerText}>
                {isRecording
                  ? MAX_RECORDING_TIME - recordingTime
                  : recordingTime}
              </ThemedText>
              <ThemedText style={styles.timerLabel}>
                {isRecording ? "LEFT" : "SEC"}
              </ThemedText>
            </View>
          </View>
        )}

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <ThemedText style={styles.recordingText}>
              REC {recordingTime}s
            </ThemedText>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Gallery Button */}
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={selectFromGallery}
        >
          <IconSymbol name="photo.on.rectangle" size={32} color="#fff" />
        </TouchableOpacity>

        {/* Record Button */}
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordingButton]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? (
            <View style={styles.stopIcon} />
          ) : (
            <View style={styles.recordIcon} />
          )}
        </TouchableOpacity>

        {/* Flip Camera Button */}
        <TouchableOpacity style={styles.flipButton}>
          <IconSymbol name="camera.rotate" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Effects/Filters */}
      <View style={styles.effectsBar}>
        <TouchableOpacity style={styles.effectButton}>
          <IconSymbol name="sparkles" size={24} color="#fff" />
          <ThemedText style={styles.effectText}>Effects</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.effectButton}>
          <IconSymbol name="wand.and.rays" size={24} color="#fff" />
          <ThemedText style={styles.effectText}>Filters</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.effectButton}>
          <IconSymbol name="timer" size={24} color="#fff" />
          <ThemedText style={styles.effectText}>Timer</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  groupHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  groupName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  prompt: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#fff",
    opacity: 0.8,
  },
  cameraPreview: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#222",
  },
  cameraText: {
    marginTop: 16,
    fontSize: 18,
    color: "#666",
  },
  timerContainer: {
    position: "absolute",
    top: 80,
    alignItems: "center",
  },
  timerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderWidth: 3,
    borderColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  timerText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  timerLabel: {
    fontSize: 10,
    color: "#fff",
    opacity: 0.8,
  },
  recordingIndicator: {
    position: "absolute",
    top: 20,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff4444",
    marginRight: 8,
  },
  recordingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 40,
    backgroundColor: "#000",
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  recordingButton: {
    backgroundColor: "#ff4444",
  },
  recordIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ff4444",
  },
  stopIcon: {
    width: 30,
    height: 30,
    backgroundColor: "#fff",
    borderRadius: 4,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  effectsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#000",
  },
  effectButton: {
    alignItems: "center",
    gap: 4,
  },
  effectText: {
    fontSize: 12,
    color: "#fff",
  },
});
