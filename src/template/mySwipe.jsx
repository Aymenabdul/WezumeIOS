import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Linking,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  BackHandler,
  Dimensions,
  ActivityIndicator,
  Platform, // Import Platform
  StatusBar, // Import StatusBar
} from 'react-native';
import Video from 'react-native-video';
import { useIsFocused, useRoute, useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Ant from 'react-native-vector-icons/AntDesign';
import Shares from 'react-native-vector-icons/Entypo';
import Like from 'react-native-vector-icons/Foundation';
import Score from 'react-native-vector-icons/MaterialCommunityIcons';
import Phone from 'react-native-vector-icons/FontAwesome6';
import Whatsapp from 'react-native-vector-icons/Entypo';
import PlayIcon from 'react-native-vector-icons/Ionicons';
import HeartIcon from 'react-native-vector-icons/AntDesign';
import BrokenHeartIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import apiClient from './api';

const { height: windowHeight } = Dimensions.get('window');

// --- Reusable Animated Icon Button Component (Unchanged) ---
const AnimatedIconButton = ({ onPress, children }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = () => (scale.value = withSpring(0.8));
  const handlePressOut = () => (scale.value = withSpring(1));
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={styles.iconButton}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- Main Video Player Component (Refactored) ---
const VideoPlayer = memo(({ item, isActive, onLike, isLiked }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const { id, uri, profileImage, firstName, email, phoneNumber, thumbnail, userId: videoOwnerId } = item;
  const navigation = useNavigation();

  const [likeCount, setLikeCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  const playPauseOpacity = useSharedValue(0);
  const likeHeartScale = useSharedValue(0);
  const likeHeartOpacity = useSharedValue(0);
  const dislikeHeartScale = useSharedValue(0);
  const dislikeHeartOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Reset state for the new video
      setIsLoading(true);
      setError(null);
      setLikeCount(0);
      setTotalScore(0);
      setSubtitles([]);

      const fetchMetadata = async () => {
        // ✅ FIX: Use Promise.allSettled to ensure all requests complete
        const results = await Promise.allSettled([
          apiClient.get(`/api/videos/${id}/like-count`),
          apiClient.get(`/api/totalscore/${id}`),
          apiClient.get(`/api/videos/user/${id}/subtitles.srt`) // Corrected endpoint
        ]);

        const [likeResult, scoreResult, subtitlesResult] = results;

        // Process each result individually
        if (likeResult.status === 'fulfilled') {
          setLikeCount(likeResult.value.data || 0);
        } else {
          console.error(`Failed to fetch like count for video ${id}:`, likeResult.reason?.response?.data || likeResult.reason?.message);
        }

        if (scoreResult.status === 'fulfilled') {
          setTotalScore(scoreResult.value.data?.totalScore || 0);
        } else {
          console.error(`Failed to fetch total score for video ${id}:`, scoreResult.reason?.response?.data || scoreResult.reason?.message);
        }

        if (subtitlesResult.status === 'fulfilled') {
          setSubtitles(parseSRT(subtitlesResult.value.data));
        } else {
          console.error(`Failed to fetch subtitles for video ${id}:`, subtitlesResult.reason?.response?.data || subtitlesResult.reason?.message);
        }
      };

      fetchMetadata();
    }
  }, [isActive, id]);

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

  const handleTogglePlay = () => {
    setIsPaused(prev => !prev);
    playPauseOpacity.value = withTiming(1, { duration: 200 }, () => {
      playPauseOpacity.value = withTiming(0, { duration: 500 });
    });
  };

  const handleLikePress = () => {
    const currentlyLiked = isLiked;
    setLikeCount(prev => prev + (currentlyLiked ? -1 : 1));
    onLike(id);
  };

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      // Animation logic is unchanged...
      runOnJS(handleLikePress)();
    });

  const handleVideoError = (e) => {
    console.error('Video Error:', e);
    setError('This video could not be played.');
    setIsLoading(false);
  };

  const currentSubtitle = subtitles.find(sub => currentTime >= sub.startTime && currentTime <= sub.endTime)?.text || '';

  const handleShare = useCallback(async () => {
    if (!thumbnail) return Alert.alert('Error', 'Thumbnail is not available.');

    const localThumbnailPath = `${RNFS.CachesDirectoryPath}/share_thumbnail_${Date.now()}.jpg`;

    try {
      await RNFS.downloadFile({ fromUrl: thumbnail, toFile: localThumbnailPath }).promise;
      await Share.open({
        title: 'Share User Video',
        // FIX: Access firstName directly from props
        message: `Check out this video from ${firstName} on Wezume!`,
        url: `file://${localThumbnailPath}`,
      });
    } catch (error) {
      if (error.code !== 'ECANCELLED') {
        Alert.alert('Error', 'Could not share the video.');
      }
    }
  }, [thumbnail, firstName]);

  const handleCall = () => {
    if (phoneNumber) {
      const url = `tel:${phoneNumber}`;
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device.');
        }
      });
    } else {
      Alert.alert('Info', 'No phone number available for this user.');
    }
  };

  const handleEmail = () => {
    if (email) {
      const url = `mailto:${email}`;
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Email is not supported on this device.');
        }
      });
    } else {
      Alert.alert('Info', 'No email address available for this user.');
    }
  };

  const playPauseStyle = useAnimatedStyle(() => ({ opacity: playPauseOpacity.value }));
  const animatedLikeHeartStyle = useAnimatedStyle(() => ({ opacity: likeHeartOpacity.value, transform: [{ scale: likeHeartScale.value }] }));
  const animatedDislikeHeartStyle = useAnimatedStyle(() => ({ opacity: dislikeHeartOpacity.value, transform: [{ scale: dislikeHeartScale.value }] }));

  return (
    <GestureDetector gesture={doubleTapGesture}>
      <View style={styles.page}>
        {isLoading && isActive && !error && <ActivityIndicator style={styles.loader} color="#fff" size="large" />}

        {error && isActive && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {isActive && !error ? (
          <Video
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            paused={isPaused}
            controls={false}
            repeat={true}
            onLoadStart={() => { setIsLoading(true); setError(null); }}
            onLoad={() => setIsLoading(false)}
            onProgress={(data) => setCurrentTime(data.currentTime)}
            onError={handleVideoError}
            poster={thumbnail}
            posterResizeMode="cover"
          // Buffer config is unchanged
          />
        ) : (
          <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}

        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleTogglePlay} activeOpacity={1} />

        <Animated.View style={[styles.playPauseOverlay, playPauseStyle]}>
          <PlayIcon name={isPaused ? "play-circle" : "pause-circle"} size={80} color="rgba(255, 255, 255, 0.7)" />
        </Animated.View>
        <Animated.View style={[styles.heartAnimationContainer, animatedLikeHeartStyle]}>
          <HeartIcon name="heart" size={100} color="white" />
        </Animated.View>
        <Animated.View style={[styles.heartAnimationContainer, animatedDislikeHeartStyle]}>
          <BrokenHeartIcon name="heart-broken" size={100} color="white" />
        </Animated.View>

        <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.6)']} style={styles.overlay}>
          <View style={styles.topControls}>
            <AnimatedIconButton onPress={() => navigation.goBack()}>
              <Ant name={'arrowleft'} size={24} color={'#fff'} />
            </AnimatedIconButton>
          </View>
          <View style={styles.bottomControls}>
            <View style={styles.leftColumn}>
              {currentSubtitle ? (
                <View style={styles.transcriptionContainer}>
                  <Text style={styles.transcriptionText}>{currentSubtitle}</Text>
                </View>
              ) : null}
              <View style={styles.userDetails}>
                {profileImage && <Image source={{ uri: profileImage }} style={styles.profileImage} />}
                <Text style={styles.userName}>{firstName}</Text>
              </View>
            </View>
            <View style={styles.rightColumn}>
              <AnimatedIconButton onPress={handleLikePress}>
                <Like name={'heart'} size={30} color={isLiked ? '#FF005E' : '#fff'} />
                <Text style={styles.iconText}>{likeCount}</Text>
              </AnimatedIconButton>
              {/* <AnimatedIconButton onPress={() => navigation.navigate('ScoringScreen', { videoId: id, userId: videoOwnerId })}>
                  <Score name={'speedometer'} size={30} color={'#fff'} />
                  <Text style={styles.iconText}>{totalScore}</Text>
                </AnimatedIconButton> */}
              <AnimatedIconButton onPress={handleShare}>
                <Shares name={'share'} size={30} color={'#fff'} />
              </AnimatedIconButton>
              {/* <AnimatedIconButton onPress={handleCall}>
                  <Phone name={'phone-volume'} size={22} color={'#fff'} />
                </AnimatedIconButton>
                <AnimatedIconButton onPress={handleEmail}>
                  <Whatsapp name={'email'} size={27} color={'#fff'} />
                </AnimatedIconButton> */}
            </View>
          </View>
        </LinearGradient>
      </View>
    </GestureDetector>
  );
});

// --- HomeSwipe Component (Unchanged) ---
const HomeSwipe = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [videos] = useState(route.params?.allvideos || []);
  const [user, setUser] = useState({ userId: null, firstName: '' });
  const [activeVideoIndex, setActiveVideoIndex] = useState(route.params?.index || 0);
  const [likedStatus, setLikedStatus] = useState({});

  useEffect(() => {
    const loadUserData = async () => {
      const apiUserIdStr = await AsyncStorage.getItem('userId');
      const apiFirstName = await AsyncStorage.getItem('firstName');
      if (apiUserIdStr) {
        const parsedUserId = parseInt(apiUserIdStr, 10);
        setUser({ userId: parsedUserId, firstName: apiFirstName });
        fetchLikeStatus(parsedUserId);
      }
    };
    loadUserData();
  }, []);

  const fetchLikeStatus = async (userId) => {
    try {
      const response = await apiClient.get(`/api/videos/likes/status?userId=${userId}`);
      setLikedStatus(response.data);
    } catch (error) {
      console.error('Error fetching like status:', error);
    }
  };

  const handleLike = useCallback(async (videoId) => {
    if (!user.userId) return;

    setLikedStatus(prevLikedStatus => {
      const isCurrentlyLiked = !!prevLikedStatus[videoId];
      const endpoint = isCurrentlyLiked ? 'dislike' : 'like';

      apiClient.post(`/api/videos/${videoId}/${endpoint}`, null, {
        params: { userId: user.userId, firstName: user.firstName },
      }).catch(() => {
        Alert.alert('Error', 'Could not update like status.');
        setLikedStatus(currentStatus => ({ ...currentStatus, [videoId]: isCurrentlyLiked }));
      });

      return { ...prevLikedStatus, [videoId]: !isCurrentlyLiked };
    });
  }, [user.userId, user.firstName]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveVideoIndex(viewableItems[0].index);
    }
  }).current;

  const renderItem = useCallback(({ item, index }) => (
    <VideoPlayer
      item={item}
      isActive={isFocused && index === activeVideoIndex}
      onLike={handleLike}
      isLiked={!!likedStatus[item.id]}
    />
  ), [isFocused, activeVideoIndex, handleLike, likedStatus]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        initialScrollIndex={route.params?.index || 0}
        getItemLayout={(data, index) => ({
          length: windowHeight,
          offset: windowHeight * index,
          index,
        })}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  page: { width: '100%', height: windowHeight, justifyContent: 'center', alignItems: 'center' },
  loader: { position: 'absolute' },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, padding: 15, justifyContent: 'space-between' },
  topControls: { flexDirection: 'row', justifyContent: 'flex-start', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 50 },
  bottomControls: { flexDirection: 'row', alignItems: 'flex-end' },
  leftColumn: { flex: 1, justifyContent: 'flex-end', paddingRight: 20 },
  rightColumn: { justifyContent: 'space-around', alignItems: 'center', paddingVertical: 20, marginBottom: '30%' },
  userDetails: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  profileImage: { width: 45, height: 45, borderRadius: 25, borderWidth: 2, borderColor: '#fff' },
  userName: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  iconButton: { alignItems: 'center', paddingVertical: 10 },
  iconText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  transcriptionContainer: { backgroundColor: 'rgba(0, 0, 0, 0.5)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginTop: 10, alignSelf: 'center', marginBottom: '10%' },
  transcriptionText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  playPauseOverlay: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  heartAnimationContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
});

export default HomeSwipe;