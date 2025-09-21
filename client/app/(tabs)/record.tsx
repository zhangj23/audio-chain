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

  // Animation for the enlarging red circle
  const circleScaleAnim = useRef(new Animated.Value(1)).current;
  const circleOpacityAnim = useRef(new Animated.Value(0)).current;
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  // Note: Video storage is now handled by shared videoStorage utility
  const timerRef = useRef<number | null>(null);
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

  // Set camera ready after permissions are granted with a short delay
  useEffect(() => {
    if (cameraPermission?.granted) {
      const timer = setTimeout(() => {
        setIsCameraReady(true);
      }, 1000); // Give camera 1 second to initialize

      return () => clearTimeout(timer);
    } else {
      setIsCameraReady(false);
    }
  }, [cameraPermission?.granted, cameraType]);

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

    if (!cameraRef.current || !isCameraReady) {
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
        // Start circle animation - enlarge and fade in
        Animated.spring(circleScaleAnim, {
          toValue: 2.5,
          useNativeDriver: true,
        }),
        Animated.timing(circleOpacityAnim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
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
      // Reset circle animation
      Animated.spring(circleScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(circleOpacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
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
    setIsCameraReady(false);
    setCameraType((current) => (current === "back" ? "front" : "back"));
    // Camera ready state will be set by the useEffect when cameraType changes
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
    if (!recordedVideoUri) return;

    try {
      // Show loading state
      Alert.alert("Uploading...", "Please wait while your video is uploaded.");

      // Create FormData for the video file
      const formData = new FormData();
      
      // For React Native, we need to create a file object from the URI
      const videoFile = {
        uri: recordedVideoUri,
        type: 'video/mp4',
        name: `video_${Date.now()}.mp4`,
      } as any;
      
      formData.append('video', videoFile);
      formData.append('group_id', selectedGroupId);
      formData.append('duration', recordingTime.toString());

      // Upload to backend
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://129.161.69.14:8000'}/videos/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          // Add auth token if available
          ...(await getAuthHeaders()),
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Also store locally for offline access
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
    } catch (error) {
      console.error("Video upload failed:", error);
      Alert.alert(
        "Upload Failed",
        "Failed to upload your video. Please try again."
      );
    }
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
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
      <View style={styles.container}>
        {/* Full Screen Camera Background */}
        <View style={styles.cameraContainer}>
          {cameraPermission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={styles.fullScreenCamera}
              facing={cameraType}
              mode="video"
              enableTorch={flash}
              mute={false}
              videoQuality="1080p"
            />
          ) : (
            <View style={styles.fullScreenCameraPlaceholder}>
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
        </View>

        {/* UI Overlay */}
        <View style={styles.uiOverlay}>
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

          {/* Minimalist Timer */}
          {isRecording && (
            <View style={styles.minimalistTimer}>
              <ThemedText style={styles.timerText}>{recordingTime}s</ThemedText>
            </View>
          )}

          {/* Recording Indicator Dot */}
          {isRecording && <View style={styles.recordingDot} />}

          {/* Spacer to push bottom controls down */}
          <View style={styles.spacer} />

          {/* Bottom Controls - Centered for Ambidextrous Use */}
          <View style={styles.bottomControls}>
            {/* Left Side Controls */}
            <View style={styles.leftControls}>
              <TouchableOpacity
                style={styles.sideButton}
                onPress={selectFromGallery}
              >
                <View style={styles.galleryPreview}>
                  <IconSymbol name="photo" size={24} color="#666" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Centered Record Button - Hold to Record */}
            <View style={styles.centerControls}>
              <GestureDetector gesture={pressGesture}>
                <Animated.View
                  style={[
                    styles.recordButtonContainer,
                    { transform: [{ scale: scaleAnim }] },
                  ]}
                >
                  {/* Enlarging Red Circle - appears when recording */}
                  <Animated.View
                    style={[
                      styles.recordingCircle,
                      {
                        transform: [{ scale: circleScaleAnim }],
                        opacity: circleOpacityAnim,
                      },
                    ]}
                  />

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
                    <ThemedText style={styles.holdText}>
                      {isCameraReady ? "Hold to record" : "Camera loading..."}
                    </ThemedText>
                  )}
                </Animated.View>
              </GestureDetector>
            </View>

            {/* Right Side Controls - Camera & Flash */}
            <View style={styles.rightControls}>
              <View style={styles.rightButtonsContainer}>
                {/* Camera Flip */}
                <TouchableOpacity
                  style={styles.sideButton}
                  onPress={switchCamera}
                >
                  <IconSymbol
                    name="arrow.triangle.2.circlepath.camera"
                    size={20}
                    color="#fff"
                  />
                </TouchableOpacity>

                {/* Flashlight */}
                <TouchableOpacity
                  style={styles.sideButton}
                  onPress={toggleFlash}
                >
                  <IconSymbol
                    name={flash ? "flashlight.on.fill" : "flashlight.off.fill"}
                    size={20}
                    color={flash ? "#ffcc00" : "#fff"}
                  />
                </TouchableOpacity>
              </View>
            </View>
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
        </View>

        {/* Group Selector Modal */}
        <Modal
          visible={showGroupSelector}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <ThemedView style={styles.modalContainer}>
            {/* BeReal Style Modal Header */}
            <View style={styles.berealModalHeader}>
              <View style={styles.berealPullHandle} />
              <View style={styles.berealHeaderContent}>
                <TouchableOpacity
                  onPress={() => setShowGroupSelector(false)}
                  style={styles.berealCloseButton}
                >
                  <IconSymbol name="xmark" size={18} color="#000" />
                </TouchableOpacity>
                <View style={styles.berealTitleSection}>
                  <ThemedText style={styles.berealModalTitle}>
                    Choose your Group
                  </ThemedText>
                </View>
              </View>
            </View>

            <ScrollView
              style={styles.groupList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.groupListContent}
            >
              {mockGroups.map((group, index) => {
                const isSelected = selectedGroupId === group.id;
                const progressPercentage = Math.round(
                  (group.videosSubmitted / group.totalMembers) * 100
                );

                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.groupCard,
                      isSelected && styles.selectedGroupCard,
                      index === 0 && styles.firstGroupCard,
                    ]}
                    onPress={() => {
                      setSelectedGroupId(group.id);
                      setShowGroupSelector(false);
                    }}
                    activeOpacity={0.7}
                  >
                    {/* Card Header */}
                    <View style={styles.groupCardHeader}>
                      <View style={styles.groupNameContainer}>
                        <ThemedText style={styles.groupCardName}>
                          {group.name}
                        </ThemedText>
                        {group.isRevealed && (
                          <View style={styles.completedBadgeNew}>
                            <IconSymbol
                              name="checkmark.circle.fill"
                              size={16}
                              color="#4CAF50"
                            />
                            <ThemedText style={styles.completedBadgeTextNew}>
                              Complete
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      {isSelected && (
                        <View style={styles.selectedIndicator}>
                          <IconSymbol
                            name="checkmark.circle.fill"
                            size={24}
                            color="#007AFF"
                          />
                        </View>
                      )}
                    </View>

                    {/* Prompt */}
                    <View style={styles.promptSection}>
                      <ThemedText style={styles.groupCardPrompt}>
                        &quot;{group.prompt}&quot;
                      </ThemedText>
                    </View>

                    {/* Progress Section */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressInfo}>
                        <ThemedText style={styles.progressText}>
                          {group.videosSubmitted}/{group.totalMembers} posted
                        </ThemedText>
                        <ThemedText style={styles.dueDateText}>
                          {group.dueDate}
                        </ThemedText>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBackground}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${progressPercentage}%`,
                                backgroundColor: group.isRevealed
                                  ? "#4CAF50"
                                  : "#007AFF",
                              },
                            ]}
                          />
                        </View>
                        <ThemedText style={styles.progressPercentage}>
                          {progressPercentage}%
                        </ThemedText>
                      </View>
                    </View>

                    {/* Member Avatars Placeholder */}
                    <View style={styles.membersSection}>
                      <View style={styles.memberAvatars}>
                        {group.members
                          .slice(0, 4)
                          .map((member, memberIndex) => (
                            <View
                              key={memberIndex}
                              style={[
                                styles.memberAvatar,
                                { marginLeft: memberIndex > 0 ? -8 : 0 },
                              ]}
                            >
                              <ThemedText style={styles.memberInitial}>
                                {member.charAt(0)}
                              </ThemedText>
                            </View>
                          ))}
                        {group.members.length > 4 && (
                          <View
                            style={[styles.memberAvatar, { marginLeft: -8 }]}
                          >
                            <ThemedText style={styles.memberInitial}>
                              +{group.members.length - 4}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
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
            {/* BeReal Style Preview Header */}
            <View style={styles.berealPreviewHeader}>
              <TouchableOpacity
                onPress={closeVideoPreview}
                style={styles.berealPreviewClose}
              >
                <IconSymbol name="xmark" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.berealPreviewTitleContainer}>
                <ThemedText style={styles.berealPreviewTitle}>
                  Preview
                </ThemedText>
              </View>
              <TouchableOpacity style={styles.berealPreviewAction}>
                <IconSymbol name="square.and.arrow.up" size={20} color="#fff" />
              </TouchableOpacity>
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
            <View style={styles.berealModalHeader}>
              <View style={styles.berealPullHandle} />
              <View style={styles.berealHeaderContent}>
                <TouchableOpacity
                  onPress={closeSettings}
                  style={styles.berealCloseButton}
                >
                  <IconSymbol name="xmark" size={18} color="#000" />
                </TouchableOpacity>
                <View style={styles.berealTitleSection}>
                  <ThemedText style={styles.berealModalTitle}>
                    Settings
                  </ThemedText>
                </View>
              </View>
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
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    overflow: "hidden",
  },
  fullScreenCamera: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  fullScreenCameraPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  uiOverlay: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    backgroundColor: "transparent",
  },
  spacer: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "transparent",
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
    backgroundColor: "transparent",
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
    top: 140,
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
    top: 70,
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
  // Bottom Controls - Ambidextrous Layout
  bottomControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: "transparent",
    position: "relative",
  },
  leftControls: {
    position: "absolute",
    left: 20,
    alignItems: "flex-start",
  },
  centerControls: {
    alignItems: "center",
    justifyContent: "center",
  },
  rightControls: {
    position: "absolute",
    right: 20,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  rightButtonsContainer: {
    gap: 16,
    alignItems: "center",
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
  recordingCircle: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ff4444",
    opacity: 0,
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
    backgroundColor: "#fff",
  },
  // BeReal Style Modal Headers
  berealModalHeader: {
    backgroundColor: "#fff",
    paddingTop: 8,
    paddingBottom: 16,
  },
  berealPullHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#E5E5E5",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  berealHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  berealCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  berealTitleSection: {
    flex: 1,
    alignItems: "center",
  },
  berealModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  modalHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.2)",
  },
  modalCancel: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  modalHeaderRight: {
    alignItems: "center",
    justifyContent: "center",
    width: 50,
  },
  modalIndicator: {
    width: 32,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#888",
    fontWeight: "400",
  },
  placeholder: {
    width: 50,
  },
  groupList: {
    flex: 1,
  },
  groupListContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  groupCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  firstGroupCard: {
    marginTop: 8,
  },
  selectedGroupCard: {
    borderColor: "#007AFF",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  groupCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  groupNameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupCardName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  completedBadgeNew: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedBadgeTextNew: {
    fontSize: 11,
    color: "#4CAF50",
    fontWeight: "600",
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  promptSection: {
    marginBottom: 16,
  },
  groupCardPrompt: {
    fontSize: 16,
    color: "#ccc",
    fontStyle: "italic",
    lineHeight: 22,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  dueDateText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: "#333",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
    minWidth: 35,
    textAlign: "right",
  },
  membersSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  memberAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1a1a1a",
  },
  memberInitial: {
    fontSize: 12,
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
    alignItems: "flex-start",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    backdropFilter: "blur(20px)",
  },
  previewHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  previewBackText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  previewTitleContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  previewSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
  },
  previewHeaderAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
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

  // BeReal Preview Header Styles
  berealPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#000", // BeReal style: black background
  },
  berealPreviewClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#333", // Dark gray button
    justifyContent: "center",
    alignItems: "center",
  },
  berealPreviewTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  berealPreviewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff", // White text
  },
  berealPreviewAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#333", // Dark gray button
    justifyContent: "center",
    alignItems: "center",
  },
});
