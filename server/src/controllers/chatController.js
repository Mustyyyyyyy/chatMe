const prisma = require("../utils/prisma");

const createOrGetChat = async (req, res) => {
  const userId = req.userId;
  const { receiverId } = req.body;

  if (userId === receiverId) {
    return res.status(400).json({ message: "Cannot chat with yourself" });
  }

  const existingChat = await prisma.chat.findFirst({
    where: {
      users: {
        every: {
          userId: {
            in: [userId, receiverId],
          },
        },
      },
    },
    include: { users: true },
  });

  if (existingChat) return res.json(existingChat);

  const chat = await prisma.chat.create({
    data: {
      users: {
        create: [
          { userId },
          { userId: receiverId },
        ],
      },
    },
    include: { users: true },
  });

  res.json(chat);
};

const getUserChats = async (req, res) => {
  const chats = await prisma.chat.findMany({
    where: {
      users: {
        some: { userId: req.userId },
      },
    },
    include: {
      users: {
        include: { user: true },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  res.json(chats);
};

const getChatMessages = async (req, res) => {
  const { chatId } = req.params;
  const { cursor } = req.query;

  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: 20,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
    include: { user: true },
  });

  res.json(messages);
};

module.exports = {
  createOrGetChat,
  getUserChats,
  getChatMessages,
};