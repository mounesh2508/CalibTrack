import React, { useState } from 'react';
import {
  FlaskConical,
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { api } from '../services/api';
import { AuthUser } from '../types';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';
import { OtpVerificationModal } from '../components/auth/OtpVerificationModal';

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
  sessionNotice?: string | null;
  onNavigate?: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, sessionNotice, onNavigate }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('asokanmounesh@gmail.com');
  const [password, setPassword] = useState('a.MOUNESH14');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);

  // OTP Verification & Forgot Password Modals
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [pendingOtpEmail, setPendingOtpEmail] = useState('');
  const [simulationOtpCode, setSimulationOtpCode] = useState<string | null>(null);

  const [simulationData, setSimulationData] = useState<{
    mode?: string;
    message?: string;
    verification_token?: string;
    verification_url?: string;
    otp_code?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setIsUnverified(false);
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        if (!name.trim()) {
          setError('Please provide your full staff name.');
          setIsLoading(false);
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters long.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please verify both password fields.');
          setIsLoading(false);
          return;
        }

        const regRes = await api.register(name, email, password);
        setConfirmPassword('');
        setPendingOtpEmail(email);
        const otpCode = regRes.simulation?.otp_code || null;
        setSimulationOtpCode(otpCode);
        if (regRes.simulation) {
          setSimulationData(regRes.simulation);
        }
        // Immediately open 6-digit OTP verification modal
        setIsOtpModalOpen(true);
        setSuccessNotice('Staff registration initiated. Please enter the 6-digit verification code sent to your email.');
      } else {
        const session = await api.login(email, password);
        onLogin(session.user);
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please verify your credentials.';
      setError(msg);
      if (msg.toLowerCase().includes('verif')) {
        setIsUnverified(true);
        setPendingOtpEmail(email);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendFromLogin = async () => {
    if (!email.trim()) return;
    setIsResending(true);
    try {
      const res = await api.resendVerification(email);
      setSuccessNotice(res.message || 'A fresh verification link has been sent to your email.');
      if (res.simulation) {
        setSimulationData(res.simulation);
      }
      setIsUnverified(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Subtle Technical Metrology Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <FlaskConical className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            CALIBTRACK
          </h2>
          <p className="mt-1 text-xs text-slate-400 font-medium tracking-wider uppercase">
            Laboratory Calibration Management
          </p>
        </div>

        {/* Auth Card */}
        <div className="mt-8 bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xs">
          {/* Mode Switch Tabs */}
          <div className="flex border-b border-slate-700/80 mb-5">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setError(null);
                setConfirmPassword('');
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
              className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px cursor-pointer ${
                !isRegisterMode
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setError(null);
                setConfirmPassword('');
                setShowPassword(false);
                setShowConfirmPassword(false);
                // Clear prefilled admin credentials when switching to register fresh staff
                if (
                  email === 'asokanmounesh@gmail.com' ||
                  email === 'admin@calibtrack-lab.com'
                ) {
                  setEmail('');
                  setPassword('');
                }
              }}
              className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px cursor-pointer ${
                isRegisterMode
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Register Staff
            </button>
          </div>

          {/* Success Notice */}
          {successNotice && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 space-y-2">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Registration Update</strong>
                  <span>{successNotice}</span>
                </div>
              </div>
              {simulationData && simulationData.verification_url && (
                <div className="p-2.5 rounded bg-slate-900/80 border border-emerald-500/20 text-[11px] space-y-1.5 text-slate-300">
                  <span className="font-semibold text-emerald-300 block">Development Simulation Preview:</span>
                  <p className="text-slate-400">SMTP is unconfigured; use this simulated verification link to activate your account:</p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const path = simulationData.verification_url!.replace(/^https?:\/\/[^/]+/, '');
                        if (onNavigate) {
                          onNavigate(path);
                        } else {
                          window.location.href = simulationData.verification_url!;
                        }
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Verify Account Now →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Session Expiry or Custom Notice */}
          {sessionNotice && !error && !successNotice && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{sessionNotice}</span>
            </div>
          )}

          {/* Error Banner with Unverified Email Action */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Authentication Notice</strong>
                  <span>{error}</span>
                </div>
              </div>

              {isUnverified && (
                <div className="pt-2 border-t border-rose-500/20 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="text-[11px] h-7 px-2.5 bg-blue-600 hover:bg-blue-500 text-white"
                    onClick={() => {
                      setPendingOtpEmail(email);
                      setIsOtpModalOpen(true);
                    }}
                  >
                    Enter 6-Digit Code
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-7 px-2.5 bg-rose-950/40 text-rose-200 border-rose-700/60 hover:bg-rose-900/60"
                    isLoading={isResending}
                    onClick={handleResendFromLogin}
                  >
                    Resend Code
                  </Button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Full Staff Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Alexander Wright"
                    required
                    className="w-full h-10 pl-9 pr-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@laboratory.com"
                  required
                  className="w-full h-10 pl-9 pr-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-slate-400">Min 8 chars</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full h-10 pl-9 pr-10 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors font-mono tracking-tight"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer p-0.5 rounded transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {!isRegisterMode && (
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setIsForgotPasswordOpen(true);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {isRegisterMode && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Confirm Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className={`w-full h-10 pl-9 pr-10 text-sm bg-slate-900 border rounded-lg text-white placeholder:text-slate-500 focus:outline-none transition-colors font-mono tracking-tight ${
                      confirmPassword.length > 0
                        ? password === confirmPassword
                          ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                          : 'border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                        : 'border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer p-0.5 rounded transition-colors"
                    aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                    title={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Real-Time Password Matching Status */}
                {confirmPassword.length > 0 ? (
                  password === confirmPassword ? (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Passwords match perfectly</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-400 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Passwords do not match</span>
                    </div>
                  )
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">Re-enter your chosen password to verify.</p>
                )}
              </div>
            )}

            {isRegisterMode && (
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                Registered staff accounts default to <strong>Technician (Lab Staff)</strong> role.
                Administrator privileges are granted by system administrators.
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-4 h-11 text-sm font-semibold"
              isLoading={isLoading}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              {isRegisterMode ? 'Create Staff Account' : 'Sign In to CalibTrack'}
            </Button>
          </form>

          {/* Quick Credential Hint */}
          <div className="mt-6 pt-4 border-t border-slate-700/60 text-center space-y-2">
            <p className="text-xs text-slate-400">
              Lab Staff Portal · JWT Token Bearer Authentication
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80 text-[11px] text-slate-300">
              <span className="font-semibold text-blue-400">Admin Account:</span>
              <span className="font-mono text-slate-200">asokanmounesh@gmail.com</span>
              <span className="text-slate-500">|</span>
              <span className="font-mono text-slate-200">a.MOUNESH14</span>
              <button
                type="button"
                onClick={() => {
                  setEmail('asokanmounesh@gmail.com');
                  setPassword('a.MOUNESH14');
                }}
                className="ml-1 text-[10px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
              >
                Auto-fill
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Accredited Metrology & Calibration Management</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <ForgotPasswordModal
          isOpen={true}
          onClose={() => setIsForgotPasswordOpen(false)}
          initialEmail={email}
          onPasswordResetSuccess={() => {
            setSuccessNotice('Password reset successfully! You can now log in with your new credentials.');
            setIsForgotPasswordOpen(false);
          }}
        />
      )}

      {/* Staff Registration OTP Verification Modal */}
      {isOtpModalOpen && (
        <OtpVerificationModal
          isOpen={true}
          onClose={() => setIsOtpModalOpen(false)}
          email={pendingOtpEmail || email}
          type="REGISTRATION"
          simulationCode={simulationOtpCode}
          onSuccess={(data) => {
            setIsOtpModalOpen(false);
            setIsRegisterMode(false);
            setIsUnverified(false);
            const verifiedEmail = pendingOtpEmail || email;
            setEmail(verifiedEmail);
            setSuccessNotice('Staff email verified successfully! Your account is active and you can now log in.');
            if (data.user && data.user.id) {
              onLogin(data.user);
            }
          }}
        />
      )}
    </div>
  );
};
