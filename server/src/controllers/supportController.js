const prisma = require("../utils/prisma");

const getSupportInfo = async (req, res) => {
  res.json({
    title: "Help & Support",
    description:
      "If you need help with ChatMe, our support team is ready to help. Use the feedback form or clear your cache to refresh your session.",
    contactEmail: "support@chatme.example.com",
    faq: [
      {
        question: "How do I clear my cache?",
        answer: "Use the Clear Storage Cache button on the support page to reset your active session and sign out of other devices.",
      },
      {
        question: "How can I contact support?",
        answer: "Submit a feedback request on the support page or email support@chatme.example.com.",
      },
    ],
  });
};

const getPrivacyPolicy = async (req, res) => {
  res.json({
    title: "Privacy Policy",
    summary:
      "ChatMe respects your privacy. We only store the information you provide for authentication, messaging, and support requests.",
    content:
      "ChatMe collects user email, profile data, chat sessions, and support feedback to deliver the service. We do not sell your data. Your session and message content remain private and secure. If you need your data removed, contact support@chatme.example.com.",
  });
};

const submitFeedback = async (req, res) => {
  const { email, subject, category, message, userId } = req.body;

  if (!message || (!email && !userId)) {
    return res.status(400).json({
      message: "Please provide a message and either your email or your user ID.",
    });
  }

  try {
    const feedback = await prisma.feedback.create({
      data: {
        email: email ? email.toLowerCase().trim() : null,
        subject: subject ? subject.trim() : null,
        category: category ? category.trim() : null,
        message: message.trim(),
        userId: userId || null,
      },
    });

    res.json({
      message: "Feedback received. Our team will review it shortly.",
      feedbackId: feedback.id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const clearCache = async (req, res) => {
  try {
    const deleteResult = await prisma.session.deleteMany({
      where: { userId: req.userId },
    });

    res.json({
      message: "Storage cache cleared for this user.",
      clearedSessions: deleteResult.count,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getSupportInfo,
  getPrivacyPolicy,
  submitFeedback,
  clearCache,
};
