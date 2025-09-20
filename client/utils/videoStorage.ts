// Simple video storage utility for sharing videos between screens
// In a real app, this would use AsyncStorage or a proper state management solution

interface VideoData {
  uri: string;
  duration: number;
  timestamp: number;
}

class VideoStorage {
  private videos: { [groupId: string]: VideoData } = {};
  private listeners: ((videos: { [groupId: string]: VideoData }) => void)[] =
    [];

  // Add a video for a specific group
  addVideo(groupId: string, videoData: VideoData) {
    this.videos[groupId] = videoData;
    this.notifyListeners();
  }

  // Get video for a specific group
  getVideo(groupId: string): VideoData | null {
    return this.videos[groupId] || null;
  }

  // Get all videos
  getAllVideos(): { [groupId: string]: VideoData } {
    return { ...this.videos };
  }

  // Subscribe to changes
  subscribe(listener: (videos: { [groupId: string]: VideoData }) => void) {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Notify all listeners of changes
  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.getAllVideos()));
  }

  // Remove video for a group
  removeVideo(groupId: string) {
    delete this.videos[groupId];
    this.notifyListeners();
  }

  // Clear all videos
  clear() {
    this.videos = {};
    this.notifyListeners();
  }
}

// Export singleton instance
export const videoStorage = new VideoStorage();
