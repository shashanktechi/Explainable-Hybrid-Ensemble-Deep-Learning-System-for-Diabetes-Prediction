import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  Settings2,
  User,
  Mail,
  Building2,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Palette,
  Moon,
  Sun,
  LogOut,
  Loader2,
  KeyRound,
  Monitor,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiChangePassword } from '../services/api';
import toast from 'react-hot-toast';

// ── Zod Schema ──
const changePasswordSchema = z
  .object({
    current_password: z
      .string()
      .min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'New password must be at least 8 characters'),
    confirm_new_password: z
      .string()
      .min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: 'Passwords do not match',
    path: ['confirm_new_password'],
  });

// ── Section Header ──
function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4.5 h-4.5 text-accent-500" />
        <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
      </div>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 ml-[26px]">
          {description}
        </p>
      )}
    </div>
  );
}

// ── Profile Section ──
function ProfileSection({ user }) {
  const fields = [
    { label: 'Full Name', value: user?.full_name || '—', icon: User },
    { label: 'Email', value: user?.email || '—', icon: Mail },
    { label: 'Role', value: user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '—', icon: Shield },
    { label: 'Hospital', value: user?.hospital_name || '—', icon: Building2 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="elevated-card p-5 sm:p-6"
    >
      <SectionHeader
        icon={User}
        title="Profile Information"
        description="Your account details (read-only)"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {fields.map(({ label, value, icon: FieldIcon }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-navy-800 flex items-center justify-center flex-shrink-0">
              <FieldIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium mb-0.5">
                {label}
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Change Password Section ──
function ChangePasswordSection() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_new_password: '',
    },
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await apiChangePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast.success('Password updated successfully!');
      reset();
    } catch (err) {
      const message =
        err.response?.data?.detail || 'Failed to update password. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const passwordFields = [
    {
      name: 'current_password',
      label: 'Current Password',
      placeholder: 'Enter your current password',
      show: showCurrent,
      toggle: () => setShowCurrent(!showCurrent),
    },
    {
      name: 'new_password',
      label: 'New Password',
      placeholder: 'Minimum 8 characters',
      show: showNew,
      toggle: () => setShowNew(!showNew),
    },
    {
      name: 'confirm_new_password',
      label: 'Confirm New Password',
      placeholder: 'Re-enter your new password',
      show: showConfirm,
      toggle: () => setShowConfirm(!showConfirm),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="elevated-card p-5 sm:p-6"
    >
      <SectionHeader
        icon={KeyRound}
        title="Change Password"
        description="Update your account password"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        {passwordFields.map(({ name, label, placeholder, show, toggle }) => (
          <div key={name}>
            <label
              htmlFor={name}
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {label}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                id={name}
                type={show ? 'text' : 'password'}
                placeholder={placeholder}
                {...register(name)}
                className={`form-input pl-10 pr-10 w-full ${
                  errors[name] ? 'form-input-error' : ''
                }`}
                autoComplete={name === 'current_password' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={toggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600
                  dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors[name] && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                {errors[name].message}
              </p>
            )}
          </div>
        ))}

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn-accent flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Update Password
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

// ── Appearance Section ──
function AppearanceSection() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="elevated-card p-5 sm:p-6"
    >
      <SectionHeader
        icon={Palette}
        title="Appearance"
        description="Customize the look and feel of the application"
      />

      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-navy-800/50 border border-slate-100 dark:border-navy-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 flex items-center justify-center">
            {isDark ? (
              <Moon className="w-5 h-5 text-accent-400" />
            ) : (
              <Sun className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isDark
                ? 'Using dark color scheme optimized for low-light environments'
                : 'Using light color scheme optimized for daylight use'}
            </p>
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer items-center rounded-full
            transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2
            focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white
            dark:focus-visible:ring-offset-navy-950"
          style={{
            backgroundColor: isDark ? 'var(--color-accent-500)' : '#CBD5E1',
            width: '3.25rem',
          }}
          role="switch"
          aria-checked={isDark}
          aria-label="Toggle dark mode"
        >
          <span
            className="pointer-events-none inline-flex h-5 w-5 items-center justify-center rounded-full
              bg-white shadow-md transform transition-transform duration-300 ease-in-out"
            style={{
              transform: isDark ? 'translateX(1.625rem)' : 'translateX(0.25rem)',
            }}
          >
            {isDark ? (
              <Moon className="w-3 h-3 text-accent-600" />
            ) : (
              <Sun className="w-3 h-3 text-amber-500" />
            )}
          </span>
        </button>
      </div>

      {/* Preview cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div
          className={`p-3 rounded-lg border-2 transition-colors cursor-pointer ${
            !isDark
              ? 'border-accent-500 bg-white'
              : 'border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 opacity-60'
          }`}
          onClick={() => isDark && toggleTheme()}
          role="button"
          aria-label="Switch to light mode"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-700">Light</span>
          </div>
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded bg-slate-200" />
            <div className="h-2 w-3/4 rounded bg-slate-200" />
            <div className="h-2 w-1/2 rounded bg-slate-200" />
          </div>
        </div>

        <div
          className={`p-3 rounded-lg border-2 transition-colors cursor-pointer ${
            isDark
              ? 'border-accent-500 bg-navy-900'
              : 'border-slate-200 bg-slate-800 opacity-60'
          }`}
          onClick={() => !isDark && toggleTheme()}
          role="button"
          aria-label="Switch to dark mode"
        >
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-4 h-4 text-accent-400" />
            <span className="text-xs font-semibold text-slate-300">Dark</span>
          </div>
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded bg-navy-700" />
            <div className="h-2 w-3/4 rounded bg-navy-700" />
            <div className="h-2 w-1/2 rounded bg-navy-700" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Account Section ──
function AccountSection() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const handleLogout = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    logout();
    navigate('/login', { replace: true });
    toast.success('Logged out successfully.');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="elevated-card p-5 sm:p-6"
    >
      <SectionHeader
        icon={Monitor}
        title="Account"
        description="Manage your account session"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-0.5">
            Sign Out
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {confirming
              ? 'Are you sure? Click again to confirm.'
              : 'End your current session and return to the login page.'}
          </p>
        </div>

        <button
          onClick={handleLogout}
          onBlur={() => setConfirming(false)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex-shrink-0 cursor-pointer ${
            confirming
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-md'
              : 'bg-transparent text-red-600 dark:text-red-400 border-[1.5px] border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/40'
          }`}
        >
          <LogOut className="w-4 h-4" />
          {confirming ? 'Confirm Logout' : 'Logout'}
        </button>
      </div>
    </motion.div>
  );
}

// ── Main SettingsPage ──
export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
    >
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center shadow-md shadow-accent-500/20">
          <Settings2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your profile, security, and preferences
          </p>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="space-y-6">
        <ProfileSection user={user} />
        <ChangePasswordSection />
        <AppearanceSection />
        <AccountSection />
      </div>
    </motion.div>
  );
}
