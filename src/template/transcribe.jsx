import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Modal,
  TextInput,
  ImageBackground,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from './header';
import Video from 'react-native-video';
import { BlurView } from "@react-native-community/blur";
import apiClient from './api';

// --- Reusable API Service Object ---
// The fetchProfilePic function has been removed.
const apiService = {
  fetchVideo: (userId) => apiClient.get(`/api/videos/user/${userId}`),
  fetchTranscription: (videoId) => apiClient.get(`/api/videos/${videoId}/transcription`),
  updateTranscription: (videoId, transcription) => apiClient.put(`/api/videos/${videoId}/transcription`, { transcription }),
};

// --- Child Components (Unchanged) ---
const VideoPlayer = memo(({ uri }) => (
  <View style={styles.video.container}>
    <Video
      source={{ uri }}
      style={styles.video.player}
      resizeMode="contain"
      controls={true}
    />
  </View>
));

const ActionButtons = memo(({ onTranscriptionPress, onDonePress }) => (
  <View style={styles.buttons.container}>
    <TouchableOpacity style={styles.buttons.button} onPress={onTranscriptionPress}>
      <Text style={styles.buttons.text}>Check Transcription</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.buttons.button} onPress={onDonePress}>
      <Text style={styles.buttons.text}>Done</Text>
    </TouchableOpacity>
  </View>
));

const TranscriptionModal = memo(({ visible, transcription, onUpdate, onClose, onTextChange }) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modal.background}>
      <View style={styles.modal.glassContainer}>
        <BlurView style={styles.modal.blurView} blurType="light" blurAmount={20} />
        <Text style={styles.modal.title}>Transcription</Text>
        <TextInput
          defaultValue={transcription}
          onChangeText={onTextChange}
          style={styles.modal.input}
          multiline
          placeholder="Enter transcription..."
          placeholderTextColor="rgba(0, 0, 0, 0.4)"
        />
        <View style={styles.modal.buttonContainer}>
          <TouchableOpacity style={styles.buttons.button} onPress={onUpdate}>
            <Text style={styles.buttons.text}>Update</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttons.button} onPress={onClose}>
            <Text style={styles.buttons.text}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
));

// --- Main Component ---
const TranscribeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [user, setUser] = useState({ firstName: '', industry: '', userId: null });
  const [videoData, setVideoData] = useState({ uri: null, transcription: '', id: null, hasVideo: false });
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [newTranscription, setNewTranscription] = useState('');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Fetch all necessary data from AsyncStorage at the same time
        const [userId, firstName, industry, cachedProfileImage] = await Promise.all([
            AsyncStorage.getItem('userId'),
            AsyncStorage.getItem('firstName'),
            AsyncStorage.getItem('industry'),
            AsyncStorage.getItem('cachedProfileImage') // Get profile pic from storage
        ]);
        
        if (!userId) {
          throw new Error("User not found in storage");
        }
        
        // Set user data and profile image from storage
        setUser({ userId, firstName, industry });
        if (cachedProfileImage) {
            setProfileImage(cachedProfileImage);
        }
        
        // Now, handle the video data
        if (route.params?.videos?.length > 0) {
          const newVideo = route.params.videos[0];
          setVideoData({
            uri: newVideo.url,
            hasVideo: true,
            id: newVideo.id,
            transcription: newVideo.transcription || '',
          });
        } else {
          // Fallback to fetching the user's main video
          const videoRes = await apiService.fetchVideo(userId);
          if (videoRes.data && videoRes.data.videoUrl) {
            setVideoData({
              uri: videoRes.data.videoUrl,
              hasVideo: true,
              id: videoRes.data.videoId,
              transcription: videoRes.data.transcription || '',
            });
          } else {
            setVideoData(prev => ({...prev, hasVideo: false}));
          }
        }
      } catch (error) {
        console.error("Failed to load essential data:", error);
        Alert.alert('Error', 'Could not load user data. Please log in again.');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [route.params]);

  const handleFetchTranscription = useCallback(async () => {
    if (!videoData.id) return;
    setLoading(true);
    try {
      const response = await apiService.fetchTranscription(videoData.id);
      if (response.data.transcription) {
        setVideoData(prev => ({ ...prev, transcription: response.data.transcription }));
        setNewTranscription(response.data.transcription);
        setModalVisible(true);
      } else {
        Alert.alert('Info', 'No transcription available for this video.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch transcription.');
    } finally {
      setLoading(false);
    }
  }, [videoData.id]);

  const handleUpdateTranscription = useCallback(async () => {
    if (!videoData.id) return;
    try {
      await apiService.updateTranscription(videoData.id, newTranscription);
      setVideoData(prev => ({ ...prev, transcription: newTranscription }));
      setModalVisible(false);
      Alert.alert('Success', 'Transcription updated!');
    } catch (error) {
      console.error('Error updating transcription:', error);
      Alert.alert('Error', 'Failed to update transcription.');
    }
  }, [videoData.id, newTranscription]);
  
  if (loading) {
    return (
      <View style={styles.page.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
  
  return (
    <View style={styles.page.container}>
      <Header
        profile={profileImage}
        userName={user.firstName}
        jobOption={user.industry}
      />
      <ImageBackground
        source={require('./assets/login.jpg')}
        style={styles.page.imageBackground}>
        <View style={styles.page.contentContainer}>
          {videoData.hasVideo && videoData.uri ? (
            <>
              <VideoPlayer uri={videoData.uri} />
              <ActionButtons
                onTranscriptionPress={handleFetchTranscription}
                onDonePress={() => navigation.navigate('home1')}
              />
            </>
          ) : (
            <View style={styles.page.centered}>
                <Text style={styles.page.noVideoText}>No video available.</Text>
            </View>
          )}
        </View>
      </ImageBackground>
      <TranscriptionModal
        visible={isModalVisible}
        transcription={videoData.transcription}
        onTextChange={setNewTranscription}
        onUpdate={handleUpdateTranscription}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};

// --- Styles (Unchanged) ---
const styles = StyleSheet.create({
  page: {
    container: {
      flex: 1,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      backgroundColor:'#000'
    },
    imageBackground: {
      flex: 1,
    },
    contentContainer: {
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 40,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noVideoText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#ffffff',
    },
  },
  video: {
    container: {
      width: '90%',
      height: '85%',
      backgroundColor: '#000',
      borderRadius: 15,
      overflow: 'hidden',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      borderColor:'#ffffff',
      borderWidth:1,
    },
    player: {
      width: '100%',
      height: '100%',
    },
  },
  buttons: {
    container: {
      flexDirection: 'row',
      justifyContent: 'center',
      width: '90%',
      gap: 15,
      elevation:5,
    },
    button: {
      backgroundColor: '#2e80d8',
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 25,
      elevation: 5,
    },
    text: {
      color: '#fff',
      textAlign: 'center',
      fontSize: 20,
      fontWeight: 'bold',
    },
  },
  modal: {
    background: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    glassContainer: {
      width: '95%',
      borderRadius: 20,
      overflow: 'hidden',
      borderColor: 'rgba(255, 255, 255, 0.5)',
      borderWidth: 1.5,
    },
    blurView: {
      position: 'absolute',
      top: 0, left: 0, bottom: 0, right: 0,
    },
    title: {
      color: '#000',
      fontWeight: 'bold',
      fontSize: 30,
      marginBottom: '5%',
      marginTop: '5%',
      textAlign: 'center',
    },
    input: {
      width: '100%',
      minHeight: 150,
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      borderRadius: 10,
      padding: 15,
      color: '#000',
      fontSize: 16,
      textAlignVertical: 'top',
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      width: '100%',
      marginTop: '5%',
      marginBottom: '5%',
      gap: 20,
    },
  },
});

export default TranscribeScreen;