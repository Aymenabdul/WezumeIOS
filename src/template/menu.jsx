import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import UserIcon from 'react-native-vector-icons/FontAwesome';
import { useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const MenuComponent = ({
  isVisible,
  onClose,
  menuItems,
  userName,
  jobOption, // <-- 1. Added jobOption prop
  profileImage,
}) => {
  const menuWidth = width * 0.8;
  const slideAnim = useRef(new Animated.Value(menuWidth)).current;
  const route = useRoute();
  const [isMenuRendered, setIsMenuRendered] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setIsMenuRendered(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: menuWidth,
        useNativeDriver: true,
      }).start(() => setIsMenuRendered(false));
    }
  }, [isVisible, slideAnim, menuWidth]);

  const mainMenuItems = menuItems.filter(item => item.label !== 'Logout');
  const logoutItem = menuItems.find(item => item.label === 'Logout');

  if (!isMenuRendered) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, { opacity: slideAnim.interpolate({
            inputRange: [0, menuWidth],
            outputRange: [0.5, 0],
          })}]}
        />
      </TouchableWithoutFeedback>
      <Animated.View
        style={[
          styles.menuContainer,
          { transform: [{ translateX: slideAnim }], width: menuWidth, right: 0 },
        ]}
      >
        <LinearGradient
          colors={['#0093E9', '#80D0C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileSection}
        >
          <View style={styles.profileImageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <UserIcon name="user-circle" size={40} color="#fff" />
            )}
          </View>
          {/* 2. Added a View to group name and jobOption */}
          <View style={styles.userInfo}>
            <Text style={styles.userNameText}>{userName || 'Guest'}</Text>
            {jobOption && <Text style={styles.jobOptionText}>{jobOption}</Text>}
          </View>
        </LinearGradient>

        <FlatList
          data={mainMenuItems}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.menuItem, route.name === item.routeName && styles.activeMenuItem]}
              onPress={() => {
                item.onPress();
                onClose();
              }}
            >
              {item.icon && React.cloneElement(item.icon, { 
                color: route.name === item.routeName ? '#007BFF' : '#4F4F4F' 
              })}
              <Text style={[styles.menuText, route.name === item.routeName && styles.activeMenuText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.menuContent}
        />
        
        {logoutItem && (
          <View style={styles.logoutSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                logoutItem.onPress();
                onClose();
              }}
            >
              {logoutItem.icon}
              <Text style={styles.menuText}>{logoutItem.label}</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  menuContainer: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'absolute',
  },
  profileSection: {
    paddingVertical: 20,
    paddingTop: 70,
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
    
  },
  // --- MODIFIED: Added shadow for elevation ---
  profileImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    // Elevation for Android
    elevation: 10,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    marginLeft: 15,
  },
  // --- MODIFIED: Added text shadow for elevation ---
  userNameText: {
    fontSize: 32, // Adjusted from 32 for better fit
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  // --- MODIFIED: Added text shadow for elevation ---
  jobOptionText: {
    fontSize: 18, // Adjusted from 18
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600', // Adjusted from 800
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  menuContent: {
    padding: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
  },
  activeMenuText: {
    color: '#007BFF',
    fontWeight: 'bold',
  },
  menuText: {
    fontSize: 18,
    color: '#4F4F4F',
    marginLeft: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 65,
  },
  logoutSection: {
    marginTop: 'auto',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9e9e9',
    paddingBottom: 40,
  },
});

export default MenuComponent;