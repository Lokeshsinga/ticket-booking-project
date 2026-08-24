import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export async function sendEmail({
  to,
  subject,
  text,
  attachments = []
}) {
  if (env.emailMode === 'console') {
    console.info(
      `[email:console] ${to} | ${subject}\n${text}`
    );

    return 'CONSOLE';
  }

  const port = Number(
    process.env.SMTP_PORT || 465
  );

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,

    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },

    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000
  });

  await transporter.sendMail({
    from:
      process.env.EMAIL_FROM ||
      process.env.SMTP_USER,

    to,
    subject,
    text,
    attachments
  });

  return 'SENT';
}