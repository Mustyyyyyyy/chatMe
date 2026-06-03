import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { Spacing } from '../constants/theme';
import { useTheme } from '../hooks/use-theme';
import api from '../services/api';

export default function SupportScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();

  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('General');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const response = await api.post('/support/feedback', {
        email: email.trim() || undefined,
        subject: subject.trim(),
        category,
        message: message.trim(),
      });
      setStatus(response.data?.message || 'Feedback sent successfully.');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to send feedback.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const response = await api.post('/support/clear-cache');
      setStatus(response.data?.message || 'Storage cache cleared.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to clear cache.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/settings');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}> 
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ThemedText style={styles.backText}>← Back</ThemedText>
            </TouchableOpacity>
            <ThemedText type="subtitle" style={styles.title}>
              Help & Support
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.backgroundSelected }]}> 
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Contact Support
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.sectionText}>
              Use this form to send feedback or report an issue. You can also clear your storage cache for the current signed-in session.
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Email (optional)</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Subject</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                value={subject}
                onChangeText={setSubject}
                placeholder="What is your question?"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Category</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                value={category}
                onChangeText={setCategory}
                placeholder="General"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Message</ThemedText>
              <TextInput
                style={[styles.textArea, { color: theme.text, backgroundColor: theme.background }]}
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your issue or question"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={6}
              />
            </View>

            {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
            {status ? <ThemedText style={styles.statusText}>{status}</ThemedText> : null}

            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#3c87f7' }]} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Send Feedback</ThemedText>}
              </TouchableOpacity>
              <View style={styles.buttonSpacer} />
              <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleClearCache} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Clear Cache</ThemedText>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/privacy')}>
              <ThemedText style={styles.linkText}>View Privacy Policy</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  backButton: {
    marginRight: Spacing.two,
  },
  backText: {
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: Spacing.four,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
  },
  sectionText: {
    marginBottom: Spacing.four,
  },
  inputGroup: {
    marginBottom: Spacing.four,
  },
  inputLabel: {
    marginBottom: Spacing.two,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.three,
    minHeight: 48,
  },
  textArea: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.three,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  picker: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.three,
  },
  pickerText: {
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonSpacer: {
    width: Spacing.three,
  },
  secondaryButton: {
    backgroundColor: '#5A6A8A',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: Spacing.three,
  },
  statusText: {
    color: '#157b43',
    marginBottom: Spacing.three,
  },
  linkRow: {
    marginTop: Spacing.four,
  },
  linkText: {
    color: '#3c87f7',
    fontWeight: '700',
  },
});
