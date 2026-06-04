require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");
const prisma = require("./utils/prisma");

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const userRoutes = require("./routes/userRoutes");
const supportRoutes = require("./routes/supportRoutes");

const app = express();
const APP_URL = process.env.APP_URL || 'https://chat-ebon-nine-76.vercel.app';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/user", userRoutes);
app.use("/api/support", supportRoutes);

app.use((err, req, res, next) => {
  console.error("[SERVER] Unhandled error:", err?.message || err);
  res.status(500).json({ message: "Internal server error" });
});

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "ChatMe server is running", appUrl: APP_URL });
});

app.get("/support", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/support.html"));
});

app.get("/help", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/support.html"));
});

app.get("/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/privacy.html"));
});

if (require.main === module) {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  const onlineUsers = new Map();
  const lastSeen = new Map();

  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("register", (userId) => {
      onlineUsers.set(userId, socket.id);
    });

    socket.on("join_chat", (chatId) => {
      socket.join(chatId);
    });

    socket.on("send_message", async (data) => {
      const message = await prisma.message.create({
        data: {
          chatId: data.chatId,
          userId: data.senderId,
          content: data.content || null,
          mediaUrl: data.mediaUrl || null,
          status: "sent",
        },
        include: { user: true },
      });

      io.to(data.chatId).emit("receive_message", message);
    });

    socket.on("message_delivered", async ({ messageId }) => {
      await prisma.message.update({
        where: { id: messageId },
        data: { status: "delivered" },
      });

      io.emit("message_status_update", {
        messageId,
        status: "delivered",
      });
    });

    socket.on("message_read", async ({ messageId }) => {
      await prisma.message.update({
        where: { id: messageId },
        data: { status: "read" },
      });

      io.emit("message_status_update", {
        messageId,
        status: "read",
      });
    });

    socket.on("typing", ({ chatId, userId }) => {
      socket.to(chatId).emit("typing", { userId });
    });

    socket.on("stop_typing", ({ chatId, userId }) => {
      socket.to(chatId).emit("stop_typing", { userId });
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          lastSeen.set(userId, new Date());
          break;
        }
      }
    });
  });

  const PORT = process.env.PORT || 5000;

  server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
} else {
  module.exports = app;
}
