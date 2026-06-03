const prisma = require("../utils/prisma");

const getMe = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
  });

  res.json(user);
};

const searchUsers = async (req, res) => {
  const { query } = req.query;
  const currentUserId = req.userId;

  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: query
          ? [
              { name: { contains: query, mode: "insensitive" } },
              { username: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ]
          : undefined,
      },
      take: 20,
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  const { name, username, image } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name,
        username,
        image,
      },
    });

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getContacts = async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      where: { userId: req.userId },
      include: {
        contact: true,
      },
    });
    res.json(contacts.map((c) => c.contact));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addContact = async (req, res) => {
  const { email, username } = req.body;
  const currentUserId = req.userId;

  try {
    if (!email && !username) {
      return res.status(400).json({ message: "Email or username is required" });
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email: email.trim().toLowerCase() } : undefined,
          username ? { username: username.trim().toLowerCase() } : undefined,
        ].filter(Boolean),
      },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.id === currentUserId) {
      return res.status(400).json({ message: "Cannot add yourself as a contact" });
    }

    const existing = await prisma.contact.findUnique({
      where: {
        userId_contactId: {
          userId: currentUserId,
          contactId: targetUser.id,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ message: "Already in contacts" });
    }

    const contact = await prisma.contact.create({
      data: {
        userId: currentUserId,
        contactId: targetUser.id,
      },
      include: { contact: true },
    });

    res.json(contact.contact);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const removeContact = async (req, res) => {
  const { contactId } = req.params;
  const currentUserId = req.userId;

  try {
    await prisma.contact.delete({
      where: {
        userId_contactId: {
          userId: currentUserId,
          contactId: contactId,
        },
      },
    });

    res.json({ message: "Contact removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getMe,
  updateProfile,
  searchUsers,
  getContacts,
  addContact,
  removeContact,
};