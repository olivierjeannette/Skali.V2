import { Resend } from 'resend';

// Create resend client lazily to avoid build errors when API key is not set
let resendInstance: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export const emailConfig = {
  // Domaine vérifié sur Resend: laskali.eu
  from: process.env.EMAIL_FROM || 'Skali Prog <noreply@laskali.eu>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@laskali.eu',
};

// Helper to check if email is configured
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
