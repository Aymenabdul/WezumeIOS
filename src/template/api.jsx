import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import env from './env'; // Your environment file with the baseURL
import { useNavigation } from '@react-navigation/native';

// Create a new Axios instance with a base URL
const apiClient = axios.create({
  baseURL: env.baseURL,
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log('Request Headers:', config.headers); // Add this line
    console.log('Request URL:', config.url); 
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


apiClient.interceptors.response.use(
  (response) => {
    // If the request was successful, just return the response
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check if the error is a 401 Unauthorized and we haven't already retried
    if (error.response.status === 401 && !originalRequest._retry) {
      console.log('Token expired or invalid. Logging out.');
      
      // Mark that we've retried this request
      originalRequest._retry = true; 
      
      // Clear all user data from storage
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userId');
      // Add any other keys you want to clear
      
      // This is a simplified navigation. In a real app, you'd use a more robust
      // navigation service that doesn't rely on hooks directly in the interceptor.
      // For now, this alerts the user. A better solution would be to navigate to Login.
      alert('Your session has expired. Please log in again.');

      // You might want to navigate the user to the login screen.
      // The implementation depends on your navigation setup.
      // For example: RootNavigation.navigate('LoginScreen');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
