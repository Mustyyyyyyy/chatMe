import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ChatRoomScreen from "../components/ChatRoomScreen";
import { ThemedText } from "../components/themed-text";
import { ThemedView } from "../components/themed-view";
import { BottomTabInset, Spacing } from "../constants/theme";
import { useAuth, User } from "../context/AuthContext";
import { useTheme } from "../hooks/use-theme";
import api from "../services/api";

export default function ContactsScreen() {
  const { user } = useAuth();
  const theme = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingChat, setCreatingChat] = useState(false);
  const [activeChat, setActiveChat] = useState<{
    chatId: string;
    recipient: User;
  } | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch contacts list from backend
  const fetchContacts = async (query = "") => {
    setLoading(true);
    try {
      const response = await api.get("/user", {
        params: { query },
      });
      setContacts(response.data);
    } catch (err) {
      console.error("Failed to load contacts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchContacts(text);
    }, 500);
  };

  const handleStartChat = async (recipient: User) => {
    setCreatingChat(true);
    try {
      const response = await api.post("/chat", {
        receiverId: recipient.id,
      });
      const chatId = response.data.id;
      setActiveChat({ chatId, recipient });
    } catch (err) {
      console.error("Failed to create/get chat room", err);
      alert("Could not start chat conversation.");
    } finally {
      setCreatingChat(false);
    }
  };

  const renderItem = ({ item }: { item: User }) => {
    return (
      <TouchableOpacity
        style={styles.contactRow}
        onPress={() => handleStartChat(item)}
        disabled={creatingChat}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.avatar} />
        ) : (
          <ThemedView
            type="backgroundSelected"
            style={[styles.avatar, styles.avatarPlaceholder]}
          >
            <ThemedText style={{ fontSize: 20 }}>👤</ThemedText>
          </ThemedView>
        )}

        <View style={styles.contactDetails}>
          <ThemedText type="smallBold" style={styles.contactName}>
            {item.name || item.email}
          </ThemedText>
          {item.username && (
            <ThemedText
              themeColor="textSecondary"
              style={styles.contactUsername}
            >
              @{item.username}
            </ThemedText>
          )}
        </View>

        <ThemedView type="backgroundElement" style={styles.chatBadge}>
          <ThemedText style={styles.chatBadgeText}>Message</ThemedText>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          People
        </ThemedText>
      </ThemedView>

      {/* Search Input */}
      <ThemedView style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}
          placeholder="Search by name, email or username..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </ThemedView>

      {/* Contacts List */}
      <ThemedView style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator
            style={styles.spinner}
            size="large"
            color="#3c87f7"
          />
        ) : contacts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyEmoji}>👥</ThemedText>
            <ThemedText type="smallBold" style={styles.emptyTitle}>
              No users found
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Try searching for a different name, email, or username.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={contacts}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ThemedView>

      {/* Chat Room Modal */}
      {activeChat && (
        <ChatRoomScreen
          chatId={activeChat.chatId}
          recipient={activeChat.recipient}
          visible={!!activeChat}
          onClose={() => setActiveChat(null)}
        />
      )}

      {creatingChat && (
        <View style={styles.overlayLoading}>
          <ActivityIndicator size="large" color="#3c87f7" />
        </View>
      )}
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
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  headerTitle: {
    fontWeight: "bold",
  },
  searchContainer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  listContainer: {
    flex: 1,
  },
  spinner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  contactRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    alignItems: "center",
    gap: Spacing.three,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  contactDetails: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.15)",
    paddingBottom: Spacing.two,
    justifyContent: "center",
  },
  contactName: {
    fontSize: 15,
    marginBottom: 2,
  },
  contactUsername: {
    fontSize: 13,
  },
  chatBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 12,
    alignSelf: "center",
  },
  chatBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#3c87f7",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.five,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.three,
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: Spacing.two,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  overlayLoading: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
});
