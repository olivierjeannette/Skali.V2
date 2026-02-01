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
  from: process.env.EMAIL_FROM || 'Skali Prog <noreply@skaliprog.com>',
  replyTo: 'support@skaliprog.com',
};

// Helper to check if email is configured
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
