import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiForgotPassword } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

const pageTransition = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.3, ease: 'easeIn' } },
};

const cardContentVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: 'easeIn' } },
};

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data) => {
    try {
      await apiForgotPassword(data);
      setSubmitted(true);
      toast.success('Reset link sent! Check your inbox.');
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        'Something went wrong. Please try again.';
      toast.error(message);
    }
  };

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-12 dark:bg-navy-950"
    >
      {/* Gradient mesh background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-accent-500/10 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-accent-400/10 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500/5 blur-[100px]" />
      </div>

      {/* Theme toggle + Home link */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <Link
          to="/"
          className="px-3 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-navy-800 transition-colors"
        >
          Home
        </Link>
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-accent-500/10 dark:bg-navy-900/80 dark:shadow-2xl sm:p-10">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-400 shadow-lg shadow-accent-500/25">
              <Activity className="h-7 w-7 text-white" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!submitted ? (
              /* ── Request Form ── */
              <motion.div
                key="form"
                variants={cardContentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div className="mb-6 text-center">
                  <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Reset Your Password
                  </h1>
                  <p className="mt-2 font-body text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    Enter your email address and we&apos;ll send you a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="forgot-email"
                      className="mb-1.5 block font-body text-sm font-medium text-slate-900 dark:text-slate-100"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        aria-invalid={errors.email ? 'true' : 'false'}
                        aria-describedby={errors.email ? 'forgot-email-error' : undefined}
                        className="form-input w-full pl-10"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p
                        id="forgot-email-error"
                        role="alert"
                        className="mt-1.5 text-xs text-red-500"
                      >
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-accent flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        <span>Sending…</span>
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </form>

                {/* Back to login */}
                <div className="mt-6 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 font-body text-sm font-medium text-accent-500 transition-colors hover:text-accent-400"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Link>
                </div>
              </motion.div>
            ) : (
              /* ── Success State ── */
              <motion.div
                key="success"
                variants={cardContentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center text-center"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-500/10">
                  <CheckCircle2 className="h-8 w-8 text-accent-500" />
                </div>

                <h2 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
                  Check Your Inbox
                </h2>
                <p className="mt-2 font-body text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  We&apos;ve sent a password reset link to your email address. Please check your
                  inbox and follow the instructions to reset your password.
                </p>

                <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-navy-800">
                  <Mail className="h-6 w-6 text-accent-500" />
                </div>

                <Link
                  to="/login"
                  className="btn-accent mt-8 inline-flex w-full items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
