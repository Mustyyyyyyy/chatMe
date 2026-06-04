const nodemailer = require("nodemailer");

const createTransportConfig = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM || user;
  const service = process.env.EMAIL_SERVICE || "gmail";
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
  const secure = process.env.EMAIL_SECURE === "true" || port === 465;

  if (!user || !pass) {
    throw new Error("Missing email credentials in EMAIL_USER or EMAIL_PASS");
  }

  const baseConfig = {
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
    },
    requireTLS: true,
  };

  if (host && port) {
    return {
      config: {
        ...baseConfig,
        host,
        port,
        secure,
      },
      from,
    };
  }

  return {
    config: {
      ...baseConfig,
      service,
      secure,
    },
    from,
  };
};

const sendWithTransport = async (transportConfig, mailOptions) => {
  const transporter = nodemailer.createTransport(transportConfig);
  await transporter.verify();
  return transporter.sendMail(mailOptions);
};

const sendOTPEmail = async (email, otp) => {
  const { config, from } = createTransportConfig();
  const mailOptions = {
    from,
    to: email,
    subject: "Your Chat App OTP Code",
    text: `Your OTP is: ${otp}. It expires in 5 minutes.`,
  };

  try {
    return await sendWithTransport(config, mailOptions);
  } catch (error) {
    if (
      error?.code === "ETIMEDOUT" &&
      config.host === "smtp.gmail.com" &&
      config.port === 587
    ) {
      const fallbackConfig = { ...config, port: 465, secure: true };
      return await sendWithTransport(fallbackConfig, mailOptions);
    }

    throw error;
  }
};

module.exports = sendOTPEmail;