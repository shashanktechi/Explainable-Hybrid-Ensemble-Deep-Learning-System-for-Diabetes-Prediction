import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { apiForgotPassword, apiResetPassword } from '../services/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const requestCode = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await apiForgotPassword({ email });
      toast.success(response.data.message);
      setStep('reset');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not request a reset code. Try again later.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await apiResetPassword({ email, otp, new_password: password });
      toast.success('Password updated. You can now sign in.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'The code is invalid or expired.');
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setBusy(true);
    try {
      const response = await apiForgotPassword({ email });
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not request a new code. Try again later.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-navy-950">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <Link to="/" className="rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300">Home</Link>
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-accent-500/10 dark:bg-navy-900/80">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-400">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">Reset your password</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {step === 'request' ? 'Request a one-time code by email.' : 'If an account exists, a code was sent. Enter it below to choose a new password.'}
          </p>
        </div>

        {step === 'request' ? (
          <form onSubmit={requestCode} className="space-y-4">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100" htmlFor="reset-email">Email address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input id="reset-email" type="email" autoComplete="email" required className="form-input w-full pl-10" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <button type="submit" disabled={busy} className="btn-accent flex w-full items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset code'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-4">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100" htmlFor="reset-otp">Six-digit code</label>
            <input id="reset-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="form-input w-full text-center text-lg tracking-[0.4em]" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} />
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100" htmlFor="new-password">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className="form-input w-full" value={password} onChange={(event) => setPassword(event.target.value)} />
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100" htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className="form-input w-full" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            <button type="submit" disabled={busy || otp.length !== 6} className="btn-accent flex w-full items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
            </button>
            <button type="button" disabled={busy} onClick={resendCode} className="w-full text-sm font-medium text-accent-500 disabled:opacity-50">Resend code</button>
          </form>
        )}

        <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400"><ArrowLeft className="h-4 w-4" />Back to login</Link>
      </div>
    </div>
  );
}
