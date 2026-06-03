import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Spacing } from "../constants/theme";
import { useAuth, User } from "../context/AuthContext";
import { useTheme } from "../hooks/use-theme";
import api, { getAuthToken } from "../services/api";
import {
  emitMessageRead,
  emitSendMessage,
  emitStopTyping,
  emitTyping,
  getSocket,
  joinChat,
} from "../services/socket";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

interface Message {
  chatId: string;
  id: string;
  content: string | null;
  mediaUrl: string | null;
  status: "sent" | "delivered" | "read";
  createdAt: string;
  userId: string;
  user: User;
}

interface ChatRoomScreenProps {
  chatId: string;
  recipient: User;
  visible: boolean;
  onClose: () => void;
}

export default function ChatRoomScreen({
  chatId,
  recipient,
  visible,
  onClose,
}: ChatRoomScreenProps) {
  const { user } = useAuth();
  const theme = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingImage, setSendingImage] = useState(false);
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/chat/${chatId}/messages`);
        setMessages(response.data);

        response.data.forEach((msg: Message) => {
          if (msg.userId === recipient.id && msg.status !== "read") {
            emitMessageRead(msg.id);
          }
        });
      } catch (err) {
        console.error("Failed to fetch messages", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    joinChat(chatId);

    const socket = getSocket();
    if (socket) {
      socket.on("receive_message", (message: Message) => {
        if (message.chatId === chatId) {
          setMessages((prev) => [message, ...prev]);

          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

          if (message.userId !== user?.id) {
            emitMessageRead(message.id);
          }
        }
      });

      socket.on("message_status_update", ({ messageId, status }) => {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? { ...msg, status } : msg)),
        );
      });

      socket.on("typing", ({ userId }) => {
        if (userId === recipient.id) {
          setIsRecipientTyping(true);
        }
      });

      socket.on("stop_typing", ({ userId }) => {
        if (userId === recipient.id) {
          setIsRecipientTyping(false);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off("receive_message");
        socket.off("message_status_update");
        socket.off("typing");
        socket.off("stop_typing");
      }
    };
  }, [chatId, visible, recipient.id, user?.id]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    emitSendMessage(chatId, user?.id || "", inputText.trim());
    setInputText("");

    emitStopTyping(chatId, user?.id || "");
  };

  const handleInputChange = (text: string) => {
    setInputText(text);

    if (!user?.id) return;

    emitTyping(chatId, user.id);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(chatId, user.id);
    }, 2000);
  };

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission to access camera roll is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const selectedUri = result.assets[0].uri;
      await handleUploadImage(selectedUri);
    }
  };

  const handleUploadImage = async (uri: string) => {
    setSendingImage(true);
    try {
      const formData = new FormData();
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
        formData.append("file", file);
      } else {
        const uriParts = uri.split(".");
        const fileType = uriParts[uriParts.length - 1];
        formData.append("file", {
          uri,
          name: `photo.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }

      const token = await getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "multipart/form-data",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await api.post("/media/upload", formData, {
        headers,
      });

      // Send message with media URL
      emitSendMessage(chatId, user?.id || "", undefined, response.data.url);
    } catch (err) {
      console.error("Image upload failed", err);
      alert("Failed to send image.");
    } finally {
      setSendingImage(false);
    }
  };

  const renderStatus = (status: "sent" | "delivered" | "read") => {
    if (status === "read") {
      return (
        <ThemedText style={{ color: "#3c87f7", fontSize: 11 }}>✓✓</ThemedText>
      );
    }
    if (status === "delivered") {
      return (
        <ThemedText style={{ color: "#888", fontSize: 11 }}>✓✓</ThemedText>
      );
    }
    return <ThemedText style={{ color: "#888", fontSize: 11 }}>✓</ThemedText>;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.userId === user?.id;

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}
      >
        {!isMe &&
          (recipient.image ? (
            <Image
              source={{ uri: recipient.image }}
              style={styles.messageAvatar}
            />
          ) : (
            <ThemedView
              type="backgroundSelected"
              style={[styles.messageAvatar, styles.avatarPlaceholder]}
            >
              <ThemedText style={{ fontSize: 10 }}>👤</ThemedText>
            </ThemedView>
          ))}
        <View style={styles.bubbleContainer}>
          <ThemedView
            type={isMe ? "background" : "backgroundElement"}
            style={[
              styles.messageBubble,
              isMe ? styles.bubbleMe : styles.bubbleOther,
              isMe && { backgroundColor: "#3c87f7" },
            ]}
          >
            {item.mediaUrl && (
              <Image
                source={{ uri: item.mediaUrl }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            )}
            {item.content && (
              <ThemedText
                style={[styles.messageText, isMe && { color: "#fff" }]}
              >
                {item.content}
              </ThemedText>
            )}
          </ThemedView>
          <View
            style={[
              styles.messageMeta,
              isMe ? styles.metaMe : styles.metaOther,
            ]}
          >
            <ThemedText themeColor="textSecondary" style={styles.messageTime}>
              {formatTime(item.createdAt)}
            </ThemedText>
            {isMe && renderStatus(item.status)}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          {/* Header */}
          <ThemedView style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <ThemedText style={styles.backButtonText}>◀ Chats</ThemedText>
            </TouchableOpacity>

            <View style={styles.headerUser}>
              {recipient.image ? (
                <Image
                  source={{ uri: recipient.image }}
                  style={styles.headerAvatar}
                />
              ) : (
                <ThemedView
                  type="backgroundSelected"
                  style={[styles.headerAvatar, styles.avatarPlaceholder]}
                >
                  <ThemedText style={{ fontSize: 14 }}>👤</ThemedText>
                </ThemedView>
              )}
              <View>
                <ThemedText type="smallBold">
                  {recipient.name || recipient.email}
                </ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  style={styles.headerStatus}
                >
                  {isRecipientTyping
                    ? "typing..."
                    : recipient.username
                      ? `@${recipient.username}`
                      : "online"}
                </ThemedText>
              </View>
            </View>

            <View style={{ width: 60 }} />
          </ThemedView>

          {/* Messages */}
          <ThemedView style={styles.messageListContainer}>
            {loading ? (
              <ActivityIndicator
                style={styles.spinner}
                size="large"
                color="#3c87f7"
              />
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                inverted
                contentContainerStyle={styles.listContent}
              />
            )}
          </ThemedView>

          {/* Typing indicator */}
          {isRecipientTyping && (
            <View style={styles.typingContainer}>
              <ThemedText themeColor="textSecondary" style={styles.typingText}>
                {recipient.name || "Someone"} is typing...
              </ThemedText>
            </View>
          )}

          {/* Input Panel */}
          <ThemedView
            style={[
              styles.inputPanel,
              { borderTopColor: theme.backgroundSelected },
            ]}
          >
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handlePickImage}
              disabled={sendingImage}
            >
              {sendingImage ? (
                <ActivityIndicator size="small" color="#3c87f7" />
              ) : (
                <ThemedText style={styles.iconText}>📷</ThemedText>
              )}
            </TouchableOpacity>

            <TextInput
              style={[
                styles.textInput,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              placeholder="Message..."
              placeholderTextColor={theme.textSecondary}
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={1000}
            />

            {inputText.trim().length > 0 && (
              <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                <ThemedText style={styles.sendButtonText}>Send</ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  backButton: {
    paddingVertical: Spacing.one,
    paddingRight: Spacing.three,
  },
  backButtonText: {
    color: "#3c87f7",
    fontSize: 16,
    fontWeight: "600",
  },
  headerUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerStatus: {
    fontSize: 12,
  },
  messageListContainer: {
    flex: 1,
  },
  spinner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: Spacing.three,
    alignItems: "flex-end",
    gap: Spacing.two,
    maxWidth: "80%",
  },
  messageRowMe: {
    alignSelf: "flex-end",
  },
  messageRowOther: {
    alignSelf: "flex-start",
  },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  bubbleContainer: {
    gap: 2,
  },
  messageBubble: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    maxWidth: "100%",
  },
  bubbleMe: {
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: Spacing.two,
    marginBottom: Spacing.one,
  },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  metaMe: {
    justifyContent: "flex-end",
  },
  metaOther: {
    justifyContent: "flex-start",
  },
  messageTime: {
    fontSize: 10,
  },
  typingContainer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
  },
  typingText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  inputPanel: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 22,
  },
  textInput: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === "ios" ? Spacing.two : Spacing.one,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: "#3c87f7",
    borderRadius: 18,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
