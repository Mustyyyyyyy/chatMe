import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '../constants/theme';
import { useTheme } from '../hooks/use-theme';
import api, { getAuthToken } from '../services/api';

interface ProfileScreenProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileScreen({ visible, onClose }: ProfileScreenProps) {
  const { user, updateProfile, logout } = useAuth();
  const theme = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [imageUrl, setImageUrl] = useState(user?.image || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePickImage = async () => {
    // Request permission first
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      if (Platform.OS === 'web') {
        alert('Permission to access camera roll is required!');
      } else {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const selectedUri = result.assets[0].uri;
      await handleUploadImage(selectedUri);
    }
  };

  const handleUploadImage = async (uri: string) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        formData.append('file', file);
      } else {
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('file', {
          uri,
          name: `avatar.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }

      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await api.post('/media/upload', formData, {
        headers,
      });

      setImageUrl(response.data.url);
    } catch (err: any) {
      console.error('Image upload failed', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Display name is required.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await updateProfile(
        name.trim(),
        username.trim() ? username.trim().toLowerCase() : '',
        imageUrl || null
      );
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile. Username might be taken.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to log out?')) {
        logout();
      }
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <ThemedText style={{ color: '#3c87f7' }}>Cancel</ThemedText>
          </TouchableOpacity>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            Edit Profile
          </ThemedText>
          <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.headerButton}>
            {loading ? (
              <ActivityIndicator size="small" color="#3c87f7" />
            ) : (
              <ThemedText style={{ color: '#3c87f7', fontWeight: 'bold' }}>Save</ThemedText>
            )}
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.body}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickImage}
            disabled={uploading}
          >
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatar} />
            ) : (
              <ThemedView type="backgroundSelected" style={[styles.avatar, styles.avatarPlaceholder]}>
                <ThemedText style={{ fontSize: 32 }}>👤</ThemedText>
              </ThemedView>
            )}
            <ThemedView style={styles.avatarEditBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.avatarEditText}>📷</ThemedText>
              )}
            </ThemedView>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickImage} disabled={uploading}>
            <ThemedText type="link" style={styles.changePhotoText}>
              Change Profile Photo
            </ThemedText>
          </TouchableOpacity>

          {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
          {success && <ThemedText style={styles.successText}>Profile updated successfully!</ThemedText>}

          <ThemedView style={styles.form}>
            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>Display Name</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
                placeholder="Your Display Name"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setError(null);
                }}
              />
            </ThemedView>

            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>Username</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
                placeholder="username"
                placeholderTextColor={theme.textSecondary}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </ThemedView>

            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email (Read-Only)</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.textSecondary,
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                    opacity: 0.6,
                  },
                ]}
                value={user?.email}
                editable={false}
              />
            </ThemedView>
          </ThemedView>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <ThemedText style={styles.logoutText}>Log Out</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    height: Platform.OS === 'ios' ? 94 : 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  headerButton: {
    padding: Spacing.two,
  },
  headerTitle: {
    fontSize: 16,
  },
  body: {
    flex: 1,
    padding: Spacing.four,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.two,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3c87f7',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarEditText: {
    fontSize: 16,
  },
  changePhotoText: {
    color: '#3c87f7',
    marginBottom: Spacing.four,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    gap: Spacing.three,
  },
  inputGroup: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  logoutButton: {
    marginTop: Spacing.five,
    height: 48,
    width: '100%',
    maxWidth: 400,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginBottom: Spacing.three,
    width: '100%',
    maxWidth: 400,
  },
  successText: {
    color: '#10b981',
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginBottom: Spacing.three,
    width: '100%',
    maxWidth: 400,
  },
});
