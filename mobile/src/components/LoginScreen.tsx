import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '../constants/theme';
import { useTheme } from '../hooks/use-theme';

export default function LoginScreen() {
  const { requestOtp, verifyOtp } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSendOTP = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await requestOtp(email.trim().toLowerCase());
      setSuccessMsg('OTP code sent successfully!');
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(email.trim().toLowerCase(), otp);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.card}>
          <ThemedView style={styles.header}>
            <ThemedView style={styles.logoCircle}>
              <ThemedText style={styles.logoText}>💬</ThemedText>
            </ThemedView>
            <ThemedText type="subtitle" style={styles.title}>
              ChatMe
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {step === 'email'
                ? 'Enter your email to receive a one-time verification code'
                : `Enter the verification code sent to ${email}`}
            </ThemedText>
          </ThemedView>

          {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
          {successMsg && !error && <ThemedText style={styles.successText}>{successMsg}</ThemedText>}

          {step === 'email' ? (
            <ThemedView style={styles.formGroup}>
              <ThemedText style={styles.label}>Email Address</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
                placeholder="you@example.com"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#3c87f7' }]}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.buttonText}>Send Code</ThemedText>
                )}
              </TouchableOpacity>
            </ThemedView>
          ) : (
            <ThemedView style={styles.formGroup}>
              <ThemedText style={styles.label}>Verification Code</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                    textAlign: 'center',
                    letterSpacing: 8,
                    fontSize: 20,
                    fontWeight: 'bold',
                  },
                ]}
                placeholder="123456"
                placeholderTextColor={theme.textSecondary}
                value={otp}
                onChangeText={(text) => {
                  setOtp(text.replace(/[^0-9]/g, ''));
                  setError(null);
                }}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#10b981' }]}
                onPress={handleVerifyOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.buttonText}>Verify & Sign In</ThemedText>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setStep('email');
                  setOtp('');
                  setError(null);
                  setSuccessMsg(null);
                }}
                disabled={loading}
              >
                <ThemedText type="link" style={styles.backButtonText}>
                  Change email address
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3c87f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  logoText: {
    fontSize: 32,
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: Spacing.three,
  },
  formGroup: {
    gap: Spacing.three,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  button: {
    height: 48,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  backButtonText: {
    color: '#3c87f7',
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginBottom: Spacing.three,
  },
  successText: {
    color: '#10b981',
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginBottom: Spacing.three,
  },
});
