import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Platform,
  View,
} from 'react-native';
import { useAuth, User } from '../context/AuthContext';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { Spacing, BottomTabInset } from '../constants/theme';
import { useTheme } from '../hooks/use-theme';
import api from '../services/api';
import ChatRoomScreen from '../components/ChatRoomScreen';
import ProfileScreen from '../components/ProfileScreen';
import { getSocket } from '../services/socket';

interface ChatUserRelation {
  id: string;
  userId: string;
  chatId: string;
  user: User;
}

interface LastMessage {
  id: string;
  content: string | null;
  mediaUrl: string | null;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  userId: string;
}

interface Chat {
  id: string;
  createdAt: string;
  users: ChatUserRelation[];
  messages: LastMessage[];
}

export default function ChatListScreen() {
  const { user } = useAuth();
  const theme = useTheme();

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileVisible, setProfileVisible] = useState(false);
  const [activeChat, setActiveChat] = useState<{ chatId: string; recipient: User } | null>(null);

  // Fetch active chats from server
  const fetchChats = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/chat');
      setChats(response.data);
    } catch (err) {
      console.error('Failed to load chats', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();

    const socket = getSocket();
    if (socket) {
      // Listen for new messages to dynamically update the last message in chat list
      socket.on('receive_message', () => {
        // Simple reload of chats list
        fetchChats(false);
      });

      socket.on('message_status_update', () => {
        fetchChats(false);
      });
    }

    return () => {
      if (socket) {
        socket.off('receive_message');
        socket.off('message_status_update');
      }
    };
  }, []);

  const getRecipient = (chat: Chat): User | null => {
    if (!user) return null;
    const relation = chat.users.find((u) => u.userId !== user.id);
    return relation ? relation.user : null;
  };

  const handleOpenChat = (chatId: string, recipient: User) => {
    setActiveChat({ chatId, recipient });
  };

  const formatLastMessageTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    
    // Check if same day
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderStatus = (status?: 'sent' | 'delivered' | 'read') => {
    if (status === 'read') {
      return <ThemedText style={{ color: '#3c87f7', fontSize: 12 }}>✓✓</ThemedText>;
    }
    if (status === 'delivered') {
      return <ThemedText style={{ color: '#888', fontSize: 12 }}>✓✓</ThemedText>;
    }
    if (status === 'sent') {
      return <ThemedText style={{ color: '#888', fontSize: 12 }}>✓</ThemedText>;
    }
    return null;
  };

  const renderItem = ({ item }: { item: Chat }) => {
    const recipient = getRecipient(item);
    if (!recipient) return null;

    const lastMsg = item.messages[0];
    const isMe = lastMsg?.userId === user?.id;

    return (
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => handleOpenChat(item.id, recipient)}
      >
        {recipient.image ? (
          <Image source={{ uri: recipient.image }} style={styles.avatar} />
        ) : (
          <ThemedView type="backgroundSelected" style={[styles.avatar, styles.avatarPlaceholder]}>
            <ThemedText style={{ fontSize: 20 }}>👤</ThemedText>
          </ThemedView>
        )}

        <View style={styles.chatDetails}>
          <View style={styles.chatHeader}>
            <ThemedText type="smallBold" style={styles.recipientName}>
              {recipient.name || recipient.email}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.timeText}>
              {formatLastMessageTime(lastMsg?.createdAt)}
            </ThemedText>
          </View>

          <View style={styles.chatBody}>
            <View style={styles.lastMessageContainer}>
              {isMe && lastMsg && <View style={styles.statusPadding}>{renderStatus(lastMsg.status)}</View>}
              <ThemedText
                themeColor="textSecondary"
                numberOfLines={1}
                style={[
                  styles.lastMessageText,
                  !isMe && lastMsg?.status !== 'read' && { fontWeight: 'bold', color: theme.text },
                ]}
              >
                {lastMsg
                  ? lastMsg.content || '📷 Sent an image'
                  : 'No messages yet. Tap to start chatting!'}
              </ThemedText>
            </View>
            
            {!isMe && lastMsg && lastMsg.status !== 'read' && (
              <View style={styles.unreadBadge} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Chats
        </ThemedText>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => setProfileVisible(true)}
        >
          {user?.image ? (
            <Image source={{ uri: user.image }} style={styles.profileIcon} />
          ) : (
            <ThemedView type="backgroundSelected" style={[styles.profileIcon, styles.avatarPlaceholder]}>
              <ThemedText style={{ fontSize: 16 }}>👤</ThemedText>
            </ThemedView>
          )}
        </TouchableOpacity>
      </ThemedView>

      {/* Chat List */}
      <ThemedView style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator style={styles.spinner} size="large" color="#3c87f7" />
        ) : chats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyEmoji}>💬</ThemedText>
            <ThemedText type="smallBold" style={styles.emptyTitle}>
              No conversations yet
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Go to the Explore tab to search for other users and start a chat!
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={chats}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ThemedView>

      {/* Profile Modal */}
      {profileVisible && (
        <ProfileScreen visible={profileVisible} onClose={() => setProfileVisible(false)} />
      )}

      {/* Chat Room Modal */}
      {activeChat && (
        <ChatRoomScreen
          chatId={activeChat.chatId}
          recipient={activeChat.recipient}
          visible={!!activeChat}
          onClose={() => {
            setActiveChat(null);
            fetchChats(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    flex: 1,
  },
  spinner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  chatRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  chatDetails: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
    paddingBottom: Spacing.two,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 16,
  },
  timeText: {
    fontSize: 12,
  },
  chatBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusPadding: {
    marginRight: 4,
  },
  lastMessageText: {
    fontSize: 14,
    flex: 1,
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3c87f7',
    marginLeft: Spacing.two,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});
