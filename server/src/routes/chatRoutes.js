const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createOrGetChat,
  getUserChats,
  getChatMessages,
} = require("../controllers/chatController");

const router = express.Router();

router.post("/", authMiddleware, createOrGetChat);
router.get("/", authMiddleware, getUserChats);
router.get("/:chatId/messages", authMiddleware, getChatMessages);

module.exports = router;