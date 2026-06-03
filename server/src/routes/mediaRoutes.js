const express = require("express");
const upload = require("../utils/upload");
const authMiddleware = require("../middleware/authMiddleware");
const { uploadMedia } = require("../controllers/mediaController");

const router = express.Router();

router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  uploadMedia
);

module.exports = router;