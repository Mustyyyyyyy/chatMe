import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from './api';

let socket: Socket | null = null;

export const connectSocket = (userId: string): Socket => {
  if (socket) {
    if (socket.connected) {
      socket.emit('register', userId);
      return socket;
    }
    socket.connect();
    socket.emit('register', userId);
    return socket;
  }

  socket = io(BACKEND_URL, {
    path: '/api/socket.io',
    transports: ['polling', 'websocket'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('[SOCKET] Connected to server:', socket?.id);
    socket?.emit('register', userId);
  });

  socket.on('disconnect', (reason) => {
    console.log('[SOCKET] Disconnected from server:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[SOCKET] Connection error:', error.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[SOCKET] Socket instance destroyed');
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const joinChat = (chatId: string) => {
  if (socket) {
    socket.emit('join_chat', chatId);
    console.log(`[SOCKET] Joined chat room: ${chatId}`);
  }
};

export const emitSendMessage = (chatId: string, senderId: string, content?: string, mediaUrl?: string) => {
  if (socket) {
    socket.emit('send_message', {
      chatId,
      senderId,
      content,
      mediaUrl,
    });
  }
};

export const emitTyping = (chatId: string, userId: string) => {
  if (socket) {
    socket.emit('typing', { chatId, userId });
  }
};

export const emitStopTyping = (chatId: string, userId: string) => {
  if (socket) {
    socket.emit('stop_typing', { chatId, userId });
  }
};

export const emitMessageDelivered = (messageId: string) => {
  if (socket) {
    socket.emit('message_delivered', { messageId });
  }
};

export const emitMessageRead = (messageId: string) => {
  if (socket) {
    socket.emit('message_read', { messageId });
  }
};
