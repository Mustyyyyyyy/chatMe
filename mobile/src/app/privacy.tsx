import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { Spacing } from '../constants/theme';
import { useTheme } from '../hooks/use-theme';

export default function PrivacyScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}> 
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Back</ThemedText>
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.title}>
            Privacy Policy
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.backgroundSelected }]}> 
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Privacy Policy
          </ThemedText>

          <ThemedText style={styles.paragraph}>
            ChatMe is committed to protecting your privacy. We collect only the data necessary to operate the service, including your email, profile data, chat messages, sessions, and support feedback.
          </ThemedText>

          <ThemedText type="smallBold" style={styles.subTitle}>
            Information We Collect
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            We store your account email, optional username, name, image, chat messages, and session information. If you submit feedback, we store the message content and any email address you provide.
          </ThemedText>

          <ThemedText type="smallBold" style={styles.subTitle}>
            How We Use Your Data
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            Data is used to authenticate you, provide chat functionality, and respond to support requests. We do not sell your data.
          </ThemedText>

          <ThemedText type="smallBold" style={styles.subTitle}>
            Support & Data Removal
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            If you need support or want your data removed, contact us at support@chatme.example.com.
          </ThemedText>

          <ThemedText type="smallBold" style={styles.subTitle}>
            Cookies and Cache
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            ChatMe may use session storage and local cache in the client. You can reset your active server session using the support page's Clear Storage Cache button.
          </ThemedText>

          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/support')}>
            <ThemedText style={styles.linkText}>Return to Help & Support</ThemedText>
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
  subTitle: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  paragraph: {
    lineHeight: 22,
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
