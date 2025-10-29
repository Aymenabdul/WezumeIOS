import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ImageBackground,
  Alert,
  BackHandler,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import Header from './header'; // Assuming Header component exists
import Video from 'react-native-video';
import DeleteIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import ShareIcon from 'react-native-vector-icons/Ionicons';
import UploadIcon from 'react-native-vector-icons/Feather';
import PlayIcon from 'react-native-vector-icons/Ionicons';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';

// NOTE: Replace './api' with your actual API client setup if necessary.
import apiClient from './api'; 

// --- Mock Environment Variables (Crucial for the share link) ---
const env = {
  // You MUST replace 'https://yourapi.com' with your app's actual base URL
  baseURL: 'https://yourapi.com', 
};

// --- API Service Functions ---
const apiService = {
  fetchVideo: (userId) => apiClient.get(`/api/videos/user/${userId}`),
  fetchSubtitles: (videoId) => apiClient.get(`/api/videos/user/${videoId}/subtitles.srt`),
  deleteVideo: (userId) => apiClient.delete(`/api/videos/delete/${userId}`),
  analyzeAudio: (videoId, audioUrl) => apiClient.get(`/api/audio/analyze`, { params: { videoId, filePath: audioUrl } }),
  checkProfanity: (videoUrl) => apiClient.post(`/api/videos/check-profane`, { file: videoUrl }),
  getFacialScore: (videoId, videoUrl) => apiClient.get(`/api/facial-score`, { params: { videoId, url: videoUrl } }),
};

// --- Sub-components (Kept outside to keep Home1 clean) ---

const VideoPlayer = ({ videoUri, subtitles }) => {
  const videoRef = useRef(null);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  const currentSubtitle = useMemo(() => {
    return subtitles.find(sub => currentTime >= sub.startTime && currentTime <= sub.endTime)?.text || '';
  }, [currentTime, subtitles]);

  return (
    <TouchableOpacity style={styles.videoCard} activeOpacity={1} onPress={() => setIsPaused(!isPaused)}>
      <Video
        ref={videoRef}
        source={{ uri: videoUri }}
        style={styles.videoPlayer}
        resizeMode="contain"
        controls={false}
        onProgress={(e) => setCurrentTime(e.currentTime)}
        repeat={true}
        paused={isPaused}
        preferredForwardBufferDuration={2}
      />
      {isPaused && (
        <View style={styles.playPauseOverlay}>
          <PlayIcon name="play-circle" size={80} color="rgba(255, 255, 255, 0.7)" />
        </View>
      )}
      {currentSubtitle ? (
        <Text style={styles.subtitle}>{currentSubtitle}</Text>
      ) : null}
    </TouchableOpacity>
  );
};

const ActionButtons = ({ onShare, onDelete, isDisabled }) => (
  <View style={styles.buttonContainer}>
    <TouchableOpacity style={styles.actionButton} onPress={onShare} disabled={isDisabled}>
      <ShareIcon name="share-social-outline" size={22} color="#fff" />
      <Text style={styles.actionButtonText}>Share</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.actionButton}
      onPress={onDelete}
      disabled={isDisabled}>
      <DeleteIcon name="delete-outline" size={22} color="#fff" />
      <Text style={styles.actionButtonText}>Delete</Text>
    </TouchableOpacity>
  </View>
);

const NoVideoContent = ({ onUploadPress }) => (
  <View style={styles.noVideoContainer}>
    <View style={styles.noVideoCard}>
      <Text style={styles.noVideoTitle}>Upload Your Profile Video</Text>
      <Text style={styles.noVideoInstructions}>
        • Hold your phone in portrait mode.
        {'\n'}• Ensure your video is at least 30 seconds.
        {'\n'}• Review your transcription before uploading.
      </Text>
      <TouchableOpacity style={styles.uploadButton} onPress={onUploadPress}>
        <UploadIcon name="upload-cloud" size={22} color="#fff" />
        <Text style={styles.uploadButtonText}>Upload Video</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ===============================================
//          CORE COMPONENT: HOME1
// ===============================================

const Home1 = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  // --- State and Data ---
  const [state, setState] = useState({
    loading: true,
    hasVideo: false,
    videoUri: null,
    audioUri: null,
    videoId: null,
    thumbnail: null,
    profileImage: null,
    userData: null,
    subtitles: [],
  });

  const { loading, hasVideo, videoUri, audioUri, videoId, thumbnail, profileImage, userData, subtitles } = state;
  const userId = userData?.userId;
  const firstName = userData?.firstName;
  const analysisTriggered = useRef(false);

  // --- Utility Functions/Callbacks ---

  const parseSRT = (srtText) => {
    if (!srtText || typeof srtText !== 'string') return [];
    const subtitleBlocks = srtText.trim().replace(/\r/g, '').split('\n\n');
    return subtitleBlocks.map(block => {
      const lines = block.split('\n');
      if (lines.length < 2) return null;
      const timeString = lines[1];
      const text = lines.slice(2).join(' ');
      const timeParts = timeString.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      if (!timeParts) return null;
      const startTime = parseInt(timeParts[1]) * 3600 + parseInt(timeParts[2]) * 60 + parseInt(timeParts[3]) + parseInt(timeParts[4]) / 1000;
      const endTime = parseInt(timeParts[5]) * 3600 + parseInt(timeParts[6]) * 60 + parseInt(timeParts[7]) + parseInt(timeParts[8]) / 1000;
      return { startTime, endTime, text };
    }).filter(Boolean);
  };

  const fetchVideoAndSubtitles = useCallback(async (currentUserId) => {
    try {
      const { data: videoData } = await apiService.fetchVideo(currentUserId);
      setState(s => ({
        ...s,
        videoUri: videoData.videoUrl,
        audioUri: videoData.audiourl,
        videoId: videoData.id,
        thumbnail: videoData.tumbnail,
        hasVideo: true,
      }));
      await AsyncStorage.setItem('cachedVideoData', JSON.stringify(videoData));

      try {
        const { data: subtitlesData } = await apiService.fetchSubtitles(videoData.id);
        const parsedSubtitles = parseSRT(subtitlesData);
        setState(s => ({ ...s, subtitles: parsedSubtitles }));
      } catch (subError) {
        setState(s => ({ ...s, subtitles: [] }));
      }

    } catch (error) {
      if (error.response?.status === 404) {
        setState(s => ({ ...s, hasVideo: false, videoUri: null, videoId: null, subtitles: [] }));
        await AsyncStorage.removeItem('cachedVideoData');
      } else {
        console.error('Error fetching video:', error);
      }
    }
  }, []);

  const performDelete = useCallback(async () => {
    if (!userId) return;
    try {
      await apiService.deleteVideo(userId);
      await AsyncStorage.multiRemove(['videoId', 'cachedVideoData']);
      setState(s => ({ ...s, hasVideo: false, videoUri: null, videoId: null, subtitles: [] }));
      // Optional: reset navigation stack after deletion
      // navigation.reset({ index: 0, routes: [{ name: 'Home1' }] });
    } catch (error) {
      console.error('Error deleting video:', error);
      Alert.alert('Error', 'Could not delete the video.');
    }
  }, [userId, navigation]);

  const handleProfanityDetected = useCallback(() => {
    Alert.alert("Profanity Detected", "This video must be deleted.",
      [{ text: 'Delete Video', onPress: performDelete, style: 'destructive' }],
      { cancelable: false }
    );
  }, [performDelete]);

  const runAnalysis = useCallback(async () => {
    if (!videoId || !videoUri || !audioUri) return;
    try {
      await Promise.allSettled([
        apiService.checkProfanity(videoUri),
        apiService.getFacialScore(videoId, videoUri),
        apiService.analyzeAudio(videoId, audioUri),
      ]);
    } catch (error) {
      if (error.response?.status === 403) {
        handleProfanityDetected();
      } else {
        console.error('ANALYSIS Error:', error.message);
      }
    }
  }, [videoId, videoUri, audioUri, handleProfanityDetected]);

  // --- Action Handlers (Defined here to fix ReferenceError) ---
  
  const handleDeletePress = useCallback(() => {
    Alert.alert('Delete Video', 'Are you sure?',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: performDelete }]
    );
  }, [performDelete]);

  /**
   * Fixes the original ReferenceError by ensuring it's defined before JSX,
   * using useCallback, and having necessary dependencies.
   */
  const handleShare = useCallback(async () => {
    if (!thumbnail || !firstName || !videoUri || !videoId) {
        Alert.alert('Error', 'Cannot share video at this time. Missing data.');
        return;
    }
    
    try {
      const thumbnailUrl = thumbnail;
      const localThumbnailPath = `${RNFS.CachesDirectoryPath}/thumbnail.jpg`;
      
      const downloadResult = await RNFS.downloadFile({
        fromUrl: thumbnailUrl,
        toFile: localThumbnailPath,
      }).promise;

      if (downloadResult.statusCode === 200) {
        const shareOptions = {
          title: 'Share User Video',
          // Ensure env.baseURL is defined for a functional link
          message: `Check out this video shared by ${firstName}\n\n${env.baseURL}/users/share?target=app://api/videos/user/${videoUri}/${videoId}`,
          url: `file://${localThumbnailPath}`,
        };

        await Share.open(shareOptions);
      } else {
        console.error('Failed to download the thumbnail. Status code:', downloadResult.statusCode);
        Alert.alert('Error', 'Unable to download the thumbnail for sharing.');
      }
    } catch (error) {
      console.error('Error sharing video:', error);
      Alert.alert('Error', 'Error occurred during sharing.');
    }
  }, [thumbnail, firstName, videoUri, videoId]);

  // --- Effects ---

  useEffect(() => {
    const loadData = async () => {
      setState(s => ({...s, loading: true}));
      const [
        firstName, userId, roleCode, college, profileUrl
      ] = await AsyncStorage.multiGet(['firstName', 'userId', 'roleCode', 'college', 'profileUrl']);
      
      const storedUserData = {
        firstName: firstName[1],
        userId: userId[1],
        roleCode: roleCode[1],
        college: college[1],
      };

      if (!storedUserData.userId) {
        setState(s => ({ ...s, loading: false }));
        return;
      }
      setState(s => ({ 
        ...s, 
        userData: storedUserData, 
        profileImage: profileUrl[1], 
        loading: false 
      }));

      fetchVideoAndSubtitles(storedUserData.userId);
    };

    if (isFocused) {
      loadData();
    }
  }, [isFocused, fetchVideoAndSubtitles]);

  useEffect(() => {
    if (videoId && videoUri && audioUri && isFocused && !analysisTriggered.current) {
      analysisTriggered.current = true;
      runAnalysis();
    }
    // Reset the trigger flag when the component loses focus
    return () => {
        if (!isFocused) {
            analysisTriggered.current = false;
        }
    }
  }, [videoId, videoUri, audioUri, isFocused, runAnalysis]);

  useEffect(() => {
    const backAction = () => {
      if (isFocused) {
        Alert.alert('Exit App', 'Are you sure you want to exit?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes', onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isFocused]);

  // --- Render ---

  if (loading) {
    return (
      <ImageBackground source={require('./assets/login.jpg')} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </ImageBackground>
    );
  }

  return (
    <View style={styles.safeArea}>
      <ImageBackground source={require('./assets/login.jpg')} style={styles.container}>
        <Header profile={profileImage} userName={userData?.firstName} />
        <View style={styles.content}>
          {hasVideo && videoUri ? (
            <>
              <VideoPlayer
                videoUri={videoUri}
                subtitles={subtitles}
              />
              <ActionButtons 
                onShare={handleShare} 
                onDelete={handleDeletePress} 
              />
            </>
          ) : (
            <NoVideoContent
              onUploadPress={() =>
                navigation.navigate('CameraPage', {
                  userId: userData?.userId,
                  roleCode: userData?.roleCode,
                  college: userData?.college,
                })
              }
            />
          )}
        </View>
      </ImageBackground>
    </View>
  );
};

// --- Styles ---

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 25,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  videoCard: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  playPauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 15,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: 10,
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginTop: 25,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  noVideoCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  noVideoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  noVideoInstructions: {
    fontSize: 15,
    color: '#eee',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  uploadButton: {
    backgroundColor: '#3498db',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#3498db',
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default Home1;