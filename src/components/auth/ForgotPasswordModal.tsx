import React, { useState, useEffect, useRef } from 'react';
import {
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  ShieldCheck,
  Copy,
  Check,
  Inbox,
} from 'lucide-react';
import { Button } from '../common/Button';
import { api } from '../../services/api';

export interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onPasswordResetSuccess?: () => void;
}

type Step = 'EMAIL' | 'VERIFY_OTP' | 'NEW_PASSWORD' | 'SUCCESS';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  onPasswordResetSuccess,
}) => {
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [activePreviewCode, setActivePreviewCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  // New Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Timers
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep('EMAIL');
      setEmail(initialEmail || '');
      setDigits(['', '', '', '', '', '']);
      setActivePreviewCode(null);
      setResetToken(null);
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setInfoNotice(null);
    }
  }, [isOpen, initialEmail]);

  // Main countdown timer (15 minutes) for OTP step
  useEffect(() => {
    if (!isOpen || step !== 'VERIFY_OTP' || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, step, secondsRemaining]);

  // Resend cooldown timer (60 seconds)
  useEffect(() => {
    if (!isOpen || step !== 'VERIFY_OTP' || resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, step, resendCooldown]);

  if (!isOpen) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Step 1: Submit email to request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid laboratory staff email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.forgotPassword(email.trim());
      if (res.simulation?.otp_code) {
        setActivePreviewCode(res.simulation.otp_code);
      }
      setSecondsRemaining(15 * 60);
      setResendCooldown(60);
      setDigits(['', '', '', '', '', '']);
      setStep('VERIFY_OTP');
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Could not find a registered account with this email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle OTP input
  const handleDigitChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = sanitized.slice(-1);
    setDigits(newDigits);
    setError(null);

    if (sanitized && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setDigits(newDigits);
    setError(null);

    const targetIdx = Math.min(pastedData.length, 5);
    inputRefs.current[targetIdx]?.focus();

    if (pastedData.length === 6) {
      handleVerifyOtp(pastedData);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || digits.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.verifyCode(email, fullCode, 'PASSWORD_RESET');
      setResetToken(res.reset_token || null);
      setStep('NEW_PASSWORD');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!activePreviewCode) return;
    navigator.clipboard.writeText(activePreviewCode.trim().slice(0, 6));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAutoFillOtp = () => {
    if (!activePreviewCode) return;
    const clean = activePreviewCode.trim().slice(0, 6);
    const newDigits = clean.split('');
    while (newDigits.length < 6) newDigits.push('');
    setDigits(newDigits);
    setError(null);
    handleVerifyOtp(clean);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    setInfoNotice(null);

    try {
      const res = await api.resendCode(email, 'PASSWORD_RESET');
      setResendCooldown(60);
      setSecondsRemaining(15 * 60);
      setDigits(['', '', '', '', '', '']);
      if (res.simulation?.otp_code) {
        setActivePreviewCode(res.simulation.otp_code);
      }
      setInfoNotice('A fresh 6-digit code has been dispatched to your email.');
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  // Step 3: Submit New Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.resetPassword({
        email,
        new_password: newPassword,
        reset_token: resetToken || undefined,
        code: digits.join(''),
      });
      setStep('SUCCESS');
      if (onPasswordResetSuccess) {
        onPasswordResetSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 px-6 py-5 text-white relative">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/20">
                Staff Account Security
              </span>
              <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">
                Reset Forgotten Password
              </h3>
            </div>
          </div>

          {/* Stepper indicators */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10 text-xs">
            <div
              className={`flex items-center gap-1 font-semibold ${
                step === 'EMAIL' ? 'text-blue-400' : 'text-slate-400'
              }`}
            >
              <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Email</span>
            </div>
            <span className="text-white/30">→</span>
            <div
              className={`flex items-center gap-1 font-semibold ${
                step === 'VERIFY_OTP' ? 'text-blue-400' : 'text-slate-400'
              }`}
            >
              <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Verify Code</span>
            </div>
            <span className="text-white/30">→</span>
            <div
              className={`flex items-center gap-1 font-semibold ${
                step === 'NEW_PASSWORD' || step === 'SUCCESS' ? 'text-blue-400' : 'text-slate-400'
              }`}
            >
              <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]">
                3
              </span>
              <span>New Password</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoNotice && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{infoNotice}</span>
            </div>
          )}

          {/* STEP 1: ENTER EMAIL */}
          {step === 'EMAIL' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <p className="text-xs text-slate-600 mb-3">
                  Enter your registered laboratory staff email address. We will dispatch a 6-digit
                  verification code to verify your identity.
                </p>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Staff Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. technician@calibtrack.lab"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="w-1/3"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-2/3"
                  disabled={isLoading || !email.trim()}
                  icon={isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                >
                  {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFY 6-DIGIT OTP */}
          {step === 'VERIFY_OTP' && (
            <div className="space-y-4">
              {activePreviewCode && (
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border border-indigo-200/80 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-indigo-900 font-semibold text-xs">
                      <Inbox className="w-4 h-4 text-indigo-600" />
                      <span>Lab Mailbox Backup</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-100/90 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                      <ShieldCheck className="w-3 h-3 text-indigo-600" />
                      Verified Code
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-indigo-100">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-slate-500 font-medium">OTP:</span>
                      <span className="font-mono text-2xl font-black text-indigo-950 tracking-widest selection:bg-indigo-200">
                        {activePreviewCode.trim().slice(0, 6)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="p-1.5 rounded-md text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                        title="Copy code to clipboard"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleAutoFillOtp}
                        className="px-2.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Auto-Fill</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug">
                    Dispatched to your email inbox. If your external email filter is delayed, use the auto-fill button above to activate immediately.
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-600 mb-3 text-center">
                  Enter the 6-digit verification code sent to <br />
                  <strong className="text-slate-900 font-mono">{email}</strong>
                </p>

                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={isLoading}
                      className={`w-11 h-13 text-center text-xl font-bold font-mono rounded-xl border transition-all outline-none ${
                        digit
                          ? 'border-blue-600 bg-blue-50/40 text-blue-900 ring-2 ring-blue-500/20'
                          : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Countdown & Resend Section */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Expires in:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatTimer(secondsRemaining)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isResending}
                  className={`font-semibold transition-colors flex items-center gap-1 ${
                    resendCooldown > 0 || isResending
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="w-1/3"
                  onClick={() => setStep('EMAIL')}
                  icon={<ArrowLeft className="w-3.5 h-3.5" />}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-2/3"
                  onClick={() => handleVerifyOtp()}
                  disabled={isLoading || digits.join('').length !== 6 || secondsRemaining <= 0}
                  icon={isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: SET NEW PASSWORD */}
          {step === 'NEW_PASSWORD' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verification successful! You can now set your new password.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                    className="w-full pl-9 pr-10 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    minLength={8}
                    className="w-full pl-9 pr-10 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="w-1/3"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-2/3"
                  disabled={isLoading || newPassword.length < 8 || !confirmPassword}
                  icon={isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                >
                  {isLoading ? 'Updating...' : 'Set New Password'}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'SUCCESS' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Password Updated Successfully
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Your password has been changed. You can now log in to CalibTrack with your new credentials.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                className="w-full mt-2"
                onClick={onClose}
              >
                Return to Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
