import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const getBackendUrl = () => {
  if (Platform.OS === 'web') {
    // If running in browser and backend is on local port
    return 'http://localhost:5000';
  }

  // Extract host IP from Expo's debugger address to connect from physical devices/emulators
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.developer?.tool;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000`;
  }

  // Fallbacks
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
};

export const BACKEND_URL = getBackendUrl();
export const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getAuthToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem('token');
    }
    return await SecureStore.getItemAsync('token');
  } catch (e) {
    console.warn('Error reading auth token', e);
    return null;
  }
};

// Attach Authorization header if token exists in SecureStore
api.interceptors.request.use(
  async (config) => {
    try {
      config.headers = config.headers || {};
      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Error reading auth token', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
