import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
  FlatList,
  TouchableOpacity,
  Alert,
  BackHandler,
  ActivityIndicator,
  Platform,
  StatusBar,
  Text,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import Header from './header';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './api';

const CACHED_ROLE_VIDEOS_KEY = 'cachedRoleVideos';

// --- Memoized and Animated Video Item ---
const RoleVideoThumbnail = memo(({ item, index, onPress }) => {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 50, withTiming(1));
    opacity.value = withDelay(index * 50, withTiming(1));
  }, [index, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.videoItemContainer, animatedStyle]}>
      <TouchableOpacity onPress={onPress} style={styles.videoItem}>
        {item.thumbnail ? (
          <ImageBackground
            source={{ uri: item.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noThumbnailView}>
            <Text style={styles.noThumbnailText}>No Thumbnail</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

const RoleSelection = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState({ userId: null, firstName: '', jobid: null });
  const [videos, setVideos] = useState([]);
  const [profileImage, setProfileImage] = useState(null);

  // --- Pagination and Refreshing State ---
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const VIDEO_PAGE_SIZE = 20;

  const fetchVideosFromServer = useCallback(async (currentPage, jobid) => {
    // The primary guards are now in the calling functions (handleLoadMore/handleRefresh)
    // This function can be simpler.
    const loadingFunction = currentPage === 0 ? setIsLoading : setLoadingMore;
    if (!isRefreshing) loadingFunction(true);
    
    try {
      const response = await apiClient.get(`/api/videos/job/${jobid}?page=${currentPage}&size=${VIDEO_PAGE_SIZE}`);
      
      const videoData = response.data.videos || response.data;
      const totalPages = response.data.totalPages;
      const responseCurrentPage = response.data.currentPage;

      if (!Array.isArray(videoData)) throw new Error('Invalid video data format');
      
      if (!totalPages || responseCurrentPage >= totalPages - 1 || videoData.length === 0) {
        setHasMoreData(false);
      }

      const formattedVideos = videoData.map(video => ({
        id: video.id,
        userId: video.userId,
        uri: video.videoUrl || video.uri,
        firstName: video.firstname || video.firstName || '',
        profileImage: video.profilePic, 
        phoneNumber: video.phonenumber || video.phoneNumber || '',
        email: video.email || '',
        thumbnail: video.thumbnail || null,
      }));

      if (currentPage === 0) {
        setVideos(formattedVideos);
        await AsyncStorage.setItem(CACHED_ROLE_VIDEOS_KEY, JSON.stringify(formattedVideos));
      } else {
        setVideos(prevVideos => {
          const newUniqueVideos = formattedVideos.filter(
            newVideo => !prevVideos.some(prevVideo => prevVideo.id === newVideo.id)
          );
          const updatedVideos = [...prevVideos, ...newUniqueVideos];
          AsyncStorage.setItem(CACHED_ROLE_VIDEOS_KEY, JSON.stringify(updatedVideos));
          return updatedVideos;
        });
      }

    } catch (err) {
      console.error('Error fetching role videos from server:', err);
      setHasMoreData(false);
    } finally {
      if (!isRefreshing) loadingFunction(false);
    }
  }, [isRefreshing]); // ✅ FIX: Simplified dependencies

  // ✅ FIX: This useEffect now runs ONLY ONCE when the component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      const firstName = await AsyncStorage.getItem('firstName');
      const userIdStr = await AsyncStorage.getItem('userId');
      const jobid = await AsyncStorage.getItem('jobid');
      const userId = userIdStr ? parseInt(userIdStr, 10) : null;
      const profilePic = await AsyncStorage.getItem('profileUrl');

      if (!userId || !jobid) {
        Alert.alert("Error", "User data or Job ID not found. Please log in again.");
        navigation.replace('LoginScreen');
        return;
      }
      
      const currentUser = { firstName, userId, jobid };
      setUser(currentUser);
      setProfileImage(profilePic);
      
      try {
        const cachedVideos = await AsyncStorage.getItem(CACHED_ROLE_VIDEOS_KEY);
        if (cachedVideos) {
          setVideos(JSON.parse(cachedVideos));
        }
      } catch (error) {
        console.error("Error loading videos from cache:", error);
      }

      // Fetch fresh data for page 0 to ensure content isn't stale
      await fetchVideosFromServer(0, currentUser.jobid);
      setIsLoading(false);
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ FIX: Empty dependency array ensures this runs only once


  // --- Handlers ---
  // ✅ FIX: Created a dedicated refresh handler to reset the list
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(0);
    setHasMoreData(true);
    await fetchVideosFromServer(0, user.jobid);
    setIsRefreshing(false);
  }, [user.jobid, fetchVideosFromServer]);

  const handleLoadMore = () => {
    // This is the primary gatekeeper to prevent multiple fetches
    if (!loadingMore && hasMoreData && !isRefreshing) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchVideosFromServer(nextPage, user.jobid);
    }
  };
  
  const handleVideoPress = useCallback((item, index) => {
    navigation.navigate('RoleSwipe', {
      videoId: item.id,
      index,
      allvideos: videos,
    });
  }, [navigation, videos]);

  const renderItem = useCallback(({ item, index }) => (
    <RoleVideoThumbnail
      item={item}
      index={index}
      onPress={() => handleVideoPress(item, index)}
    />
  ), [handleVideoPress]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator style={{ marginVertical: 20 }} size="large" color="#ffffff" />;
  };

  // --- Back Button Handler ---
  useEffect(() => {
    const backAction = () => {
      if (isFocused) {
        Alert.alert('Hold on!', 'Are you sure you want to go back?', [
          { text: 'Cancel', onPress: () => null, style: 'cancel' },
          { text: 'YES', onPress: () => navigation.goBack() },
        ]);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isFocused, navigation]);

  return (
    <View style={styles.container}>
      <Header userName={user.firstName} profile={profileImage} />
      <ImageBackground source={require('./assets/login.jpg')} style={styles.imageBackground}>
        {isLoading && videos.length === 0 ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : (
          <FlatList
            data={videos}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={4}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={!isLoading && !isRefreshing ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No videos found for this role.</Text>
                </View>
            ) : null}
            // ✅ FIX: Added props for pull-to-refresh
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
          />
        )}
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 25,
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'center',
  },
  videoItemContainer: {
    flex: 1 / 4,
    aspectRatio: 9 / 16,
    padding: 1,
  },
  videoItem: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  thumbnail: {
    flex: 1,
  },
  noThumbnailView: {
    flex: 1,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noThumbnailText: {
    color: '#888',
    fontSize: 10,
  },
  emptyContainer: {
    flex: 1,
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
  },
});

export default RoleSelection;