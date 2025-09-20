import {
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  ScrollView,
  Modal,
  Animated,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useEffect, useRef } from "react";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { Audio, Video, ResizeMode } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { videoStorage } from "../../utils/videoStorage";

// Mock groups data (in real app, this would come from props or context)
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
  },
];

export default function RecordScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedGroupId, setSelectedGroupId] = useState("1");
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [flash, setFlash] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  // Note: Video storage is now handled by shared videoStorage utility
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<Video>(null);

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] =
    MediaLibrary.usePermissions();

  const selectedGroup =
    mockGroups.find((group) => group.id === selectedGroupId) || mockGroups[0];

  const MAX_RECORDING_TIME = 10; // 10 seconds max

  // Setup audio and cleanup timer on unmount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      } catch (error) {
        console.warn("Failed to set audio mode:", error);
      }
    };

    setupAudio();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Check and request permissions
  const checkPermissions = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Please enable camera access to record videos for your groups.",
          [{ text: "OK" }]
        );
        return false;
      }
    }

    if (!mediaLibraryPermission?.granted) {
      const result = await requestMediaLibraryPermission();
      if (!result.granted) {
        Alert.alert(
          "Media Library Permission",
          "Media library access is optional but recommended to save your videos.",
          [{ text: "OK" }]
        );
      }
    }

    return true;
  };

  // Hold to record gesture handlers
  const handlePressIn = async () => {
    const hasPermissions = await checkPermissions();
    if (!hasPermissions) return;

    if (!cameraRef.current) {
      Alert.alert("Error", "Camera not ready. Please try again.");
      return;
    }

    if (selectedGroup.isRevealed) return; // Don't record if already submitted

    try {
      setIsPressed(true);
      setIsRecording(true);
      setRecordingTime(0);

      // Animate button press
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: MAX_RECORDING_TIME * 1000,
          useNativeDriver: false,
        }),
      ]).start();

      // Start video recording
      const recordingPromise = cameraRef.current.recordAsync({
        maxDuration: MAX_RECORDING_TIME,
      });

      // Store the recording promise to get the result later
      recordingPromise
        .then((result) => {
          if (result && result.uri) {
            setRecordedVideoUri(result.uri);
            setShowVideoPreview(true);
          }
        })
        .catch((error) => {
          console.error("Recording failed:", error);
        });

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_RECORDING_TIME - 1) {
            handlePressOut();
            return MAX_RECORDING_TIME;
          }
          return prev + 1;
        });
      }, 1000);

      console.log(`Recording started for "${selectedGroup.name}"`);
    } catch (error) {
      console.error("Failed to start recording:", error);
      handlePressOut();
      Alert.alert(
        "Recording Error",
        "Failed to start recording. Please try again."
      );
    }
  };

  const handlePressOut = async () => {
    if (!isRecording) return;

    setIsPressed(false);
    setIsRecording(false);

    // Reset animations
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop recording
    try {
      if (cameraRef.current) {
        await cameraRef.current.stopRecording();
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }

    // Handle recording result
    if (recordingTime > 0 && recordingTime < 3) {
      Alert.alert(
        "⏰ Too Short!",
        "Videos must be at least 3 seconds long. Try again!",
        [{ text: "Got it", onPress: () => setRecordingTime(0) }]
      );
    }
    // For successful recordings, video preview will show automatically
  };

  const selectFromGallery = async () => {
    try {
      // Request permission to access media library
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to select videos.",
          [{ text: "OK" }]
        );
        return;
      }

      // Launch image picker for videos only
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 10, // 10 second limit
      });

      if (!result.canceled && result.assets[0]) {
        const video = result.assets[0];
        setRecordedVideoUri(video.uri);
        setRecordingTime(Math.floor((video.duration || 0) / 1000));
        setShowVideoPreview(true);
      }
    } catch (error) {
      console.error("Gallery selection error:", error);
      Alert.alert("Error", "Failed to select video from gallery.");
    }
  };

  const switchCamera = () => {
    setCameraType((current) => (current === "back" ? "front" : "back"));
  };

  const toggleFlash = () => {
    setFlash((current) => !current);
  };

  // Video preview functions
  const closeVideoPreview = () => {
    setShowVideoPreview(false);
    setRecordedVideoUri(null);
    setIsVideoPlaying(false);
    setRecordingTime(0);
  };

  const retakeVideo = () => {
    closeVideoPreview();
  };

  const submitVideo = async () => {
    if (recordedVideoUri) {
      // Store the video for this group using shared storage
      videoStorage.addVideo(selectedGroupId, {
        uri: recordedVideoUri,
        duration: recordingTime,
        timestamp: Date.now(),
      });

      Alert.alert(
        "🚀 Submitted!",
        `Your video was posted to ${selectedGroup.name}!`
      );
      closeVideoPreview();
    }
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  const openEffects = () => {
    setShowEffects(true);
  };

  const closeEffects = () => {
    setShowEffects(false);
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

  // Gesture for hold-to-record
  const pressGesture = Gesture.LongPress()
    .minDuration(0)
    .onStart(handlePressIn)
    .onEnd(handlePressOut)
    .onTouchesCancelled(handlePressOut);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.groupSelector}
            onPress={() => setShowGroupSelector(true)}
          >
            <ThemedText style={styles.groupName}>
              {selectedGroup.name}
            </ThemedText>
            <IconSymbol name="chevron.down" size={16} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={openSettings}
          >
            <IconSymbol name="gearshape.fill" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Prompt */}
        <View style={styles.promptContainer}>
          <ThemedText style={styles.prompt}>
            &quot;{selectedGroup.prompt}&quot;
          </ThemedText>
          <ThemedText style={styles.timeLeft}>
            {selectedGroup.dueDate}
          </ThemedText>
        </View>

        {/* Camera Preview */}
        <View style={styles.cameraPreview}>
          {cameraPermission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraType}
              mode="video"
              enableTorch={flash}
              mute={false}
            />
          ) : (
            <View style={styles.cameraPlaceholder}>
              <IconSymbol name="camera.fill" size={60} color="#444" />
              <ThemedText style={styles.cameraText}>
                Camera access required
              </ThemedText>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestCameraPermission}
              >
                <ThemedText style={styles.permissionButtonText}>
                  Enable Camera
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Minimalist Timer */}
          {isRecording && (
            <View style={styles.minimalistTimer}>
              <ThemedText style={styles.timerText}>{recordingTime}s</ThemedText>
            </View>
          )}

          {/* Recording Indicator Dot */}
          {isRecording && <View style={styles.recordingDot} />}

          {/* Top Controls */}
          <View style={styles.topControls}>
            <TouchableOpacity
              style={styles.topControlButton}
              onPress={switchCamera}
            >
              <IconSymbol
                name="arrow.triangle.2.circlepath.camera"
                size={24}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.topControlButton}
              onPress={toggleFlash}
            >
              <IconSymbol
                name={flash ? "flashlight.on.fill" : "flashlight.off.fill"}
                size={24}
                color={flash ? "#ffcc00" : "#fff"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {/* Gallery */}
          <TouchableOpacity
            style={styles.sideButton}
            onPress={selectFromGallery}
          >
            <View style={styles.galleryPreview}>
              <IconSymbol name="photo" size={24} color="#666" />
            </View>
          </TouchableOpacity>

          {/* Clean Record Button - Hold to Record */}
          <GestureDetector gesture={pressGesture}>
            <Animated.View
              style={[
                styles.recordButtonContainer,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              {/* Progress Ring Background */}
              <View style={styles.progressTrack} />

              {/* Animated Progress Ring */}
              <Animated.View
                style={[
                  styles.progressRing,
                  {
                    transform: [
                      {
                        rotate: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "360deg"],
                        }),
                      },
                    ],
                  },
                ]}
              />

              {/* Clean Record Button */}
              <View
                style={[
                  styles.recordButton,
                  isPressed && styles.recordButtonPressed,
                  selectedGroup.isRevealed && styles.recordButtonDisabled,
                ]}
              />

              {/* Hold instruction */}
              {!isRecording && !selectedGroup.isRevealed && (
                <ThemedText style={styles.holdText}>Hold to record</ThemedText>
              )}
            </Animated.View>
          </GestureDetector>

          {/* Effects */}
          <TouchableOpacity style={styles.sideButton} onPress={openEffects}>
            <IconSymbol name="face.smiling" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Group already submitted message */}
        {selectedGroup.isRevealed && (
          <View style={styles.submittedOverlay}>
            <View style={styles.submittedCard}>
              <IconSymbol
                name="checkmark.circle.fill"
                size={40}
                color="#4CAF50"
              />
              <ThemedText style={styles.submittedTitle}>
                Already Posted!
              </ThemedText>
              <ThemedText style={styles.submittedSubtitle}>
                You&apos;ve already submitted to {selectedGroup.name}
              </ThemedText>
              <TouchableOpacity style={styles.viewGroupButton}>
                <ThemedText style={styles.viewGroupButtonText}>
                  View Group
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Group Selector Modal */}
        <Modal
          visible={showGroupSelector}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <ThemedView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowGroupSelector(false)}>
                <ThemedText style={styles.modalCancel}>Cancel</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.modalTitle}>Choose Group</ThemedText>
              <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.groupList}>
              {mockGroups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.groupOption,
                    selectedGroupId === group.id && styles.selectedGroupOption,
                  ]}
                  onPress={() => {
                    setSelectedGroupId(group.id);
                    setShowGroupSelector(false);
                  }}
                >
                  <View style={styles.groupOptionContent}>
                    <ThemedText style={styles.groupOptionName}>
                      {group.name}
                    </ThemedText>
                    <ThemedText style={styles.groupOptionPrompt}>
                      &quot;{group.prompt}&quot;
                    </ThemedText>
                    <View style={styles.groupOptionStats}>
                      <ThemedText style={styles.groupOptionStatsText}>
                        {group.videosSubmitted}/{group.totalMembers} posted •{" "}
                        {group.dueDate}
                      </ThemedText>
                      {group.isRevealed && (
                        <View style={styles.completedBadge}>
                          <ThemedText style={styles.completedBadgeText}>
                            ✓ Complete
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                  {selectedGroupId === group.id && (
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={24}
                      color="#fff"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ThemedView>
        </Modal>

        {/* Video Preview Modal */}
        <Modal
          visible={showVideoPreview}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <ThemedView style={styles.previewContainer}>
            {/* Preview Header */}
            <View style={styles.previewHeader}>
              <TouchableOpacity
                onPress={closeVideoPreview}
                style={styles.closeButton}
              >
                <IconSymbol name="xmark" size={24} color="#fff" />
              </TouchableOpacity>
              <ThemedText style={styles.previewTitle}>Preview</ThemedText>
              <View style={styles.placeholder} />
            </View>

            {/* Video Player */}
            <View style={styles.videoContainer}>
              {recordedVideoUri && (
                <Video
                  ref={videoRef}
                  source={{ uri: recordedVideoUri }}
                  style={styles.videoPlayer}
                  useNativeControls={false}
                  resizeMode={ResizeMode.CONTAIN}
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
                style={styles.videoOverlay}
                onPress={toggleVideoPlayback}
              >
                {!isVideoPlaying && (
                  <View style={styles.playButton}>
                    <IconSymbol name="play.fill" size={32} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Recording Info */}
              <View style={styles.recordingInfo}>
                <ThemedText style={styles.recordingLength}>
                  {recordingTime}s
                </ThemedText>
                <ThemedText style={styles.groupTag}>
                  {selectedGroup.name}
                </ThemedText>
              </View>
            </View>

            {/* Preview Actions */}
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={replayVideo}
              >
                <IconSymbol name="arrow.clockwise" size={20} color="#fff" />
                <ThemedText style={styles.actionButtonText}>Replay</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.retakeButton}
                onPress={retakeVideo}
              >
                <ThemedText style={styles.retakeButtonText}>Retake</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={submitVideo}
              >
                <ThemedText style={styles.submitButtonText}>Submit</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </Modal>

        {/* Camera Settings Modal */}
        <Modal
          visible={showSettings}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <ThemedView style={styles.settingsContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeSettings}>
                <ThemedText style={styles.modalCancel}>Cancel</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.modalTitle}>Camera Settings</ThemedText>
              <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.settingsList}>
              <View style={styles.settingSection}>
                <ThemedText style={styles.settingSectionTitle}>
                  Camera
                </ThemedText>

                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={switchCamera}
                >
                  <IconSymbol
                    name="arrow.triangle.2.circlepath.camera"
                    size={20}
                    color="#fff"
                  />
                  <ThemedText style={styles.settingText}>
                    Switch to {cameraType === "back" ? "Front" : "Back"} Camera
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={toggleFlash}
                >
                  <IconSymbol
                    name={flash ? "flashlight.on.fill" : "flashlight.off.fill"}
                    size={20}
                    color={flash ? "#ffcc00" : "#fff"}
                  />
                  <ThemedText style={styles.settingText}>
                    Flash {flash ? "On" : "Off"}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <View style={styles.settingSection}>
                <ThemedText style={styles.settingSectionTitle}>
                  Video Quality
                </ThemedText>

                <TouchableOpacity style={styles.settingItem}>
                  <IconSymbol name="video" size={20} color="#fff" />
                  <ThemedText style={styles.settingText}>720p HD</ThemedText>
                  <IconSymbol name="checkmark" size={16} color="#4CAF50" />
                </TouchableOpacity>
              </View>

              <View style={styles.settingSection}>
                <ThemedText style={styles.settingSectionTitle}>
                  Recording
                </ThemedText>

                <TouchableOpacity style={styles.settingItem}>
                  <IconSymbol name="timer" size={20} color="#fff" />
                  <ThemedText style={styles.settingText}>
                    Max Duration: 10 seconds
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingItem}>
                  <IconSymbol name="mic" size={20} color="#fff" />
                  <ThemedText style={styles.settingText}>
                    Audio Recording: On
                  </ThemedText>
                  <IconSymbol name="checkmark" size={16} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </ThemedView>
        </Modal>

        {/* Effects Modal */}
        <Modal
          visible={showEffects}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <ThemedView style={styles.effectsContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeEffects}>
                <ThemedText style={styles.modalCancel}>Cancel</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.modalTitle}>
                Effects & Filters
              </ThemedText>
              <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.effectsList}>
              <View style={styles.effectSection}>
                <ThemedText style={styles.effectSectionTitle}>
                  🎭 Filters
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterScroll}
                >
                  {["Original", "Vintage", "B&W", "Warm", "Cool", "Bright"].map(
                    (filter, index) => (
                      <TouchableOpacity key={index} style={styles.filterItem}>
                        <View style={styles.filterPreview}>
                          <ThemedText style={styles.filterEmoji}>
                            {index === 0
                              ? "📷"
                              : index === 1
                              ? "📸"
                              : index === 2
                              ? "⚫"
                              : index === 3
                              ? "🟠"
                              : index === 4
                              ? "🔵"
                              : "☀️"}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.filterName}>
                          {filter}
                        </ThemedText>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>
              </View>

              <View style={styles.effectSection}>
                <ThemedText style={styles.effectSectionTitle}>
                  ✨ Effects
                </ThemedText>
                <View style={styles.effectGrid}>
                  {[
                    {
                      name: "Sparkles",
                      emoji: "✨",
                      desc: "Add magical sparkles",
                    },
                    { name: "Hearts", emoji: "💕", desc: "Floating hearts" },
                    { name: "Stars", emoji: "⭐", desc: "Twinkling stars" },
                    { name: "Confetti", emoji: "🎉", desc: "Party confetti" },
                  ].map((effect, index) => (
                    <TouchableOpacity key={index} style={styles.effectItem}>
                      <View style={styles.effectIcon}>
                        <ThemedText style={styles.effectEmoji}>
                          {effect.emoji}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.effectName}>
                        {effect.name}
                      </ThemedText>
                      <ThemedText style={styles.effectDesc}>
                        {effect.desc}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.effectSection}>
                <ThemedText style={styles.effectSectionTitle}>
                  🎵 Audio
                </ThemedText>
                <TouchableOpacity style={styles.audioOption}>
                  <IconSymbol name="music.note" size={20} color="#fff" />
                  <ThemedText style={styles.audioText}>
                    Add Background Music
                  </ThemedText>
                  <ThemedText style={styles.comingSoon}>Coming Soon</ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </ThemedView>
        </Modal>
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  groupSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Prompt
  promptContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  prompt: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
  },
  timeLeft: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  // Camera Preview
  cameraPreview: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  permissionButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  // Minimalist Timer
  minimalistTimer: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  // Recording Dot
  recordingDot: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff4444",
  },
  // Top Controls
  topControls: {
    position: "absolute",
    top: 20,
    right: 20,
    flexDirection: "row",
    gap: 12,
  },
  topControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Bottom Controls
  bottomControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 40,
    backgroundColor: "#000",
  },
  sideButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  galleryPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  // Clean Record Button
  recordButtonContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  progressTrack: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  progressRing: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: "#fff",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  recordButtonPressed: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#ff4444",
  },
  recordButtonDisabled: {
    backgroundColor: "#666",
    opacity: 0.5,
  },
  holdText: {
    position: "absolute",
    bottom: -24,
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    textAlign: "center",
  },
  // Submitted Overlay
  submittedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  submittedCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginHorizontal: 40,
    borderWidth: 1,
    borderColor: "#333",
  },
  submittedTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  submittedSubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
  },
  viewGroupButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  viewGroupButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalCancel: {
    fontSize: 16,
    color: "#888",
    fontWeight: "500",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  placeholder: {
    width: 50,
  },
  groupList: {
    flex: 1,
  },
  groupOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  selectedGroupOption: {
    backgroundColor: "#1a1a1a",
  },
  groupOptionContent: {
    flex: 1,
  },
  groupOptionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  groupOptionPrompt: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 8,
  },
  groupOptionStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupOptionStatsText: {
    fontSize: 12,
    color: "#888",
  },
  completedBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  completedBadgeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
  },
  // Video Preview Styles
  previewContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  videoContainer: {
    flex: 1,
    backgroundColor: "#000",
    position: "relative",
  },
  videoPlayer: {
    flex: 1,
  },
  videoOverlay: {
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  recordingInfo: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  recordingLength: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  groupTag: {
    fontSize: 12,
    color: "#ccc",
    fontWeight: "500",
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: "#000",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  actionButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  retakeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  retakeButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  submitButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 20,
  },
  submitButtonText: {
    fontSize: 16,
    color: "#000",
    fontWeight: "700",
  },
  // Settings Modal Styles
  settingsContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  settingsList: {
    flex: 1,
  },
  settingSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  settingSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
  },
  // Effects Modal Styles
  effectsContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  effectsList: {
    flex: 1,
  },
  effectSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  effectSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
  },
  filterScroll: {
    paddingVertical: 8,
  },
  filterItem: {
    alignItems: "center",
    marginRight: 16,
    width: 60,
  },
  filterPreview: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  filterEmoji: {
    fontSize: 20,
  },
  filterName: {
    fontSize: 12,
    color: "#ccc",
    textAlign: "center",
  },
  effectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  effectItem: {
    width: "45%",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
  },
  effectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  effectEmoji: {
    fontSize: 20,
  },
  effectName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  effectDesc: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
  audioOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    gap: 12,
  },
  audioText: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
  },
  comingSoon: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
});
