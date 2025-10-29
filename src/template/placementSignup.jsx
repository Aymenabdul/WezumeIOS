import React, { useState, useEffect } from 'react';
import {
  Image,
  TextInput,
  StyleSheet,
  Text,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  View,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
import env from './env';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
// Other imports remain the same
const { width, height } = Dimensions.get('window');

const PlacemenntSignup = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [jobOption, setJobOption] = useState('');
  const [jobid, setJobId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [college, setCollege] = useState('');
  const navigation = useNavigation();
  const [branch, setBranch] = useState(''); // Renamed from city to branch
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  // Gesture handler for the tilt effect

  const ScrollIndicator = () => {
    const translateY = useSharedValue(0);

    useEffect(() => {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-12, { duration: 800 }),
          withTiming(0, { duration: 800 })
        ),
        -1,
        true
      );
    }, [translateY]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    return (
      <Animated.View style={[styles.scrollIndicator, animatedStyle]}>
        <Icon name="chevron-down" size={40} color="rgba(0, 0, 0, 0.5)" />
      </Animated.View>
    );
  };

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

  const validateInputs = () => {
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phoneNumber ||
      !jobOption ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert('Validation Error', 'All fields are required!');
      return false;
    }


    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Invalid email format!');
      return false;
    }

    // Trim the password and confirmPassword to ensure no hidden spaces are causing a mismatch
    if (password.trim() !== confirmPassword.trim()) {
      Alert.alert('Validation Error', 'Passwords do not match!');
      return false;
    }

    if (phoneNumber.length !== 10) {
      Alert.alert(
        'Validation Error',
        'Please enter a valid 10-digit phone number!',
      );
      return false;
    }

    return true;
  };
  const checkIfEmailExists = async (email) => {
    try {
      const response = await axios.post(
        `${env.baseURL}/users/check-email`,
        { email }, // Wrapping email in an object
        { headers: { 'Content-Type': 'application/json' } },
      );
      return response.data.exists;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  const handleSignup = async () => {
    console.log("Password:", password);
    console.log("Confirm Password:", confirmPassword);

    const emailExists = await checkIfEmailExists(email);
    if (emailExists) {
      Alert.alert('Validation Error', 'Email is already registered as user');
      return;
    }
    // Check if confirmPassword is empty
    if (!confirmPassword) {
      Alert.alert('Validation Error', 'Confirm Password cannot be empty!');
      return;
    }

    if (!validateInputs()) {
      return;
    }
    const userData = {
      // Use the exact lowercase names your backend expects
      firstname: firstName,
      lastname: lastName,
      jobid: jobid,

      // These fields are already correct
      email,
      phoneNumber,
      jobOption,
      password,
      branch,
      confirmPassword,
      college,
    };

    setLoading(true);
    try {
      const response = await axios.post(
        `${env.baseURL}/api/auth/signup/placement`,
        userData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );
      Alert.alert(
        'Success',
        'Registration successful! Please check your email for verification.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to LoginScreen and reset form fields
              navigation.navigate('LoginScreen');
              setFirstName('');
              setLastName('');
              setEmail('');
              setPhoneNumber('');
              setJobOption('');
              setPassword('');
              setConfirmPassword('');
              setJobId('');
              setBranch(''); // Reset branch as well
              setCollege('');
            },
          },
        ]
      );
    } catch (error) {
      console.error(
        'Signup failed:',
        error.response ? error.response.data : error.message
      );
      Alert.alert(
        'Signup Error',
        error.response ? error.response.data : 'An unknown error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;

    // Define a small padding to trigger the hide action just before hitting the absolute bottom
    const paddingToBottom = 20;

    // This is true if the user has scrolled to the bottom
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    // This is true if the user has scrolled away from the top
    const isScrolledFromTop = contentOffset.y > 50;

    // If the user is at the bottom OR has scrolled from the top, hide the indicator
    if (isCloseToBottom || isScrolledFromTop) {
      if (showScrollIndicator) {
        setShowScrollIndicator(false);
      }
    } else {
      // Otherwise, show it
      if (!showScrollIndicator) {
        setShowScrollIndicator(true);
      }
    }
  };


  return (
    <FastImage
      style={styles.backgroundImage}
      source={require('./assets/Background-01.jpg')}
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
            <Text style={styles.title}>SignUp</Text>
            {/* scrollView */}
            <ScrollView
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={true}
              style={{ height: '40%', width: '100%' }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
              <TextInput
                style={styles.input}
                placeholder="Display Name"
                placeholderTextColor="#000"
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                placeholderTextColor="#000"
                value={lastName}
                onChangeText={setLastName}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#000"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="#000"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={jobOption}
                  style={styles.picker}
                  onValueChange={(itemValue) => setJobOption(itemValue)}>
                  <Picker.Item
                    style={{ fontSize: 16 }}
                    label="  Scroll to select your role"
                    value=""
                  />
                  <Picker.Item
                    style={{ fontSize: 16 }}
                    label="  Placement Officer"
                    value="placementDrive"
                  />
                  <Picker.Item
                    style={{ fontSize: 16 }}
                    label="  Academy Manager"
                    value="Academy"
                  />
                </Picker>
              </View>
              {/* Changed the label and value to branch */}
              <TextInput
                style={styles.input}
                placeholder="Branch"
                placeholderTextColor="#000"
                value={branch} // Changed from city to branch
                onChangeText={setBranch}
              />
              <TextInput
                style={styles.input}
                placeholder="College or Academy Name"
                placeholderTextColor="#000"
                value={college}
                onChangeText={setCollege}
              />
              <TextInput
                style={styles.input}
                placeholder="Job Id"
                placeholderTextColor="#000"
                value={jobid}
                onChangeText={setJobId}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#000"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#000"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </ScrollView>
            {showScrollIndicator && <ScrollIndicator />}
            {loading ? (
              <ActivityIndicator size="large" color="#0077B5" style={styles.loadingIndicator} />
            ) : (
              <LinearGradient colors={['#70bdff', '#2e80d8']} style={styles.btn}>
                <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
                  <Text style={styles.signupButtonText}>SignUp</Text>
                </TouchableOpacity>
              </LinearGradient>
            )}

            <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
              <Text style={styles.logAccount}>
                Already have an account? <Text style={{ color: 'blue' }}>Login</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </FastImage>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  // The 'glassContainer' style from the previous implementation
  // is now correctly matched to the overall aesthetic.
  glassContainer: {
    width: '90%',
    height: '60%',
    borderRadius: 20,
    paddingHorizontal: 25, // Increased horizontal padding
    paddingVertical: 30,   // Adjusted vertical padding
    overflow: 'hidden',
    borderColor: 'rgba(255, 255, 255, 0.4)', // Slightly more visible border
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginTop: '40%',// Light translucent background
    alignSelf: 'center',
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  img2: {
    width: 180, // Slightly wider for better visibility
    height: 90, // Adjusted height
    alignSelf: 'center',
    marginBottom: 10, // More spacing
    marginTop: -20, // Adjusted to fit within the glass container
  },
  title: {
    fontSize: 26, // Slightly larger for prominence
    fontWeight: '700', // Bolder
    textAlign: 'center',
    color: '#333', // Darker for better contrast on light blur
    marginBottom: '5%', // Increased spacing
    marginTop: '-10%',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)', // More opaque for better text visibility
    borderWidth: 0.3,
    borderColor: '#0387e0',
    padding: 14, // Increased padding
    marginBottom: 15, // Consistent spacing
    borderRadius: 12, // More rounded corners
    color: '#333', // Darker text
    fontSize: 16,
    fontWeight: '500',
  },
  pickerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 0.3,
    borderColor: '#0387e0',
    marginBottom: 15,
    borderRadius: 12, // This must match your input's borderRadius
    overflow: 'hidden', // This is the crucial property that hides the overflowing content
  },

  picker: {
    color: '#333',
    height: 50,
    justifyContent: 'center',
  },
  uploadButton: {
    backgroundColor: '#0077B5', // Original color
    padding: 14, // Consistent padding
    borderRadius: 12, // Consistent rounded corners
    marginTop: 10,
    marginBottom: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  uploadButtonSuccess: {
    backgroundColor: '#28a745', // Green for success
  },
  uploadButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10, // Space between text and icon
  },
  loadingIndicator: {
    paddingVertical: 15,
    marginVertical: 10,
  },
  btn: {
    width: '70%', // Wider button
    alignSelf: 'center', // Center the button
    borderRadius: 12, // Consistent rounded corners
    elevation: 8, // Stronger shadow
    marginTop: 20, // More space above
    marginBottom: 10,
  },
  signupButton: {
    paddingVertical: 14, // Consistent padding
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupButtonText: {
    fontWeight: 'bold',
    color: '#ffffff',
    fontSize: 18,
  },
  logAccount: {
    marginTop: 20, // More space above
    textAlign: 'center',
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
  // Dropdown styles (retained and slightly adjusted for consistency)
  dropdownButton: {
    paddingVertical: 14,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    marginVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Align icon vertically
    borderColor: '#0387e0',
    borderWidth: 0.3,
  },
  dropdownButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // More opaque for dropdown content
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    maxHeight: 180, // Slightly reduced max height
    marginTop: -5, // Close gap with button
    marginBottom: 10,
    elevation: 3, // Add slight shadow
  },
  searchInput: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Slightly transparent background for search
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  scrollView: {
    maxHeight: 120, // Adjusted max height for scrollable options
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: StyleSheet.hairlineWidth, // Fine separator
    borderBottomColor: '#eee',
  },
  dropdownOptionText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '400',
  },
  noResultsText: {
    textAlign: 'center',
    color: '#888',
    padding: 15,
    fontSize: 15,
  },
  scrollIndicator: {
    position: 'absolute',
    bottom: '22%',
    alignSelf: 'center',
    opacity: 1,
  },
  // Removed unused styles like 'scrollContainer', 'img', 'container', 'label', 'loginsub', 'addButton', 'removeButton'.
  // These styles were either redundant, for elements no longer present, or replaced by new styles.
});

export default PlacemenntSignup;
