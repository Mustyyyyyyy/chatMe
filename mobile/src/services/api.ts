import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const APP_URL = 'https://chat-ebon-nine-76.vercel.app';

export const getBackendUrl = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }

    return APP_URL;
  }

  return APP_URL;
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
