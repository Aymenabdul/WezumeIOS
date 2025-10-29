import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import ScoreIcon from 'react-native-vector-icons/SimpleLineIcons';
import BackIcon from 'react-native-vector-icons/AntDesign';
import axios from 'axios';
import { Buffer } from 'buffer';
import env from './env';
import LinearGradient from 'react-native-linear-gradient';
import apiClient from './api';

// --- Reusable Animated Components ---

const AnimatedScoreBar = ({ label, score, delay }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (typeof score === 'number') {
      progress.value = withDelay(delay, withTiming(score / 10, { duration: 800 }));
    }
  }, [score, progress, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const getColor = (s) => {
    if (s < 4) return '#e74c3c';
    if (s <= 7) return '#f39c12';
    return '#27ae60';
  };

  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarLabelContainer}>
        <Text style={styles.scoreBarLabel}>{label}</Text>
        <Text style={styles.scoreBarPercentage}>{Math.round((score || 0) * 10)}%</Text>
      </View>
      <View style={styles.scoreBarTrack}>
        <Animated.View style={[styles.scoreBarFill, { backgroundColor: getColor(score || 0) }, animatedStyle]} />
      </View>
    </View>
  );
};

const AnimatedCard = ({ children, delay, style }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(delay, withSpring(0));
  }, [delay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.section, animatedStyle, style]}>{children}</Animated.View>;
};

const Scoring = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { videoId, userId } = route.params;

  // --- All Original State Variables ---
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ strength: '', improvement: '' });
  const [score, setScore] = useState(0);
  const [clarityScore, setClarityScore] = useState(0); // Renamed for consistency
  const [confidenceScore, setConfidenceScore] = useState(0); // Renamed for consistency
  const [authenticityScore, setAuthenticityScore] = useState(0); // Renamed for consistency
  const [emotionalScore, setEmotionalScore] = useState(0); // Renamed for consistency
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // --- All Original Functions (Corrected) ---
  const getDynamicFeedback = ({ Clarity, Confidence, Authenticity, emotional }) => {
    const scores = [
      { key: 'Clarity', value: Number(Clarity) },
      { key: 'Confidence', value: Number(Confidence) },
      { key: 'Authenticity', value: Number(Authenticity) },
      { key: 'Emotional', value: Number(emotional) },
    ];
    scores.sort((a, b) => a.value - b.value);
    const weakest = scores[0]?.key;
    if (!weakest) return { strength: 'Well-rounded performance!', improvement: 'Continue practicing all areas.' };

    const feedbackMessages = {
      Clarity: { strength: 'Shows potential to express ideas.', improvement: 'Needs structured thought and clearer articulation.' },
      Confidence: { strength: 'Shows honesty and openness.', improvement: 'Work on tone, eye contact, and vocal steadiness.' },
      Authenticity: { strength: 'Cautious and controlled.', improvement: 'Loosen up for better emotional engagement.' },
      Emotional: { strength: 'Mindful and considered.', improvement: 'Vary pace and tone to match emotional context.' },
    };
    return feedbackMessages[weakest];
  };

  const getHashtags = (clarity) => {
    if (clarity < 4) {
      const tags = ['#Fragmented', '#Unclear', '#Fuzzy'];
      return tags[Math.floor(Math.random() * tags.length)];
    }
    if (clarity >= 4 && clarity <= 6) {
      const tags = ['#Improving', '#Understandable', '#Coherent'];
      return tags[Math.floor(Math.random() * tags.length)];
    }
    if (clarity > 6 && clarity <= 8) {
      const tags = ['#Fluent', '#Clear', '#Articulate'];
      return tags[Math.floor(Math.random() * tags.length)];
    }
    return '#Articulate';
  };

  const getHashtags1 = (confidence) => {
    if (confidence < 4) {
      const tags = ['#Hesitant', '#Unsteady', '#Reserved'];
      return tags[Math.floor(Math.random() * tags.length)];
    }
    if (confidence >= 4 && confidence <= 6) {
      const tags = ['#Composed', '#Balanced', '#Steady'];
      return tags[Math.floor(Math.random() * tags.length)];
    }
    if (confidence > 6 && confidence <= 8) {
      const tags = ['#Poised'];
      return tags[Math.floor(Math.random() * tags.length)];
    }
    return '#Assured';
  };

  const getHashtags2 = (authenticity) => {
    if (authenticity < 4) {
      const tags = ['#Guarded', '#Mechanical', '#Distant'];
      return tags[Math.floor(Math.random() * tags.length)];
    }
    if (authenticity >= 4 && authenticity <= 6) {
      const tags = ['#Honest', '#Sincere', '#Natural'];
      return tags[Math.floor(Math.random() * tags.length)];
    }
    if (authenticity > 6 && authenticity <= 8) {
      const tags = ['#Natural'];
      return tags[Math.floor(Math.random() * tags.length)];
    }
    return '#Genuine';
  };

  const getHashtags3 = (emotional) => {
    if (emotional < 4) {
      const tags = ['#Disconnected', '#Flat', '#Detached'];
      return tags[Math.floor(Math.random() * tags.length)];
    }
    if (emotional >= 4 && emotional <= 6) {
      const tags = ['#In-Tune', '#Observant', '#Thoughtful'];
      return tags[Math.floor(Math.random() * tags.length)];
    }
    if (emotional > 6 && emotional <= 8) {
      const tags = ['#Empathic'];
      return tags[Math.floor(Math.random() * tags.length)];
    }
    return '#Expressive';
  };

  // --- Placeholder for Missing Function ---
  const fetchProfilePic = async (uId) => {
    // Implement your logic here to fetch the profile picture
    // For now, this is a placeholder to prevent the app from crashing.
    console.log(`Fetching profile pic for userId: ${uId}`);
    try {
      // Replace with your actual API endpoint to get profile image URL
      const response = await apiClient.get(`/api/user/profilePic/${uId}`);
      if (response.data && response.data.profileImage) {
        setProfileImage(response.data.profileImage);
      }
    } catch (error) {
      console.error('Error fetching profile pic:', error);
    }
  };

  useEffect(() => {
    const fetchScore = async (vId) => {
      try {
        const response = await apiClient.get(`/api/totalscore/${vId}`);
        setClarityScore(response.data.clarityScore || 0);
        setConfidenceScore(response.data.confidenceScore || 0); // Fixed typo
        setAuthenticityScore(response.data.authenticityScore || 0);
        setEmotionalScore(response.data.emotionalScore || 0);
        setScore(response.data.totalScore || 0);
        setFeedback(getDynamicFeedback({
          Clarity: response.data.clarityScore,
          Confidence: response.data.confidenceScore,
          Authenticity: response.data.authenticityScore,
          emotional: response.data.emotionalScore,
        }));
      } catch (error) {
        console.error('Error fetching score:', error);
      }
    };

    const fetchUserDetails = async (uId) => {
      try {
        const response = await apiClient.get(`/api/videos/getOwnerByUserId/${uId}`);
        if (response.data) {
          setFirstName(response.data.firstName || '');
          setLastName(response.data.lastName || '');
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    const loadAllData = async () => {
      if (videoId && userId) {
        await Promise.all([
          fetchScore(videoId),
          fetchUserDetails(userId),
          fetchProfilePic(userId),
        ]);
      }
      setLoading(false);
    };

    loadAllData();
  }, [videoId, userId]);


  if (loading) {
    return (
      <LinearGradient colors={['#2c3e50', '#3498db']} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ffffff" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#2c3e50', '#3498db']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <BackIcon name={'arrowleft'} size={24} color={'#fff'} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AnimatedCard delay={100} style={styles.profileCard}>
          <Image source={profileImage ? { uri: profileImage } : require('./assets/circle.png')} style={styles.profileImage} />
          <Text style={styles.profileName}>
            {firstName} {lastName}
          </Text>
        </AnimatedCard>

        <AnimatedCard delay={200}>
          <View style={styles.totalScoreHeader}>
            <Image
              source={require('./assets/circle.png')}
              style={{ width: 30, height: 30 }}
            />
            <Text style={styles.sectionTitle}>Scores</Text>
          </View>
          <Text style={styles.totalScoreText}>{(score || 0).toFixed(1)}/10</Text>
          <AnimatedScoreBar label="Clarity" score={clarityScore} delay={300} />
          <AnimatedScoreBar label="Confidence" score={confidenceScore} delay={400} />
          <AnimatedScoreBar label="Authenticity" score={authenticityScore} delay={500} />
          <AnimatedScoreBar label="Emotional Intelligence" score={emotionalScore} delay={600} />
        </AnimatedCard>

        <AnimatedCard delay={300}>
          <Text style={styles.sectionTitle}>Feedback</Text>
          <View style={styles.feedbackItem}>
            <Text style={styles.feedbackLabel}>Strength</Text>
            <Text style={styles.feedbackText}>{feedback.strength}</Text>
          </View>
          <View style={styles.feedbackItem}>
            <Text style={styles.feedbackLabel}>Area to Improve</Text>
            <Text style={styles.feedbackText}>{feedback.improvement}</Text>
          </View>
        </AnimatedCard>

        <AnimatedCard delay={400}>
          <Text style={styles.sectionTitle}>Keywords</Text>
          <View style={styles.hashtagContainer}>
            <Text style={styles.hashtag}>{getHashtags(clarityScore)}</Text>
            <Text style={styles.hashtag}>{getHashtags1(confidenceScore)}</Text>
            <Text style={styles.hashtag}>{getHashtags2(authenticityScore)}</Text>
            <Text style={styles.hashtag}>{getHashtags3(emotionalScore)}</Text>
          </View>
        </AnimatedCard>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    alignSelf: 'flex-start',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
    marginBottom: 0,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 15,
  },
  profileName: {
    fontSize: 28, 
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  totalScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 26, 
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  totalScoreText: {
    fontSize: 52, 
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginVertical: 10,
  },
  scoreBarContainer: {
    marginVertical: 10,
  },
  scoreBarLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scoreBarLabel: {
    fontSize: 16,
    fontWeight: '900', 
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  scoreBarPercentage: {
    fontSize: 15, 
    color: '#fff',
    fontWeight: 'bold',
  },
  scoreBarTrack: {
    height: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 6,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  feedbackItem: {
    marginVertical: 8,
  },
  feedbackLabel: {
    fontSize: 17, 
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 16, 
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  hashtag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 10,
    fontSize: 14, 
    fontWeight: '700',
    overflow: 'hidden',
  },
});
export default Scoring;