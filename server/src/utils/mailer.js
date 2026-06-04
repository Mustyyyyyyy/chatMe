const nodemailer = require("nodemailer");

const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM || user;
  const service = process.env.EMAIL_SERVICE || "gmail";
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
  const secure = process.env.EMAIL_SECURE === "true";

  if (!user || !pass) {
    throw new Error("Missing email credentials in EMAIL_USER or EMAIL_PASS");
  }

  const transportOptions = {
    auth: {
      user,
      pass,
    },
  };

  if (host && port) {
    transportOptions.host = host;
    transportOptions.port = port;
    transportOptions.secure = secure;
  } else {
    transportOptions.service = service;
  }

  return { transporter: nodemailer.createTransport(transportOptions), from };
};

const sendOTPEmail = async (email, otp) => {
  const { transporter, from } = createTransporter();

  await transporter.sendMail({
    from,
    to: email,
    subject: "Your Chat App OTP Code",
    text: `Your OTP is: ${otp}. It expires in 5 minutes.`,
  });
};

module.exports = sendOTPEmail;