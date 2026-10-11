import React, { useState } from 'react';
import { FlaskConical, ShieldCheck, Lock, Mail, User, ArrowRight, AlertCircle, Info } from 'lucide-react';
import { Button } from '../components/common/Button';
import { api } from '../services/api';
import { AuthUser } from '../types';

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
  sessionNotice?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, sessionNotice }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@calibtrack-lab.com');
  const [password, setPassword] = useState('AdminPass123!');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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

        const session = await api.register(name, email, password);
        onLogin(session.user);
      } else {
        const session = await api.login(email, password);
        onLogin(session.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
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
              }}
              className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
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
              }}
              className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                isRegisterMode
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Register Staff
            </button>
          </div>

          {/* Session Expiry or Custom Notice */}
          {sessionNotice && !error && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{sessionNotice}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
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
                {!isRegisterMode && (
                  <span className="text-[11px] text-slate-400">Min 8 chars</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full h-10 pl-9 pr-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
              </div>
            </div>

            {isRegisterMode && (
              <p className="text-[11px] text-slate-400 leading-relaxed">
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
          <div className="mt-6 pt-4 border-t border-slate-700/60 text-center">
            <p className="text-xs text-slate-400">
              Lab Staff Portal · JWT Token Bearer Authentication
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Accredited Metrology & Calibration Management</span>
        </div>
      </div>
    </div>
  );
};
