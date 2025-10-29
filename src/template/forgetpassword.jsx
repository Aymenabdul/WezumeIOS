import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import env from './env';
import { BlurView } from '@react-native-community/blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector,GestureHandlerRootView } from 'react-native-gesture-handler';
// Other imports remain the same
const { width, height } = Dimensions.get('window');

const ForgetPassword = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [newPassword, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
      // Gesture handler for the tilt effect
      const panGesture = Gesture.Pan()
        .onUpdate((event) => {
          rotateY.value = interpolate(
            event.translationX,
            [-width / 2, width / 2],
            [-10, 10] // Tilt range in degrees
          );
          rotateX.value = interpolate(
            event.translationY,
            [-height / 2, height / 2],
            [10, -10] // Tilt range in degrees
          );
        })
        .onEnd(() => {
          // Reset rotation smoothly when gesture ends
          rotateX.value = withTiming(0, { duration: 500 });
          rotateY.value = withTiming(0, { duration: 500 });
        });
    
      // Animated style for the container
      const animatedStyle = useAnimatedStyle(() => {
        const rotateXvalue = `${rotateX.value}deg`;
        const rotateYvalue = `${rotateY.value}deg`;
        return {
          transform: [
            { perspective: 300 },
            { rotateX: rotateXvalue },
            { rotateY: rotateYvalue },
          ],
        };
      });

  const handleReset = async () => {
    console.log('handleReset started');

    if (!email.trim()) {
      console.log('Email is empty');
      Alert.alert('Error', 'Please enter your email.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      console.log('New password or confirm password is empty');
      Alert.alert('Error', 'Please enter your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      console.log('Passwords do not match');
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    try {
      console.log('Proceeding to reset password...');
      setLoading(true);

      const resetResponse = await axios.put(
        `${env.baseURL}/users/update-password?email=${email}&newPassword=${newPassword}`,
        {}, // Empty body for URL parameters
        {headers: {'Content-Type': 'application/json'}}
      );

      console.log('Response from /users/update-password:', resetResponse.data);

      // Check if response contains expected message
      if (
        resetResponse.data === 'Password updated successfully.' ||
        resetResponse.data.success
      ) {
        console.log('Password reset successful');
        Alert.alert('Success', 'Password has been reset successfully.', [
          { text: 'OK', onPress: () => navigation.navigate('LoginScreen') },
        ]);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } else {
        console.log('Password reset failed');
        Alert.alert('Error', 'Failed to reset password.');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      console.log('handleReset ended');
    }
  };

  return (
    <FastImage
      style={styles.container}
      source={require('./assets/login.jpg')}
      resizeMode={FastImage.resizeMode.cover}>
      <GestureHandlerRootView style={{ flex: 1 }}>
           <GestureDetector gesture={panGesture}>
             <Animated.View style={[styles.glassContainer, animatedStyle]}>
               <BlurView
                 style={styles.absolute}
                 blurType="xlight" // Can be 'light', 'dark', 'xlight', etc.
                 blurAmount={8} // Adjust blur intensity
                 reducedTransparencyFallbackColor="white"
               />
        <Image style={styles.img2} source={require('./assets/logopng.png')} />
        <Text style={styles.title}>Reset Password</Text>
        <View style={styles.input}>
          <TextInput
            placeholder="Email"
            placeholderTextColor="#000"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.input}>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#000"
            value={newPassword}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        <View style={styles.input}>
          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor="#000"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>
        <LinearGradient colors={['#70bdff', '#2e80d8']} style={styles.btn}>
          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleReset}
            disabled={loading}>
            <Text style={styles.signupButtonText}>
              {loading ? 'Processing...' : 'Reset Password'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
      </GestureDetector>
      </GestureHandlerRootView>

    </FastImage>
  );
};

export default ForgetPassword;

const styles = StyleSheet.create({
  // This is the main screen container, likely behind an ImageBackground
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  // This is your main glass container
  glassContainer: {
    marginTop:'50%',
    alignSelf: 'center',
    width: '90%',
    padding: 25,
    borderRadius: 20, // More rounded for a modern look
    overflow: 'hidden', // Crucial for containing the blur effect
    borderColor: 'rgba(255, 255, 255, 0.4)', // Semi-transparent border
    borderWidth: 1.5,
  },
  // This style must be applied to the <BlurView> component itself
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  // Glassy input field style
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)', // Semi-transparent background
    borderWidth:0.3,
    borderColor:'#0387e0',
    padding: 14,
    marginBottom: 15,
    borderRadius: 12, // Consistent rounded corners
    color: '#333', // Darker text for readability
    fontSize: 16,
    fontWeight: '500',
  },
  // Your existing button styles, slightly adjusted for consistency
  btn: {
    width: '70%',
    alignSelf: 'center',
    borderRadius: 12, // Consistent rounded corners
    elevation: 8,
    marginTop: 20,
  },
  signupButton: {
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupButtonText: {
    fontWeight: 'bold',
    color: '#ffffff',
    fontSize: 18,
  },
  // Your existing content styles, adjusted for the new layout
  img2: {
    width: 180,
    height: 90,
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: '#333',
    marginBottom:'5%',
    marginTop:'-10%'
  },
});
