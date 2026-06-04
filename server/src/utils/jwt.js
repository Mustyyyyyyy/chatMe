const jwt = require("jsonwebtoken");

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const generateOtpToken = (email, otpHash) => {
  return jwt.sign({ email, otpHash }, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });
};

const verifyOtpToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateAccessToken, generateRefreshToken, generateOtpToken, verifyOtpToken };