const prisma = require("../utils/prisma");
const sendOTPEmail = require("../utils/mailer");
const { setOTP, getOTP, deleteOTP } = require("../utils/otpStore");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/jwt");

const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    setOTP(email, otp);

    console.log(`[AUTH] Generated OTP for ${email}: ${otp}`);

    try {
      await sendOTPEmail(email, otp);
    } catch (error) {
      console.error(`[AUTH] Failed to send OTP email to ${email}:`, error?.message || error);
    }

    return res.json({ message: "OTP sent to email" });
  } catch (error) {
    console.error("[AUTH] requestOTP error:", error?.message || error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const stored = getOTP(email);

  if (!stored || stored.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (Date.now() > stored.expiresAt) {
    return res.status(400).json({ message: "OTP expired" });
  }

  deleteOTP(email);

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: { email },
    });
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      deviceInfo: req.headers["user-agent"] || "unknown",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.json({
    user,
    accessToken,
    refreshToken,
  });
};

module.exports = { requestOTP, verifyOTP };