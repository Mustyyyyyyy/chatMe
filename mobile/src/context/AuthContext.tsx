import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

export interface User {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  image: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  activeChatId: string | null;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string, username: string, image: string | null) => Promise<void>;
  setActiveChatId: (chatId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'token';
const USER_KEY = 'user_data';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Load token and user data on start
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        let storedToken = null;
        let storedUserStr = null;

        if (Platform.OS === 'web') {
          storedToken = localStorage.getItem(TOKEN_KEY);
          storedUserStr = localStorage.getItem(USER_KEY);
        } else {
          storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
          storedUserStr = await SecureStore.getItemAsync(USER_KEY);
        }

        if (storedToken && storedUserStr) {
          try {
            const response = await api.get('/user/me');
            const validatedUser = response.data;

            setToken(storedToken);
            setUser(validatedUser);

            if (Platform.OS === 'web') {
              localStorage.setItem(USER_KEY, JSON.stringify(validatedUser));
            } else {
              await SecureStore.setItemAsync(USER_KEY, JSON.stringify(validatedUser));
            }

            connectSocket(validatedUser.id);
          } catch (err) {
            console.warn('Stored session invalid; clearing local auth state', err);
            if (Platform.OS === 'web') {
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
            } else {
              await SecureStore.deleteItemAsync(TOKEN_KEY);
              await SecureStore.deleteItemAsync(USER_KEY);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to restore session', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);


  const requestOtp = async (email: string) => {
    await api.post('/auth/request-otp', { email });
  };

  const verifyOtp = async (email: string, otp: string) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    const { user: loggedInUser, accessToken } = response.data;

    setUser(loggedInUser);
    setToken(accessToken);

    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(loggedInUser));
    }

    // Connect socket
    connectSocket(loggedInUser.id);
  };

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    setActiveChatId(null);
    
    // Disconnect socket
    disconnectSocket();

    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  }, []);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error?.response?.status === 401) {
          await logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  const updateProfile = async (name: string, username: string, image: string | null) => {
    const response = await api.put('/user/me', { name, username, image });
    const updatedUser = response.data;

    setUser(updatedUser);

    if (Platform.OS === 'web') {
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    } else {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        activeChatId,
        requestOtp,
        verifyOtp,
        logout,
        updateProfile,
        setActiveChatId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
