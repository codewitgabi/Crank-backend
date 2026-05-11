import nodemailer from "nodemailer";
import {
  SMTP_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASSWORD,
} from "../utils/constants";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(EMAIL_PORT || 587),
  secure: Number(EMAIL_PORT) === 465,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

export default transporter;
