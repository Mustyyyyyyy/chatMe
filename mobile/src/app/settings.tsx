import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  SafeAreaView,
  Switch,
  Platform,
  Alert,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { Spacing, BottomTabInset } from '../constants/theme';
import { useTheme } from '../hooks/use-theme';
import api, { getAuthToken } from '../services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateProfile, logout } = useAuth();
  const theme = useTheme();

  // Profile states
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [imageUrl, setImageUrl] = useState(user?.image || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // App preference states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const [lastSeenEnabled, setLastSeenEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
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

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setError('Display name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateProfile(
        name.trim(),
        username.trim() ? username.trim().toLowerCase() : '',
        imageUrl || null
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile. Username might be taken.');
    } finally {
      setSaving(false);
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Settings
        </ThemedText>
      </ThemedView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Section */}
        <ThemedView type="backgroundElement" style={styles.sectionCard}>
          <ThemedText type="smallBold" style={styles.sectionLabel}>
            Profile details
          </ThemedText>
          
          <View style={styles.avatarSection}>
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
          </View>

          {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
          {success && <ThemedText style={styles.successText}>Profile saved successfully!</ThemedText>}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Display Name</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
                placeholder="Display Name"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setError(null);
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Username</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.background,
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
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Email (Read-Only)</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.textSecondary,
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                    opacity: 0.6,
                  },
                ]}
                value={user?.email}
                editable={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#3c87f7' }]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.saveButtonText}>Save Details</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </ThemedView>

        {/* Preferences Section */}
        <ThemedView type="backgroundElement" style={styles.sectionCard}>
          <ThemedText type="smallBold" style={styles.sectionLabel}>
            Chat Preferences
          </ThemedText>

          <View style={styles.settingsRow}>
            <View style={styles.rowLabelContainer}>
              <ThemedText style={styles.rowTitle}>Notifications</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.rowSubtitle}>
                Get push notifications for new messages
              </ThemedText>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ true: '#3c87f7' }}
            />
          </View>

          <View style={styles.settingsRow}>
            <View style={styles.rowLabelContainer}>
              <ThemedText style={styles.rowTitle}>Sounds</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.rowSubtitle}>
                Play system sounds when sending/receiving
              </ThemedText>
            </View>
            <Switch
              value={soundsEnabled}
              onValueChange={setSoundsEnabled}
              trackColor={{ true: '#3c87f7' }}
            />
          </View>

          <View style={styles.settingsRow}>
            <View style={styles.rowLabelContainer}>
              <ThemedText style={styles.rowTitle}>Read Receipts</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.rowSubtitle}>
                Allow others to see when you've read messages
              </ThemedText>
            </View>
            <Switch
              value={readReceiptsEnabled}
              onValueChange={setReadReceiptsEnabled}
              trackColor={{ true: '#3c87f7' }}
            />
          </View>

          <View style={styles.settingsRow}>
            <View style={styles.rowLabelContainer}>
              <ThemedText style={styles.rowTitle}>Last Seen Visibility</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.rowSubtitle}>
                Allow others to see your online status
              </ThemedText>
            </View>
            <Switch
              value={lastSeenEnabled}
              onValueChange={setLastSeenEnabled}
              trackColor={{ true: '#3c87f7' }}
            />
          </View>
        </ThemedView>

        {/* Support Options */}
        <ThemedView type="backgroundElement" style={styles.sectionCard}>
          <ThemedText type="smallBold" style={styles.sectionLabel}>
            Support & Privacy
          </ThemedText>

          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/support')}>
            <ThemedText style={styles.actionRowText}>Help & Send Feedback</ThemedText>
            <ThemedText themeColor="textSecondary">❓</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/privacy')}>
            <ThemedText style={styles.actionRowText}>Privacy Policy</ThemedText>
            <ThemedText themeColor="textSecondary">🔒</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  sectionCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: 'relative',
    marginBottom: Spacing.two,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarEditText: {
    fontSize: 13,
  },
  changePhotoText: {
    fontSize: 14,
  },
  form: {
    gap: Spacing.three,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  saveButton: {
    height: 44,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  rowLabelContainer: {
    flex: 1,
    paddingRight: Spacing.four,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  actionRowText: {
    fontSize: 15,
  },
  logoutButton: {
    height: 48,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginTop: Spacing.two,
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
  },
  successText: {
    color: '#10b981',
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
});
