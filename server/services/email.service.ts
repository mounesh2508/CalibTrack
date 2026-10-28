import nodemailer, { type Transporter } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ override: true });

export interface EmailSendResult {
  dispatched: boolean;
  provider: 'resend' | 'smtp' | 'simulated';
  recipient: string;
  message: string;
  error?: string;
}

export interface VerificationEmailPayload {
  to: string;
  name?: string;
  code: string;
  type?: 'REGISTRATION' | 'PASSWORD_RESET';
}

export class EmailService {
  private resendApiKey: string | undefined;
  private resendFrom: string;
  private smtpTransporter: Transporter | null = null;
  private smtpFrom: string;

  constructor() {
    this.resendApiKey = process.env.RESEND_API_KEY;
    this.resendFrom = process.env.RESEND_FROM || 'CalibTrack Metrology <onboarding@resend.dev>';
    this.smtpFrom = process.env.SMTP_FROM || 'CalibTrack Laboratory <no-reply@calibtrack.lab>';

    this.initSmtp();
  }

  private initSmtp() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const user = process.env.SMTP_USER;
    const rawPass = process.env.SMTP_PASS;
    const pass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE !== 'false';

    if (host && user && pass) {
      try {
        if (host.includes('gmail')) {
          this.smtpTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user,
              pass,
            },
          });
        } else {
          this.smtpTransporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: {
              user,
              pass,
            },
            tls: {
              rejectUnauthorized: false,
            },
          });
        }
        console.log(`[EmailService] SMTP transporter configured for host: ${host} (User: ${user})`);
      } catch (err: any) {
        console.warn('[EmailService] Failed to initialize SMTP transporter:', err?.message);
        this.smtpTransporter = null;
      }
    }
  }

  /**
   * Generates a clean, ISO 17025 compliant HTML email template
   */
  private generateHtml(payload: VerificationEmailPayload): string {
    const isRegistration = payload.type !== 'PASSWORD_RESET';
    const actionTitle = isRegistration ? 'Staff Account Verification' : 'Password Recovery Verification';
    const greeting = payload.name ? `Hello ${payload.name},` : 'Hello,';
    const actionDesc = isRegistration
      ? 'A laboratory staff account registration has been initiated for CalibTrack Metrology System with this email address.'
      : 'A password recovery request has been received for your CalibTrack laboratory account.';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${actionTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 28px 32px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 6px;">
                      ISO 17025 Metrology System
                    </span>
                    <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 8px 0 0 0; letter-spacing: -0.5px;">
                      CalibTrack Laboratory
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 15px; line-height: 22px; margin: 0 0 16px 0; color: #334155;">
                ${greeting}
              </p>
              <p style="font-size: 14px; line-height: 22px; margin: 0 0 24px 0; color: #475569;">
                ${actionDesc} Use the 6-digit verification code below to verify your email and activate your account.
              </p>

              <!-- OTP Code Display Box -->
              <div style="background-color: #eff6ff; border: 2px dashed #93c5fd; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #1d4ed8; margin-bottom: 8px;">
                  Your 6-Digit Verification Code
                </span>
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e3a8a; display: inline-block;">
                  ${payload.code}
                </span>
                <span style="display: block; font-size: 12px; color: #64748b; margin-top: 8px;">
                  Expires in <strong>15 minutes</strong> · Single-use verification
                </span>
              </div>

              <!-- Security instructions -->
              <div style="background-color: #f1f5f9; border-radius: 8px; padding: 14px 16px; margin: 24px 0;">
                <p style="font-size: 12px; line-height: 18px; margin: 0; color: #64748b;">
                  🔒 <strong>Security Warning:</strong> Never share this code with anyone. CalibTrack administrators will never ask for your verification code.
                </p>
              </div>

              <p style="font-size: 13px; line-height: 20px; color: #94a3b8; margin: 24px 0 0 0;">
                If you did not request this code, no action is required. Your email address remains safe.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="font-size: 11px; line-height: 16px; color: #94a3b8; margin: 0;">
                CalibTrack Laboratory Metrology & Equipment Calibration Management<br>
                ISO/IEC 17025 Accredited Calibration Registry · Automated Compliance Notice
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Dispatches email via Resend API (HTTPS REST)
   */
  private async sendViaResend(
    to: string,
    subject: string,
    html: string,
    senderOverride?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!this.resendApiKey) {
      return { success: false, error: 'RESEND_API_KEY is not configured.' };
    }

    const fromAddress = senderOverride || this.resendFrom || 'CalibTrack Metrology <onboarding@resend.dev>';

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject,
          html,
        }),
      });

      const data: any = await response.json();
      if (!response.ok) {
        // If domain is not verified, automatically retry with official Resend testing domain
        if (!senderOverride && fromAddress !== 'CalibTrack Metrology <onboarding@resend.dev>' && data.message?.includes('domain is not verified')) {
          console.warn('[EmailService] Sender domain not verified in Resend. Retrying with official testing domain (onboarding@resend.dev)...');
          return this.sendViaResend(to, subject, html, 'CalibTrack Metrology <onboarding@resend.dev>');
        }

        return {
          success: false,
          error: data.message || `Resend API returned status ${response.status}`,
        };
      }

      return { success: true, id: data.id };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error reaching Resend API' };
    }
  }

  /**
   * Dispatches email via standard SMTP (Nodemailer)
   */
  private async sendViaSmtp(
    to: string,
    subject: string,
    html: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.smtpTransporter) {
      return { success: false, error: 'SMTP transporter is not configured.' };
    }

    try {
      await this.smtpTransporter.sendMail({
        from: this.smtpFrom,
        to,
        subject,
        html,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'SMTP delivery failed' };
    }
  }

  /**
   * Main method to send verification OTP emails
   * Tries Resend API first, then SMTP, and falls back to simulated delivery if neither is set.
   */
  async sendVerificationEmail(payload: VerificationEmailPayload): Promise<EmailSendResult> {
    const isRegistration = payload.type !== 'PASSWORD_RESET';
    const subject = isRegistration
      ? `${payload.code} is your CalibTrack staff registration code`
      : `${payload.code} is your CalibTrack password reset code`;

    const html = this.generateHtml(payload);

    // 1. Prioritize SMTP (Gmail SMTP with App Password sends to ANY recipient worldwide without sandbox limits)
    if (this.smtpTransporter) {
      const smtpRes = await this.sendViaSmtp(payload.to, subject, html);
      if (smtpRes.success) {
        console.log(`[EmailService] Verification email sent to ${payload.to} via Gmail SMTP`);
        return {
          dispatched: true,
          provider: 'smtp',
          recipient: payload.to,
          message: `Verification code sent to ${payload.to} via Gmail SMTP.`,
        };
      } else {
        console.warn(`[EmailService] SMTP delivery failed: ${smtpRes.error}. Attempting Resend fallback...`);
      }
    }

    // 2. Try Resend API as secondary fallback
    if (this.resendApiKey) {
      const resendRes = await this.sendViaResend(payload.to, subject, html);
      if (resendRes.success) {
        console.log(`[EmailService] Verification email sent to ${payload.to} via Resend API (ID: ${resendRes.id})`);
        return {
          dispatched: true,
          provider: 'resend',
          recipient: payload.to,
          message: `Verification code sent to ${payload.to} via Resend.`,
        };
      } else {
        console.warn(`[EmailService] Resend API failed: ${resendRes.error}`);
      }
    }

    // 3. Fallback: Logged in-app delivery
    console.log(`[EmailService] Live email services failed. Code ${payload.code} for ${payload.to}.`);
    return {
      dispatched: false,
      provider: 'simulated',
      recipient: payload.to,
      message: `Verification code generated for ${payload.to}.`,
    };
  }
}

export const emailService = new EmailService();
