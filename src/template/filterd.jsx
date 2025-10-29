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
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './api';

// --- Memoized and Animated Video Item (Unchanged) ---
const VideoThumbnail = memo(({ item, index, onPress }) => {
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
        {item.thumbnail ? (<ImageBackground source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />) : (<View style={styles.noThumbnailView}><Text style={styles.noThumbnailText}>No Thumbnail</Text></View>)}
      </TouchableOpacity>
    </Animated.View>
  );
});

const FilteredVideosScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { filterCriteria = {} } = route.params || {};

  const [isLoading, setIsLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [videos, setVideos] = useState([]);
  const [user, setUser] = useState({ firstName: '' });

  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const VIDEO_PAGE_SIZE = 20;

  const fetchFilteredVideos = useCallback(async (currentPage, filters) => {
    const loadingFunc = currentPage === 0 ? setIsLoading : setLoadingMore;
    if (!isRefreshing) loadingFunc(true);

    try {
      const payload = { ...filters, page: currentPage, size: VIDEO_PAGE_SIZE };
      const response = await apiClient.post('/api/videos/filter', payload);
      const newVideos = response.data?.videos || response.data || [];

      if (!Array.isArray(newVideos)) throw new Error('Invalid video data format');
      
      const totalPages = response.data?.totalPages;
      const responseCurrentPage = response.data?.currentPage;

      if (totalPages !== undefined && responseCurrentPage !== undefined) {
        if (responseCurrentPage >= totalPages - 1 || newVideos.length === 0) {
          setHasMoreData(false);
        }
      } else if (newVideos.length < VIDEO_PAGE_SIZE) {
        setHasMoreData(false);
      }
      
      // ✅ FIX: Map the raw API data to the consistent structure you need
      const formattedVideos = newVideos
        .filter(video => video.thumbnail)
        .map(video => ({
          id: video.id,
          userId: video.userId,
          uri: video.videoUrl || video.uri,
          firstName: video.firstname || video.firstName || '',
          profileImage: video.profilePic || null, 
          phoneNumber: video.phoneNumber || video.phonenumber || '',
          email: video.email || '',
          thumbnail: video.thumbnail || null,
        }));

      if (currentPage === 0) {
        setVideos(formattedVideos);
      } else {
        setVideos(prevVideos => {
          const newUniqueVideos = formattedVideos.filter(nv => !prevVideos.some(pv => pv.id === nv.id));
          return [...prevVideos, ...newUniqueVideos];
        });
      }
    } catch (err) {
      console.error('Error fetching filtered videos:', err);
      setHasMoreData(false);
    } finally {
      if (!isRefreshing) loadingFunc(false);
    }
  }, [isRefreshing]);

  useEffect(() => {
    const loadInitialData = async () => {
      const firstName = await AsyncStorage.getItem('firstName');
      const profilePic = await AsyncStorage.getItem('profileUrl');
      setUser({ firstName });
      setProfileImage(profilePic);

      setVideos([]);
      setPage(0);
      setHasMoreData(true);
      await fetchFilteredVideos(0, filterCriteria);
    };
    
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(0);
    setHasMoreData(true);
    await fetchFilteredVideos(0, filterCriteria);
    setIsRefreshing(false);
  }, [filterCriteria, fetchFilteredVideos]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMoreData && !isRefreshing) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFilteredVideos(nextPage, filterCriteria);
    }
  };

  const handleVideoPress = useCallback((item, index) => {
    // Now `videos` contains the correctly formatted objects, so `item` is also correct
    navigation.navigate('FilterSwipe', {
      index: index,
      allvideos: videos, // Passing the full, correctly formatted list
    });
  }, [navigation, videos]);

  const renderItem = useCallback(({ item, index }) => (
    <VideoThumbnail item={item} index={index} onPress={() => handleVideoPress(item, index)} />
  ), [handleVideoPress]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator style={{ marginVertical: 20 }} size="large" color="#ffffff" />;
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No Videos Found</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header profile={profileImage} userName={user.firstName} />
      <ImageBackground source={require('./assets/login.jpg')} style={styles.imageBackground}>
        {isLoading && videos.length === 0 ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : (
          <FlatList
            data={videos}
            renderItem={renderItem}
            keyExtractor={(item) => (item.id || item.Id).toString()}
            numColumns={4}
            ListEmptyComponent={ListEmptyComponent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
          />
        )}
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 25, },
  imageBackground: { flex: 1, justifyContent: 'center', },
  videoItemContainer: { flex: 1 / 4, aspectRatio: 9 / 16, padding: 1.5, },
  videoItem: { flex: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#222', },
  thumbnail: { flex: 1, },
  noThumbnail: { flex: 1, alignItems: 'center', justifyContent: 'center', },
  noThumbnailView: { flex: 1, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', },
  noThumbnailText: { color: '#888', fontSize: 10, },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100, },
  emptyText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', },
});

export default FilteredVideosScreen;