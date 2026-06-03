const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getMe,
  updateProfile,
  searchUsers,
  getContacts,
  addContact,
  removeContact,
} = require("../controllers/userController");

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateProfile);
router.get("/", authMiddleware, searchUsers);
router.get("/contacts", authMiddleware, getContacts);
router.post("/contacts", authMiddleware, addContact);
router.delete("/contacts/:contactId", authMiddleware, removeContact);

module.exports = router;