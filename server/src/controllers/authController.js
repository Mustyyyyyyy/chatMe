const crypto = require("crypto");
const sendOTPEmail = require("../utils/mailer");
const {
  generateAccessToken,
  generateRefreshToken,
  generateOtpToken,
  verifyOtpToken,
} = require("../utils/jwt");

const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpToken = generateOtpToken(email, otpHash);

    console.log(`[AUTH] Generated OTP for ${email}: ${otp}`);

    let emailDeliveryFailed = false;
    try {
      await sendOTPEmail(email, otp);
    } catch (error) {
      emailDeliveryFailed = true;
      console.error(`[AUTH] Failed to send OTP email to ${email}:`, error?.message || error);
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[AUTH] Dev OTP for ${email}: ${otp}`);
      }
    }

    return res.json({
      message: emailDeliveryFailed ? "OTP generated, email delivery failed" : "OTP sent to email",
      otpToken,
    });
  } catch (error) {
    console.error("[AUTH] requestOTP error:", error?.message || error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp, otpToken } = req.body;

    if (!email || !otp || !otpToken) {
      return res.status(400).json({ message: "Email, OTP, and otpToken are required" });
    }

    let tokenPayload;
    try {
      tokenPayload = verifyOtpToken(otpToken);
    } catch (error) {
      return res.status(400).json({ message: "Invalid or expired OTP token" });
    }

    if (tokenPayload.email !== email) {
      return res.status(400).json({ message: "OTP token email mismatch" });
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (tokenPayload.otpHash !== otpHash) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const prisma = require("../utils/prisma");

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
  } catch (error) {
    console.error("[AUTH] verifyOTP error:", error?.message || error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { requestOTP, verifyOTP };