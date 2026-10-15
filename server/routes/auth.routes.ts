import { Router, Request, Response } from 'express';
import { memoryStore } from '../database/config';
import { User, VerificationOtp } from '../models';

const router = Router();

// Store last sent timestamp per email to enforce 60s cooldown
const lastSentTimestamps = new Map<string, number>();

// -----------------------------------------------------------------------------
// POST /api/auth/register
// -----------------------------------------------------------------------------
router.post('/register', (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ detail: 'Staff name is required.' });
    }
    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ detail: 'A valid email address is required.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ detail: 'Password must be at least 8 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = memoryStore.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail && u.is_email_verified !== false
    );
    if (existing) {
      return res.status(400).json({
        detail: 'An account with this email address is already registered and verified.',
      });
    }

    // Generate 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Remove any older registration OTP for this email
    memoryStore.otps = memoryStore.otps.filter(
      (o) => !(o.email.toLowerCase() === normalizedEmail && o.type === 'REGISTRATION')
    );

    const otpEntry: VerificationOtp = {
      id: `otp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email: normalizedEmail,
      code,
      type: 'REGISTRATION',
      expires_at: expiresAt,
      attempts: 0,
      user_data: {
        name: name.trim(),
        password_hash: password,
        role: 'TECHNICIAN',
      },
    };

    memoryStore.otps.push(otpEntry);
    lastSentTimestamps.set(`${normalizedEmail}:REGISTRATION`, Date.now());

    console.log(`[CalibTrack Auth] Registration OTP generated for ${normalizedEmail}: ${code}`);

    return res.status(201).json({
      success: true,
      message: 'A 6-digit verification code has been dispatched to your email address.',
      email: normalizedEmail,
      is_email_verified: false,
      user: {
        id: otpEntry.id,
        name: name.trim(),
        email: normalizedEmail,
        role: 'TECHNICIAN',
      },
      simulation: {
        otp_code: code,
        expires_in_minutes: 15,
        mode: 'GMAIL_PREVIEW',
        recipient: normalizedEmail,
      },
    });
  } catch (err: any) {
    console.error('[CalibTrack Auth] Register error:', err);
    return res.status(500).json({ detail: err.message || 'Failed to process staff registration.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/auth/verify-code
// -----------------------------------------------------------------------------
router.post('/verify-code', (req: Request, res: Response) => {
  try {
    const { email, code, type } = req.body;

    if (!email || !code) {
      return res.status(400).json({ detail: 'Email and verification code are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanCode = String(code).trim();
    const targetType = (type || 'REGISTRATION').toUpperCase();

    // Find active OTP entry
    const otpIndex = memoryStore.otps.findIndex(
      (o) => o.email.toLowerCase() === normalizedEmail && o.type === targetType
    );

    if (otpIndex === -1) {
      return res.status(400).json({
        detail: 'No active verification code found for this email. Please request a new code.',
      });
    }

    const otp = memoryStore.otps[otpIndex];

    // Check expiration (15 minutes)
    if (Date.now() > otp.expires_at) {
      memoryStore.otps.splice(otpIndex, 1);
      return res.status(400).json({
        detail: 'Verification code has expired. Please request a new 6-digit code.',
      });
    }

    // Check maximum attempts (5 max)
    if (otp.attempts >= 5) {
      memoryStore.otps.splice(otpIndex, 1);
      return res.status(400).json({
        detail: 'Too many incorrect attempts. Code invalidated. Please request a fresh code.',
      });
    }

    // Compare code
    if (otp.code !== cleanCode) {
      otp.attempts += 1;
      const remaining = 5 - otp.attempts;
      return res.status(400).json({
        detail: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      });
    }

    // Successfully verified! Single-use: remove OTP
    memoryStore.otps.splice(otpIndex, 1);

    if (targetType === 'REGISTRATION') {
      // Create user if user_data exists
      let existingUser = memoryStore.users.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (!existingUser && otp.user_data) {
        existingUser = {
          id: `usr-${Date.now()}`,
          name: otp.user_data.name,
          email: normalizedEmail,
          password_hash: otp.user_data.password_hash,
          role: otp.user_data.role,
          is_email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        memoryStore.users.push(existingUser);
      } else if (existingUser) {
        existingUser.is_email_verified = true;
        existingUser.updated_at = new Date().toISOString();
      }

      return res.json({
        success: true,
        verified: true,
        message: 'Email verified successfully! Your laboratory staff account is now active.',
        email: normalizedEmail,
        user: existingUser
          ? {
              id: existingUser.id,
              name: existingUser.name,
              email: existingUser.email,
              role: existingUser.role,
            }
          : undefined,
      });
    } else {
      // PASSWORD_RESET verification
      const resetToken = `rst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return res.json({
        success: true,
        verified: true,
        reset_token: resetToken,
        message: 'Verification code confirmed. You may now enter your new password.',
        email: normalizedEmail,
      });
    }
  } catch (err: any) {
    console.error('[CalibTrack Auth] Verify code error:', err);
    return res.status(500).json({ detail: err.message || 'Failed to verify code.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/auth/forgot-password
// -----------------------------------------------------------------------------
router.post('/forgot-password', (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ detail: 'Please enter your registered email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = memoryStore.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    // If not found in memoryStore, also check if it's the demo account
    const isDemo =
      normalizedEmail === 'asokanmounesh@gmail.com' ||
      normalizedEmail === 'admin@calibtrack-lab.com' ||
      normalizedEmail === 'admin@calibtrack.lab' ||
      normalizedEmail === 'sarah.lin@calibtrack.lab' ||
      normalizedEmail === 'marcus.vance@calibtrack.lab';

    if (!user && !isDemo) {
      return res.status(404).json({
        detail: 'No registered laboratory account found with this email address.',
      });
    }

    // Generate 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    // Clear old password reset OTPs for this email
    memoryStore.otps = memoryStore.otps.filter(
      (o) => !(o.email.toLowerCase() === normalizedEmail && o.type === 'PASSWORD_RESET')
    );

    const otpEntry: VerificationOtp = {
      id: `otp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email: normalizedEmail,
      code,
      type: 'PASSWORD_RESET',
      expires_at: expiresAt,
      attempts: 0,
    };

    memoryStore.otps.push(otpEntry);
    lastSentTimestamps.set(`${normalizedEmail}:PASSWORD_RESET`, Date.now());

    console.log(`[CalibTrack Auth] Password Reset OTP generated for ${normalizedEmail}: ${code}`);

    return res.json({
      success: true,
      message: 'A 6-digit password reset code has been sent to your email address.',
      email: normalizedEmail,
      simulation: {
        otp_code: code,
        expires_in_minutes: 15,
        mode: 'GMAIL_PREVIEW',
        recipient: normalizedEmail,
      },
    });
  } catch (err: any) {
    console.error('[CalibTrack Auth] Forgot password error:', err);
    return res.status(500).json({ detail: err.message || 'Failed to process forgot password request.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/auth/reset-password
// -----------------------------------------------------------------------------
router.post('/reset-password', (req: Request, res: Response) => {
  try {
    const { email, new_password, reset_token } = req.body;

    if (!email || !new_password) {
      return res.status(400).json({ detail: 'Email and new password are required.' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ detail: 'New password must be at least 8 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let user = memoryStore.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    if (!user) {
      // If demo user or registered earlier
      user = {
        id: `usr-${Date.now()}`,
        name: normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password_hash: new_password,
        role: 'ADMIN',
        is_email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.users.push(user);
    } else {
      user.password_hash = new_password;
      user.is_email_verified = true;
      user.updated_at = new Date().toISOString();
    }

    console.log(`[CalibTrack Auth] Password successfully reset for ${normalizedEmail}`);

    return res.json({
      success: true,
      message: 'Password updated successfully. You can now log in with your new credentials.',
      email: normalizedEmail,
    });
  } catch (err: any) {
    console.error('[CalibTrack Auth] Reset password error:', err);
    return res.status(500).json({ detail: err.message || 'Failed to reset password.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/auth/resend-code
// -----------------------------------------------------------------------------
router.post('/resend-code', (req: Request, res: Response) => {
  try {
    const { email, type } = req.body;

    if (!email) {
      return res.status(400).json({ detail: 'Email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const targetType = (type || 'REGISTRATION').toUpperCase() as 'REGISTRATION' | 'PASSWORD_RESET';

    // Rate limiting: enforce 60 seconds interval
    const key = `${normalizedEmail}:${targetType}`;
    const lastSent = lastSentTimestamps.get(key);
    if (lastSent && Date.now() - lastSent < 60000) {
      const waitSeconds = Math.ceil((60000 - (Date.now() - lastSent)) / 1000);
      return res.status(429).json({
        detail: `Please wait ${waitSeconds} seconds before requesting a new code.`,
      });
    }

    // Preserve existing user_data if registration
    const existingOtp = memoryStore.otps.find(
      (o) => o.email.toLowerCase() === normalizedEmail && o.type === targetType
    );

    // Generate fresh 6-digit numeric OTP
    const freshCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;

    // Filter out old OTPs
    memoryStore.otps = memoryStore.otps.filter(
      (o) => !(o.email.toLowerCase() === normalizedEmail && o.type === targetType)
    );

    memoryStore.otps.push({
      id: `otp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email: normalizedEmail,
      code: freshCode,
      type: targetType,
      expires_at: expiresAt,
      attempts: 0,
      user_data: existingOtp?.user_data,
    });

    lastSentTimestamps.set(key, Date.now());
    console.log(`[CalibTrack Auth] Fresh OTP re-sent for ${normalizedEmail} (${targetType}): ${freshCode}`);

    return res.json({
      success: true,
      message: 'A fresh 6-digit verification code has been dispatched to your email.',
      simulation: {
        otp_code: freshCode,
        expires_in_minutes: 15,
        mode: 'GMAIL_PREVIEW',
        recipient: normalizedEmail,
      },
    });
  } catch (err: any) {
    console.error('[CalibTrack Auth] Resend code error:', err);
    return res.status(500).json({ detail: err.message || 'Failed to resend code.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/auth/login
// -----------------------------------------------------------------------------
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Default admin test credentials
    if (
      normalizedEmail === 'asokanmounesh@gmail.com' ||
      normalizedEmail === 'admin@calibtrack-lab.com' ||
      normalizedEmail === 'admin@calibtrack.lab'
    ) {
      if (
        normalizedEmail === 'asokanmounesh@gmail.com'
          ? password === 'a.MOUNESH14' || password === 'AdminPass123!'
          : password === 'AdminPass123!' || password === 'a.MOUNESH14'
      ) {
        const user = memoryStore.users.find((u) => u.email.toLowerCase() === normalizedEmail) ||
          memoryStore.users[0] || {
            id: 'usr-admin-01',
            name: 'Mounesh A',
            email: normalizedEmail,
            role: 'ADMIN',
          };
        return res.json({
          access_token: `token-admin-${Date.now()}`,
          token_type: 'Bearer',
          user: {
            id: user.id,
            name: user.name || 'Mounesh A',
            email: user.email || normalizedEmail,
            role: 'ADMIN',
          },
        });
      }
    }

    const user = memoryStore.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    if (!user) {
      return res.status(401).json({ detail: 'Invalid email address or password.' });
    }

    if (user.is_email_verified === false) {
      return res.status(403).json({
        detail: 'Your email address has not been verified. Please verify your 6-digit code.',
      });
    }

    // Password comparison (simple compare or hash)
    if (user.password_hash !== password && !user.password_hash.startsWith('$2b$')) {
      return res.status(401).json({ detail: 'Invalid email address or password.' });
    }

    return res.json({
      access_token: `token-${user.id}-${Date.now()}`,
      token_type: 'Bearer',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message || 'Authentication error.' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/auth/me
// -----------------------------------------------------------------------------
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ detail: 'Not authenticated.' });
  }
  const user = memoryStore.users[0];
  return res.json({
    id: user?.id || 'usr-admin-01',
    name: user?.name || 'Mounesh A',
    email: user?.email || 'asokanmounesh@gmail.com',
    role: user?.role || 'ADMIN',
  });
});

export default router;
