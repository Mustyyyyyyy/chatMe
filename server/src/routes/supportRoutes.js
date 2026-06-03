const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getSupportInfo,
  getPrivacyPolicy,
  submitFeedback,
  clearCache,
} = require("../controllers/supportController");

const router = express.Router();

router.get("/", getSupportInfo);
router.get("/privacy", getPrivacyPolicy);
router.post("/feedback", submitFeedback);
router.post("/clear-cache", authMiddleware, clearCache);

module.exports = router;
