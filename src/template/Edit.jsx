import React, {useState, useEffect} from 'react';
import {
  Image,
  TextInput,
  StyleSheet,
  Text,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
  Platform,
  Dimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';
import {launchImageLibrary} from 'react-native-image-picker';
import FastImage from 'react-native-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './api';

const {height: windowHeight} = Dimensions.get('window');

const Edit = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [jobOption, setJobOption] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [currentRole, setCurrentRole] = useState('');
  const [keySkills, setKeySkills] = useState('');
  const [experience, setExperience] = useState('');
  const [industry, setIndustry] = useState('');
  const [currentEmployer, setCurrentEmployer] = useState('');
  const [city, setCity] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [originalContactInfo, setOriginalContactInfo] = useState({ email: '', phoneNumber: '' });
  
  const experienceOptions = [
    {label: '0-1 years', value: '0-1'}, {label: '1-3 years', value: '1-3'},
    {label: '3-5 years', value: '3-5'}, {label: '5-10 years', value: '5-10'},
    {label: '10-15 years', value: '10-15'}, {label: '15+ years', value: '10+'},
  ];

  useEffect(() => {
    const loadDataFromStorage = async () => {
      try {
        const apiUserId = await AsyncStorage.getItem('userId');
        const parsedUserId = apiUserId ? parseInt(apiUserId, 10) : null;
        if (parsedUserId) {
          setUserId(parsedUserId);
          await getUserDetails(parsedUserId);
        } else {
          setLoading(false);
          Alert.alert('Error', 'User not found. Please log in again.');
          navigation.navigate('LoginScreen');
        }
      } catch (error) {
        setLoading(false);
        console.error('Error loading user data from AsyncStorage', error);
      }
    };
    loadDataFromStorage();
  }, [navigation]);

  const getUserDetails = async (id) => {
    try {
      const response = await apiClient.get(`/api/users/get/${id}`);
      const userData = response.data;
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      setEmail(userData.email || '');
      setPhoneNumber(userData.phoneNumber || '');
      setJobOption(userData.jobOption || '');
      setProfilePicUrl(userData.profilePic || null);
      setCurrentRole(userData.currentRole || '');
      setKeySkills(userData.keySkills || '');
      setExperience(userData.experience || '');
      setCity(userData.city || '');
      setIndustry(userData.industry || '');
      setCurrentEmployer(userData.currentEmployer || '');
      setOriginalContactInfo({ email: userData.email, phoneNumber: userData.phoneNumber });
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert('Error', 'Could not load your profile data.');
    } finally {
      setLoading(false);
    }
  };
  
  const checkIfEmailExists = async (newEmail) => { /* Your logic here */ };
  const checkIfPhoneExists = async (newPhone) => { /* Your logic here */ };

  const handleProfilePic = () => {
    launchImageLibrary({mediaType: 'photo'}, (response) => {
      if (response.didCancel || response.errorMessage) {
        console.error('ImagePicker error:', response.errorMessage);
        return;
      }
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        setSelectedImage({
          uri: asset.uri,
          type: asset.type,
          name: asset.fileName || `profile_pic_${userId}.jpg`,
        });
        setProfilePicUrl(asset.uri);
      }
    });
  };

  const handleUpdateProfile = async () => {
    if (password && password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match!');
      return;
    }
    if (phoneNumber && phoneNumber.length !== 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number!');
      return;
    }
    setLoading(true);
    try {
      if (email && email !== originalContactInfo.email) {
        const emailExists = await checkIfEmailExists(email);
        if (emailExists) {
          Alert.alert('Validation Error', 'This email is already registered to another account!');
          setLoading(false);
          return;
        }
      }
      if (phoneNumber && phoneNumber !== originalContactInfo.phoneNumber) {
        const phoneExists = await checkIfPhoneExists(phoneNumber);
        if (phoneExists) {
          Alert.alert('Validation Error', 'This phone number is already registered to another account!');
          setLoading(false);
          return;
        }
      }
      const formData = new FormData();
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('email', email);
      formData.append('phoneNumber', phoneNumber);
      formData.append('jobOption', jobOption);
      if (password) {
        formData.append('password', password);
      }
      formData.append('currentEmployer', currentEmployer);
      formData.append('currentRole', currentRole);
      formData.append('keySkills', keySkills);
      formData.append('experience', experience);
      formData.append('industry', industry);
      formData.append('city', city);
      if (selectedImage) {
        formData.append('profilePic', selectedImage);
      }
      await apiClient.put(
        `/api/users/update/${userId}`,
        formData,
        { headers: {'Content-Type': 'multipart/form-data'} }
      );
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Account') },
      ]);
    } catch (error) {
      console.error('Profile update failed:', error.response ? error.response.data : error.message);
      Alert.alert('Error', 'Failed to update profile. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FastImage
      style={styles.backgroundImage}
      source={require('./assets/Background-01.jpg')}
      resizeMode={FastImage.resizeMode.cover}>
      <LinearGradient colors={['#d3e4f6', '#a1d1ff']} style={styles.container}>
        {/* <Image style={styles.img2} source={require('./assets/logopng.png')} /> */}
        <Text style={styles.title}>Update Profile</Text>
        <ScrollView style={styles.formArea} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={handleProfilePic} style={styles.uploadButton}>
            <Image source={profilePicUrl ? {uri: profilePicUrl} : require('./assets/headlogo.png')} style={styles.profilePicPreview} />
            <Text style={styles.uploadButtonText}>
              {selectedImage ? 'Image Selected' : 'Change Profile Picture'}
            </Text>
          </TouchableOpacity>

          <TextInput style={styles.input} placeholder="Display Name" value={firstName} onChangeText={setFirstName} />
          <TextInput style={styles.input} placeholder="Last Name" value={lastName} onChangeText={setLastName} />
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Phone Number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
          
          {/* ✅ FIX: Removed the wrapping View from the Picker
          <Picker selectedValue={jobOption} style={styles.picker} enabled={false}>
              <Picker.Item label={jobOption || "Your Role"} value={jobOption} />
          </Picker> */}
          
          {(jobOption === 'Employee' || jobOption === 'Entrepreneur' || jobOption === 'Freelancer') && (
            <>
              <TextInput style={styles.input} placeholder="New Password (optional)" value={password} onChangeText={setPassword} secureTextEntry />
              <TextInput style={styles.input} placeholder="Confirm New Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
              <TextInput style={styles.input} placeholder="Organization Name" value={currentEmployer} onChangeText={setCurrentEmployer} />
              <TextInput style={styles.input} placeholder="Current Role" value={currentRole} onChangeText={setCurrentRole} />
              <TextInput style={styles.input} placeholder="Key Skills" value={keySkills} onChangeText={setKeySkills} />
            </>
          )}

          {/* {jobOption === 'Employee' && (
             // ✅ FIX: Removed the wrapping View from the Picker
             <Picker selectedValue={experience} onValueChange={setExperience} style={styles.picker}>
                <Picker.Item label="Select Experience" value="" />
                {experienceOptions.map(option => (<Picker.Item label={option.label.trim()} value={option.value} key={option.value} />))}
             </Picker>
          )} */}
          
          {(jobOption === 'Employee' || jobOption === 'Employer' || jobOption === 'Entrepreneur') && (
            <TextInput style={styles.input} placeholder="Industry" value={industry} onChangeText={setIndustry} />
          )}

          <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
        </ScrollView>
        <View style={styles.footer}>
            <LinearGradient colors={['#70bdff', '#2e80d8']} style={styles.btn}>
              <TouchableOpacity style={styles.signupButton} onPress={handleUpdateProfile}>
                <Text style={styles.signupButtonText}>Update</Text>
              </TouchableOpacity>
            </LinearGradient>
            <TouchableOpacity onPress={() => navigation.navigate('Account')}>
              <Text style={styles.logAccount}>Back to Profile</Text>
            </TouchableOpacity>
        </View>
      </LinearGradient>
    </FastImage>
  );
};

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { width: '95%', height: '50%', borderColor: '#fff', borderWidth: 1, borderRadius: 10, elevation: 5, paddingHorizontal: 15, paddingTop: 60, paddingBottom: 20, display: 'flex', flexDirection: 'column' },
  img2: { width: '100%', height: 100, position: 'absolute', top: -50, alignSelf: 'center', resizeMode: 'contain' },
  title: { fontSize: 20, marginBottom: 15, textAlign: 'center', color: '#4e4b51', fontWeight: '600' },
  formArea: { flex: 1, width: '100%' },
  input: { borderWidth: 1, borderColor: '#ffffff', padding: 10, marginBottom: 10, borderRadius: 5, paddingLeft: 15, color: 'black', backgroundColor: '#ffffff', fontSize: 16, fontWeight: '500' },
  // ✅ FIX: Merged pickerWrapper styles into picker and removed pickerWrapper
  picker: {
    width: '100%',
    height: 50,
    color: 'black',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 5,
    marginBottom: 10,
  },
  footer: { paddingTop: 10 },
  btn: { borderRadius: 10, elevation: 5 },
  signupButton: { height: 45, justifyContent: 'center', alignItems: 'center' },
  signupButtonText: { fontWeight: 'bold', color: '#ffffff', fontSize: 18 },
  logAccount: { marginTop: 15, textAlign: 'center', color: '#000', fontWeight: '700', fontSize: 16 },
  uploadButton: { backgroundColor: 'rgba(255,255,255,0.8)', padding: 10, borderRadius: 5, marginBottom: 15, alignItems: 'center', flexDirection: 'row', borderWidth: 1, borderColor: '#fff' },
  uploadButtonText: { color: '#000', fontWeight: '600', fontSize: 16, flex: 1, textAlign: 'center' },
  profilePicPreview: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#e0e0e0' }
});

export default Edit;