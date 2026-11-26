import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, ArrowLeft, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { apiResendVerification, apiVerifyEmail } from '../services/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  const verify = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await apiVerifyEmail({ email, otp });
      toast.success('Email verified. You can now sign in.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'The code is invalid or expired.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    try {
      const response = await apiResendVerification({ email });
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not resend a code. Try again later.');
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
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">Verify your email</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Enter the six-digit code sent to your inbox.</p>
        </div>
        <form onSubmit={verify} className="space-y-4">
          <label className="block text-sm font-medium text-slate-900 dark:text-slate-100" htmlFor="verify-email">Email address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="verify-email" type="email" autoComplete="email" required className="form-input w-full pl-10" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <label className="block text-sm font-medium text-slate-900 dark:text-slate-100" htmlFor="verify-otp">Verification code</label>
          <input id="verify-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="form-input w-full text-center text-lg tracking-[0.4em]" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} />
          <button type="submit" disabled={busy || otp.length !== 6} className="btn-accent flex w-full items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify email'}
          </button>
        </form>
        <button type="button" disabled={busy || !email} onClick={resend} className="mt-4 w-full text-sm font-medium text-accent-500 disabled:opacity-50">Resend code</button>
        <Link to="/register" className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400"><ArrowLeft className="h-4 w-4" />Back to sign up</Link>
      </div>
    </div>
  );
}
