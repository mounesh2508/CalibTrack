import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Mail,
  AlertCircle,
  RefreshCw,
  X,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../common/Button';
import { api } from '../../services/api';

export interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  type?: 'REGISTRATION' | 'PASSWORD_RESET';
  simulationCode?: string | null;
  onSuccess: (data: { reset_token?: string; user?: any; email: string }) => void;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  onClose,
  email,
  type = 'REGISTRATION',
  simulationCode,
  onSuccess,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [activePreviewCode, setActivePreviewCode] = useState<string | null>(simulationCode || null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60); // 15 minutes
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update preview code if prop changes
  useEffect(() => {
    if (simulationCode) {
      setActivePreviewCode(simulationCode);
    }
  }, [simulationCode]);

  // Focus first input on open
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setError(null);
      setInfoNotice(null);
      setSecondsRemaining(15 * 60);
      setResendCooldown(60);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Main countdown timer (15 minutes)
  useEffect(() => {
    if (!isOpen || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, secondsRemaining]);

  // Resend cooldown timer (60 seconds)
  useEffect(() => {
    if (!isOpen || resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, resendCooldown]);

  if (!isOpen) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, '');

    // Single digit input
    const newDigits = [...digits];
    newDigits[index] = sanitized.slice(-1);
    setDigits(newDigits);
    setError(null);

    // Auto-advance
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

    // Focus last filled or next
    const targetIdx = Math.min(pastedData.length, 5);
    inputRefs.current[targetIdx]?.focus();

    // If complete, trigger verify immediately
    if (pastedData.length === 6) {
      submitVerification(pastedData);
    }
  };

  const submitVerification = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || digits.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    if (secondsRemaining <= 0) {
      setError('Verification code has expired. Please request a new code.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const res = await api.verifyCode(email, fullCode, type);
      onSuccess({
        reset_token: res.reset_token,
        user: res.user,
        email,
      });
    } catch (err: any) {
      setError(err.message || 'Incorrect verification code. Please check and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAutoFill = () => {
    if (!activePreviewCode) return;
    const clean = activePreviewCode.trim().slice(0, 6);
    const newDigits = clean.split('');
    while (newDigits.length < 6) newDigits.push('');
    setDigits(newDigits);
    setError(null);
    submitVerification(clean);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    setInfoNotice(null);

    try {
      const res = await api.resendCode(email, type);
      setResendCooldown(60);
      setSecondsRemaining(15 * 60);
      setDigits(['', '', '', '', '', '']);
      if (res.simulation?.otp_code) {
        setActivePreviewCode(res.simulation.otp_code);
      }
      setInfoNotice('A fresh 6-digit code has been sent to your email.');
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again shortly.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 text-white relative">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded text-white">
                {type === 'PASSWORD_RESET' ? 'Password Recovery' : 'Staff Verification'}
              </span>
              <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">
                Enter Verification Code
              </h3>
            </div>
          </div>
          <p className="text-xs text-blue-100 mt-2 leading-relaxed">
            We sent a 6-digit verification code to{' '}
            <strong className="text-white font-mono">{email}</strong> through Gmail.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{infoNotice}</span>
            </div>
          )}

          {/* 6 Digit Inputs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 text-center">
              Type 6-Digit Code
            </label>
            <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
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
                  disabled={isVerifying}
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
              <span>Code expires in:</span>
              <span className="font-mono font-bold text-slate-800">
                {formatTimer(secondsRemaining)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleResend}
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

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-1/3"
              onClick={onClose}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-2/3"
              onClick={() => submitVerification()}
              disabled={isVerifying || digits.join('').length !== 6 || secondsRemaining <= 0}
              icon={isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            >
              {isVerifying ? 'Verifying Code...' : 'Confirm & Activate'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
