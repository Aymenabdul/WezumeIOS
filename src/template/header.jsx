import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Text,
  ImageBackground,
  Modal,
  FlatList,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MenuIcon from 'react-native-vector-icons/AntDesign';
import NotiIcon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MenuComponent from './menu'; // Import the new MenuComponent
import UserIcon from 'react-native-vector-icons/FontAwesome';
import SearchIcon from 'react-native-vector-icons/Ionicons';
import VideoIcon from 'react-native-vector-icons/Foundation';
import FaqIcon from 'react-native-vector-icons/AntDesign';
import LogoutIcon from 'react-native-vector-icons/AntDesign';
import PrivacyIcon from 'react-native-vector-icons/MaterialIcons';
import AnalyticsIcon from 'react-native-vector-icons/MaterialIcons'; // --- ADDED: Icon for Analytics

const Header = ({ profile, userName }) => {
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotiModalVisible, setIsNotiModalVisible] = useState(false);
  const [userData, setUserData] = useState({ jobOption: null, roleCode: null, email: null });

  // --- Data Loading ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const jobOption = await AsyncStorage.getItem('jobOption');
        const email = await AsyncStorage.getItem('email');
        const roleCode = await AsyncStorage.getItem('roleCode');
        setUserData({ jobOption, email, roleCode });
      } catch (error) {
        console.error('Error loading user data from AsyncStorage', error);
      }
    };
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchNotifications = async () => {
        try {
          const storedNotifications = await AsyncStorage.getItem('likeNotifications');
          setNotifications(storedNotifications ? JSON.parse(storedNotifications) : []);
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      };
      fetchNotifications();
    }, [])
  );

  // --- MODIFIED: Logout function now clears all AsyncStorage data ---
  const handleLogout = async () => {
    try {
      // This will remove all data stored by your app.
      await AsyncStorage.clear();
      console.log('AsyncStorage cleared successfully.');
      // Navigate to the login screen, resetting the navigation stack.
      navigation.reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      });
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert("Logout Failed", "An error occurred while logging out.");
    }
  };

  const clearNotifications = async () => {
    try {
      await AsyncStorage.removeItem('likeNotifications');
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const openLink = (url) => Linking.openURL(url).catch(err => console.error("Couldn't load page", err));

  // --- MODIFIED: Menu items are now generated dynamically ---
  const getMenuItems = () => {
    // Ensure userData and jobOption exist before proceeding
    if (!userData || !userData.jobOption) {
      return []; // Return an empty array or just the logout button
    }

    // Convert the role to lowercase for case-insensitive comparison
    const userRole = userData.jobOption.toLowerCase();

    // Start with items visible to everyone
    let items = [
      { label: 'Tutorial', routeName: 'Tutorial', icon: <VideoIcon name="comment-video" size={22} />, onPress: () => openLink('https://wezume.com/wezume-demo-video.mp4') },
      { label: 'FAQ', routeName: 'FAQ', icon: <FaqIcon name="questioncircleo" size={20} />, onPress: () => openLink('https://wezume.com/faq/') },
      { label: 'Privacy Policy', routeName: 'Privacy', icon: <PrivacyIcon name="privacy-tip" size={22} />, onPress: () => openLink('https://wezume.com/privacy-policy/') },
    ];

    // --- Role-Based Logic ---

    // 1. Add 'Videos' only for specific roles
    const videoRoles = ['employee', 'entrepreneur', 'ereelancer'];
    if (videoRoles.includes(userRole)) {
      // Insert 'Videos' at a specific position (e.g., after Search)
      // We'll add it later to maintain order
    }

    // 2. Add 'Profile' and 'Search' for everyone EXCEPT placement roles
    const placementRoles = ['placementdrive', 'academy'];
    if (!placementRoles.includes(userRole)) {
      // Use unshift to add items to the beginning of the array
      items.unshift(
        { label: 'Search', routeName: 'profile', icon: <SearchIcon name="search" size={22} />, onPress: () => navigation.navigate('profile') },
        { label: 'Profile', routeName: 'Account', icon: <UserIcon name="user-o" size={20} />, onPress: () => navigation.navigate('Account') }
      );

      // Now, add the 'Videos' item if the role is correct
      if (videoRoles.includes(userRole)) {
        items.splice(2, 0, { label: 'Videos', routeName: 'Myvideos', icon: <VideoIcon name="video" size={22} />, onPress: () => navigation.navigate('Myvideos') });
      }
    }

    // --- Special Case Logic ---

    // Conditionally add the 'Analytics' item for the specific admin email
    if (userData.email === 'pitch@wezume.com') {
      items.push({
        label: 'Analytics',
        routeName: 'Analytics',
        icon: <AnalyticsIcon name="analytics" size={22} />,
        onPress: () => navigation.navigate('AnalyticScreen')
      });
    }

    // Add 'Logout' at the very end
    items.push({ label: 'Logout', icon: <LogoutIcon name="logout" size={20} />, onPress: handleLogout });

    return items;
  };

  return (
    <>
      <ImageBackground
        source={require('./assets/login.jpg')}
        style={styles.headerContainer}
      >
        <View style={styles.headerContent}>
          <Image source={require('./assets/headlogo.png')} style={styles.logo} />

          <View style={styles.rightControls}>
            {(userData.jobOption === 'Employee' || userData.jobOption === 'Entrepreneur' || userData.jobOption === 'Freelancer') && (
              <TouchableOpacity onPress={() => setIsNotiModalVisible(true)} style={styles.controlButton}>
                <NotiIcon name={'bell-o'} size={22} color={'#fff'} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.controlButton}>
              <MenuIcon name="menufold" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      <MenuComponent
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        menuItems={getMenuItems()} // Call the function to get the correct menu items
        userName={userName}
        jobOption={userData.jobOption}
        profileImage={profile}
      />

      <Modal visible={isNotiModalVisible} animationType="slide" onRequestClose={() => setIsNotiModalVisible(false)}>
        <View style={styles.notiModalContainer}>
          <Text style={styles.notiTitle}>Notifications</Text>
          <FlatList
            data={notifications}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.notiItem}>
                <Text style={styles.notiText}>{item.firstName} ❤️ liked your video.</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.notiEmptyText}>No new notifications</Text>}
          />
          <View style={styles.notiFooter}>
            <TouchableOpacity style={[styles.notiButton, { backgroundColor: '#e74c3c' }]} onPress={clearNotifications}>
              <Text style={styles.notiButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.notiButton, { backgroundColor: '#3498db' }]} onPress={() => setIsNotiModalVisible(false)}>
              <Text style={styles.notiButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  logo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  rightControls: {
    flexDirection: 'row',
  },
  controlButton: {
    padding: 8,
    marginLeft: 10,
  },
  notiModalContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  notiTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  notiItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  notiText: {
    fontSize: 16,
  },
  notiEmptyText: {
    textAlign: 'center',
    color: 'grey',
    marginTop: 50,
  },
  notiFooter: {
    marginTop: 'auto',
  },
  notiButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  notiButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Header;