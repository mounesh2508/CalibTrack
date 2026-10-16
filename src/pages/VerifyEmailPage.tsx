import React, { useState, useEffect } from 'react';
import { FlaskConical, CheckCircle2, AlertCircle, Mail, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../components/common/Button';
import { api } from '../services/api';

interface VerifyEmailPageProps {
  onNavigate: (path: string) => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onNavigate }) => {
  const [token, setToken] = useState<string>('');
  const [resendEmail, setResendEmail] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  // Read ?token= parameter from URL on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setToken(urlToken);
        handleVerifyToken(urlToken);
      }
    } catch (e) {
      console.error('Error parsing verification URL:', e);
    }
  }, []);

  const handleVerifyToken = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) {
      setErrorMessage('Please provide a valid verification token.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const clean = tokenToVerify.trim();
      if (/^\d{6}$/.test(clean) && (resendEmail.trim() || verifiedEmail)) {
        const res = await api.verifyCode(resendEmail.trim() || (verifiedEmail as string), clean, 'REGISTRATION');
        setVerifiedEmail(res.email);
        setSuccessMessage(res.message || 'Your email address has been verified successfully!');
      } else {
        const res = await api.verifyEmail(clean);
        setVerifiedEmail(res.email);
        setSuccessMessage(res.message || 'Your email address has been verified successfully!');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification code or token is invalid or has expired.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setIsResending(true);
    setResendNotice(null);
    setErrorMessage(null);

    try {
      const res = await api.resendCode(resendEmail.trim(), 'REGISTRATION');
      const msg = res.message || 'Verification code sent. Please check your inbox.';
      setResendNotice(msg);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Grid */}
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
            Staff Email Verification
          </p>
        </div>

        {/* Verification Card */}
        <div className="mt-8 bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xs">
          {isVerifying ? (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
              <h3 className="text-base font-semibold text-white">Verifying Account Token</h3>
              <p className="text-xs text-slate-400 mt-2">
                Validating your cryptographic laboratory credentials with the portal...
              </p>
            </div>
          ) : successMessage ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 mb-4">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Email Verified!</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {successMessage}
              </p>
              {verifiedEmail && (
                <div className="my-4 py-2 px-3 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-blue-300 font-mono">
                  {verifiedEmail}
                </div>
              )}
              <Button
                variant="primary"
                size="lg"
                className="w-full mt-4 h-11 text-sm font-semibold"
                onClick={() => onNavigate('/login')}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Proceed to Sign In
              </Button>
            </div>
          ) : (
            <div>
              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Verification Notice</strong>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {resendNotice && (
                <div className="mb-5 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{resendNotice}</span>
                </div>
              )}

              {/* Manual Token Verification Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Verification Token
                  </label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste your 32-character token here..."
                    className="w-full h-10 px-3 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  />
                </div>

                <Button
                  variant="primary"
                  size="md"
                  className="w-full h-10 text-xs font-semibold"
                  onClick={() => handleVerifyToken(token)}
                  disabled={!token.trim()}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Confirm Verification Token
                </Button>
              </div>

              {/* Resend Section */}
              <div className="mt-6 pt-6 border-t border-slate-700/80">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Need a new verification link?</span>
                </h4>
                <p className="text-[11px] text-slate-400 mb-3">
                  Enter your registered staff email address to receive a fresh single-use verification link:
                </p>

                <form onSubmit={handleResend} className="space-y-3">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="staff@laboratory.com"
                      required
                      className="w-full h-10 pl-9 pr-3 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="w-full h-9 text-xs"
                    isLoading={isResending}
                    disabled={!resendEmail.trim()}
                  >
                    Resend Verification Email
                  </Button>
                </form>
              </div>

              {/* Back to Login */}
              <div className="mt-6 pt-4 border-t border-slate-700/60 text-center">
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
