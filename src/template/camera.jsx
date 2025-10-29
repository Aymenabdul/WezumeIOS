import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Platform,
  Alert,
  TextInput,
  StatusBar,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { BlurView } from '@react-native-community/blur';
import Video from 'react-native-video';
import Svg, { Circle } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import env from './env';
import apiClient from './api';

const UploadProgressCircle = ({ progress }) => {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={styles.upload.progressContainer}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          stroke="#555"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke="#fff"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {progress < 100 && (
          <Text style={styles.upload.progressText}>{`${progress.toFixed(1)}%`}</Text>
      )}
    </View>
  );
};

const CameraPage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, roleCode, college } = route.params || {};
  
  const [isRecording, setIsRecording] = useState(false);
  const [currentTimer, setCurrentTimer] = useState(0);
  const [onFlash, setOnFlash] = useState('off');
  const [videoPath, setVideoPath] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [showJobIdPrompt, setShowJobIdPrompt] = useState(true);
  const [jobId, setJobId] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);

  const cameraRef = useRef(null);
  const timerInterval = useRef(null);
  const device = useCameraDevice(isFrontCamera ? 'front' : 'back');
  
  useEffect(() => {
    const checkPermissions = async () => {
      const microphoneStatus = await Camera.getMicrophonePermissionStatus();
      setHasMicrophonePermission(microphoneStatus === 'granted');
    };
    checkPermissions();
  }, []);

  const showPermissionsAlert = () => {
    Alert.alert(
      'Permissions Required',
      'To record videos, the app needs access to your Camera and Microphone. Please grant permissions in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  };

  const handleRequestPermission = useCallback(async () => {
    const cameraResult = await requestCameraPermission();
    if (!cameraResult) {
      showPermissionsAlert();
      return;
    }
    
    const microphoneResult = await Camera.requestMicrophonePermission();
    if (!microphoneResult) {
      showPermissionsAlert();
      return;
    }

    setHasMicrophonePermission(true);
  }, [requestCameraPermission]);

  const stopRecording = useCallback(async () => {
    if (cameraRef.current) {
      await cameraRef.current.stopRecording();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (cameraRef.current && !isRecording) {
      setIsRecording(true);
      setCurrentTimer(0); 

      cameraRef.current.startRecording({
        onRecordingFinished: (video) => {
          setIsRecording(false);
          clearInterval(timerInterval.current);
          
          if (video && video.path) {
            const recordingDuration = video.duration;

            if (recordingDuration >= 30) {
              setVideoPath(video.path);
              setShowPreview(true);
            } else {
              Alert.alert(
                "Recording Too Short",
                `Please record for at least 30 seconds. Your video was only ${Math.round(recordingDuration)} seconds.`,
                [{ text: "OK" }]
              );
              setVideoPath(null);
              setCurrentTimer(0);
            }
          } else {
             console.error('Recording failed: No video object received.');
             Alert.alert('Error', 'Failed to save the recording. Please try again.');
          }
        },
        onRecordingError: (error) => {
          console.error('Recording error:', error);
          setIsRecording(false);
          clearInterval(timerInterval.current);
        },
      });

      timerInterval.current = setInterval(() => {
        setCurrentTimer(prev => {
          if (prev >= 59) {
            clearInterval(timerInterval.current);
            stopRecording();
          }
          return prev + 1;
        });
      }, 1000);
    }
  }, [isRecording, stopRecording]);

  const handleUploadVideo = useCallback(async () => {
    if (!videoPath) {
      Alert.alert('Error', 'No video to upload.');
      return;
    }
    setShowPreview(false);
    setUploading(true);
    setUploadProgress(0);

    const randomFileName = `${Date.now()}.mp4`;
    const formattedUri = videoPath;

    try {
      const formData = new FormData();
      formData.append('file', { uri: formattedUri, type: 'video/mp4', name: randomFileName });
      formData.append('userId', String(userId));
      formData.append('jobId', String(jobId));
      formData.append('roleCode', String(roleCode));
      formData.append('college', String(college));

      const response = await apiClient.post(`/api/videos/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = (progressEvent.loaded / progressEvent.total) * 100;
          setUploadProgress(percent);
        },
      });

      setUploadProgress(100);

      if (response.data?.filePath && response.data?.id) {
        setTimeout(() => {
          Alert.alert('Success', 'Video uploaded successfully!');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Transcribe', params: { userId, videos: [response.data] } }],
          });
        }, 2000); 
      } else {
        throw new Error('Unexpected server response.');
      }
    } catch (error) {
      console.error('Upload Error:', error.response?.data || error.message);
      Alert.alert('Error', 'Error uploading video. Please try again.');
      setUploading(false);
      setVideoPath(null);
      setCurrentTimer(0);
    }
  }, [videoPath, userId, jobId, roleCode, college, navigation]);

  const handleRedo = () => {
    setShowPreview(false);
    setVideoPath(null);
    setCurrentTimer(0);
  };
  
  if (!device) {
    return <ActivityIndicator style={styles.container} color="#fff" size="large" />;
  }
  
  if (!hasCameraPermission || !hasMicrophonePermission) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permission.container}>
          <Icon name="lock-alert" size={80} color="#FFA500" />
          <Text style={styles.permission.title}>Camera & Microphone Access</Text>
          <Text style={styles.permission.message}>
            To record videos with sound, this app needs access to both your camera and your microphone.
          </Text>
          <TouchableOpacity style={styles.permission.button} onPress={handleRequestPermission}>
            <Text style={styles.permission.buttonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Camera
        ref={cameraRef}
        device={device}
        isActive={true}
        style={StyleSheet.absoluteFill}
        video={true}
        audio={true}
        torch={onFlash}
      />
      
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.iconButton} onPress={() => setOnFlash(f => f === 'off' ? 'on' : 'off')}>
          <Icon name={onFlash === 'off' ? 'flash' : 'flash-off'} color="white" size={28} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Icon name="close" color="white" size={28} />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.iconButton} onPress={() => setIsFrontCamera(p => !p)}>
            <Icon name="camera-flip-outline" size={32} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.recordButton}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <View style={[styles.recordButtonInner, isRecording && styles.recordButtonRecording]} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={() => videoPath ? setShowPreview(true) : null} disabled={!videoPath}>
            <Icon name="play-box-outline" size={32} color={videoPath ? "white" : "#666"} />
        </TouchableOpacity>
      </View>

      {isRecording && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{`00:${currentTimer.toString().padStart(2, '0')}`}</Text>
        </View>
      )}

      <Modal animationType="fade" visible={showPreview} transparent={true}>
        <BlurView style={styles.modal.blurView} blurType="dark" blurAmount={10} />
        <View style={styles.modal.container}>
            <Text style={styles.modal.header}>Preview Video</Text>
            <View style={styles.modal.videoContainer}>
              <Video source={{ uri: videoPath }} style={styles.modal.videoPlayer} controls resizeMode="contain" repeat/>
            </View>
            <View style={styles.modal.buttonContainer}>
              <TouchableOpacity style={styles.modal.button} onPress={handleRedo}>
                <BlurView style={styles.modal.buttonBlur} blurType="light" blurAmount={15}>
                    <Icon name="trash-can-outline" size={28} color="#FF5A5F" />
                    <Text style={[styles.modal.buttonText, {color: '#FF5A5F'}]}>Redo</Text>
                </BlurView>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modal.button} onPress={handleUploadVideo}>
                <BlurView style={styles.modal.buttonBlur} blurType="light" blurAmount={15}>
                    <Icon name="cloud-upload-outline" size={28} color="#00A699" />
                    <Text style={[styles.modal.buttonText, {color: '#00A699'}]}>Upload</Text>
                </BlurView>
              </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {isUploading && (
        <View style={styles.upload.overlay}>
            <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={15}/>
            {uploadProgress < 100 ? (
                <UploadProgressCircle progress={uploadProgress} />
            ) : (
                <ActivityIndicator size="large" color="#fff" />
            )}
            <Text style={styles.upload.text}>
              {uploadProgress < 100 ? 'Uploading video...' : 'Processing video...'}
            </Text>
        </View>
      )}

      <Modal transparent={true} animationType="fade" visible={showJobIdPrompt}>
        <View style={styles.jobId.container}>
          <View style={styles.jobId.content}>
            <Text style={styles.jobId.title}>Choose an ID</Text>
            <Text style={styles.jobId.text}>If you want to apply for a specific position, enter the Job ID below.</Text>
            <TextInput placeholder="Enter Job ID (optional)" value={jobId} onChangeText={setJobId} style={styles.jobId.input} />
            <View style={styles.jobId.buttonContainer}>
              <TouchableOpacity onPress={() => { setShowJobIdPrompt(false); setJobId(''); }} style={[styles.jobId.button, styles.jobId.buttonSkip]}>
                <Text style={styles.jobId.buttonText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowJobIdPrompt(false)} style={[styles.jobId.button, styles.jobId.buttonSubmit]}>
                <Text style={styles.jobId.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  topControls: {
    position: 'absolute',
    top: 60, // iOS safe area
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 10,
  },
  iconButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 50,
  },
  timerContainer: {
    position: 'absolute',
    top: 65, // iOS safe area
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    zIndex: 10,
  },
  timerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#e0e0e0',
  },
  recordButtonRecording: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FF5A5F',
  },
  modal: {
    blurView: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 80,
      paddingBottom: 60,
      paddingHorizontal: 20,
    },
    header: {
      color: 'white',
      fontSize: 24,
      fontWeight: 'bold',
    },
    videoContainer: {
      width: '100%',
      height: '85%',
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    videoPlayer: {
      width: '100%',
      height: '100%',
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
    },
    button: {
      alignItems: 'center',
    },
    buttonBlur: {
        width: 120,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 15,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 5,
    },
  },
  upload: {
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 99,
    },
    progressContainer: {
      width: 120,
      height: 120,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressText: {
      position: 'absolute',
      color: 'white',
      fontSize: 24,
      fontWeight: 'bold',
    },
    text: {
      color: 'white',
      fontSize: 18,
      marginTop: 20,
      fontWeight: '500',
    },
  },
  jobId: {
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    content: {
        width: '85%',
        backgroundColor: 'white',
        padding: 25,
        borderRadius: 15,
    },
    title: {
        fontSize: 20, 
        fontWeight: 'bold', 
        marginBottom: 10, 
        textAlign: 'center'
    },
    text: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        color: '#666'
    },
    input: { 
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row', 
        justifyContent: 'space-between'
    },
    button: {
        paddingVertical: 12,
        borderRadius: 8,
        width: '48%',
        alignItems: 'center',
    },
    buttonSkip: {
        backgroundColor: '#A9A9A9',
    },
    buttonSubmit: {
        backgroundColor: '#007AFF',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
  },
  permission: {
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#1c1c1c',
      padding: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: 'white',
      marginTop: 20,
      textAlign: 'center',
    },
    message: {
      fontSize: 16,
      color: '#ccc',
      textAlign: 'center',
      marginTop: 10,
      lineHeight: 22,
    },
    button: {
      backgroundColor: '#007AFF',
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 25,
      marginTop: 30,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  },
});

export default CameraPage;