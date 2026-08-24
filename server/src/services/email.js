import { Resend } from 'resend';
import { env } from '../config/env.js';

const resend = new Resend(process.env.RESEND_API_KEY);

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

  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const response = await resend.emails.send({
    from:
      process.env.EMAIL_FROM ||
      'Ticketly <onboarding@resend.dev>',

    to: [to],

    subject,

    text,

    attachments: attachments.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content
    }))
  });

  if (response.error) {
    throw new Error(
      response.error.message || 'Resend email failed'
    );
  }

  return 'SENT';
}