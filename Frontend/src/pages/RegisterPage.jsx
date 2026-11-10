import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Activity,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Building2,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Full name must be at least 2 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/\d/, 'Password must contain at least one number'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
    hospital_name: z.string().optional(),
    role: z.enum(['doctor', 'admin'], {
      error: 'Please select a role',
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

const pageTransition = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.3, ease: 'easeIn' } },
};

function getPasswordStrength(password) {
  if (!password) return { label: '', level: 0, color: '' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return { label: 'Weak', level: 1, color: 'bg-red-500' };
  }
  if (score <= 3) {
    return { label: 'Medium', level: 2, color: 'bg-risk-moderate' };
  }
  return { label: 'Strong', level: 3, color: 'bg-risk-low' };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, register: registerAccount, loading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirm_password: '',
      hospital_name: '',
      role: '',
    },
  });

  const watchedPassword = watch('password');
  const strength = useMemo(() => getPasswordStrength(watchedPassword), [watchedPassword]);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const onSubmit = async (data) => {
    try {
      const { confirm_password, ...payload } = data;
      if (!payload.hospital_name) {
        delete payload.hospital_name;
      }
      await registerAccount(payload);
      toast.success('Account created successfully! Please sign in.');
      navigate('/login', { replace: true });
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        'Registration failed. Please try again.';
      toast.error(message);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-navy-950">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

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
            <div className="text-center">
              <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">
                Create Account
              </h1>
              <p className="mt-1 font-body text-sm text-slate-600 dark:text-slate-400">
                Join XAI-HEDL to start predicting
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="reg-full-name"
                className="mb-1.5 block font-body text-sm font-medium text-slate-900 dark:text-slate-100"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  id="reg-full-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Dr. Jane Smith"
                  aria-invalid={errors.full_name ? 'true' : 'false'}
                  aria-describedby={errors.full_name ? 'reg-name-error' : undefined}
                  className="form-input w-full pl-10"
                  {...register('full_name')}
                />
              </div>
              {errors.full_name && (
                <p id="reg-name-error" role="alert" className="mt-1.5 text-xs text-red-500">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="reg-email"
                className="mb-1.5 block font-body text-sm font-medium text-slate-900 dark:text-slate-100"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'reg-email-error' : undefined}
                  className="form-input w-full pl-10"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p id="reg-email-error" role="alert" className="mt-1.5 text-xs text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="reg-password"
                className="mb-1.5 block font-body text-sm font-medium text-slate-900 dark:text-slate-100"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={
                    [errors.password && 'reg-password-error', 'password-strength']
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                  className="form-input w-full pl-10 pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="reg-password-error" role="alert" className="mt-1.5 text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}

              {/* Password strength indicator */}
              {watchedPassword && (
                <div id="password-strength" className="mt-2" aria-live="polite">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-body text-xs text-slate-500 dark:text-slate-400">
                      Password strength
                    </span>
                    <span
                      className={`font-body text-xs font-semibold ${
                        strength.level === 1
                          ? 'text-red-500'
                          : strength.level === 2
                            ? 'text-risk-moderate'
                            : 'text-risk-low'
                      }`}
                    >
                      {strength.label}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          step <= strength.level ? strength.color : 'bg-slate-200 dark:bg-navy-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="reg-confirm-password"
                className="mb-1.5 block font-body text-sm font-medium text-slate-900 dark:text-slate-100"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  id="reg-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={errors.confirm_password ? 'true' : 'false'}
                  aria-describedby={errors.confirm_password ? 'reg-confirm-error' : undefined}
                  className="form-input w-full pl-10 pr-10"
                  {...register('confirm_password')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
              {errors.confirm_password && (
                <p id="reg-confirm-error" role="alert" className="mt-1.5 text-xs text-red-500">
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            {/* Hospital Name */}
            <div>
              <label
                htmlFor="reg-hospital"
                className="mb-1.5 block font-body text-sm font-medium text-slate-900 dark:text-slate-100"
              >
                Hospital / Organization{' '}
                <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  id="reg-hospital"
                  type="text"
                  autoComplete="organization"
                  placeholder="General Hospital"
                  className="form-input w-full pl-10"
                  {...register('hospital_name')}
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label
                htmlFor="reg-role"
                className="mb-1.5 block font-body text-sm font-medium text-slate-900 dark:text-slate-100"
              >
                Role
              </label>
              <div className="relative">
                <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <select
                  id="reg-role"
                  aria-invalid={errors.role ? 'true' : 'false'}
                  aria-describedby={errors.role ? 'reg-role-error' : undefined}
                  className="form-input w-full appearance-none pl-10 pr-10"
                  defaultValue=""
                  {...register('role')}
                >
                  <option value="" disabled>
                    Select your role
                  </option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {errors.role && (
                <p id="reg-role-error" role="alert" className="mt-1.5 text-xs text-red-500">
                  {errors.role.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-accent mt-2 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Creating account…</span>
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center font-body text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-accent-500 transition-colors hover:text-accent-400"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
