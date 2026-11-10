import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Stethoscope,
  Calendar,
  ArrowRight,
  Activity,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiGetDashboardStats } from '../services/api';

// ── Animated Counter Hook ──
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (target == null || target === 0) {
      setCount(0);
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);

      setCount(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return count;
}

// ── Skeleton Components ──
function CardSkeleton() {
  return (
    <div className="elevated-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-10 w-10 rounded-lg" />
        <div className="skeleton h-4 w-20 rounded" />
      </div>
      <div className="skeleton h-8 w-24 rounded mb-2" />
      <div className="skeleton h-4 w-32 rounded" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="elevated-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="skeleton h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="skeleton h-4 w-40 rounded" />
                <div className="skeleton h-3 w-24 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-4 w-12 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Stat Card Component ──
function StatCard({ icon: Icon, label, value, iconBgClass, iconColorClass, index }) {
  const animatedValue = useCountUp(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.34, 1.56, 0.64, 1] }}
      className="elevated-card p-6 group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${iconBgClass}`}>
          <Icon className={`w-5 h-5 ${iconColorClass}`} />
        </div>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-3xl font-heading font-bold text-slate-900 dark:text-slate-100">
        {animatedValue}
      </p>
    </motion.div>
  );
}

// ── Risk Badge ──
function RiskBadge({ predictedClass, riskBand }) {
  const badgeConfig = {
    High: { cls: 'badge-high', icon: AlertTriangle },
    Moderate: { cls: 'badge-moderate', icon: AlertCircle },
    Low: { cls: 'badge-low', icon: ShieldCheck },
  };

  const config = badgeConfig[riskBand] || badgeConfig.Low;
  const Icon = config.icon;

  return (
    <span className={`badge ${config.cls}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{predictedClass || riskBand}</span>
    </span>
  );
}

// ── Empty State ──
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="elevated-card p-12 text-center"
    >
      <div className="mx-auto w-16 h-16 rounded-full bg-accent-500/10 flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-accent-500" />
      </div>
      <h3 className="text-lg font-heading font-semibold text-slate-900 dark:text-slate-100 mb-2">
        No predictions yet
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
        Start by running your first diabetes risk assessment. It only takes a few minutes.
      </p>
      <Link
        to="/predict"
        className="btn-accent inline-flex items-center gap-2 text-sm"
      >
        <Stethoscope className="w-4 h-4" />
        New Prediction
      </Link>
    </motion.div>
  );
}

// ── Format Date Helper ──
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFullDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── Page Transition Variants ──
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

// ── Main Dashboard Page ──
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        setLoading(true);
        setError(null);
        const res = await apiGetDashboardStats();
        if (!cancelled) {
          setStats(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail || 'Failed to load dashboard data. Please try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const today = formatFullDate(new Date());

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="min-h-screen"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ── Welcome Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 dark:text-slate-100">
                Welcome back, Dr. {user?.full_name?.replace(/^Dr\.?\s*/i, '') || 'User'}{' '}
                <span className="inline-block animate-[wave_1.8s_ease-in-out_infinite] origin-[70%_70%]" role="img" aria-label="wave">
                  👋
                </span>
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {today}
              </p>
            </div>
            <Link
              to="/predict"
              className="btn-accent inline-flex items-center gap-2 text-sm self-start sm:self-center"
            >
              <Stethoscope className="w-4 h-4" />
              New Prediction
            </Link>
          </div>
        </motion.div>

        {/* ── Error State ── */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="elevated-card p-4 mb-6 border-l-4 border-red-500"
          >
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm font-medium text-accent-500 hover:text-accent-400 transition-colors"
            >
              Try again
            </button>
          </motion.div>
        )}

        {/* ── Stat Cards ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : stats ? (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8"
          >
            <StatCard
              icon={Users}
              label="Total Patients"
              value={stats.total_patients}
              iconBgClass="bg-accent-500/10 dark:bg-accent-500/15"
              iconColorClass="text-accent-500"
              index={0}
            />
            <StatCard
              icon={TrendingUp}
              label="Predictions This Week"
              value={stats.predictions_this_week}
              iconBgClass="bg-accent-400/10 dark:bg-accent-400/15"
              iconColorClass="text-accent-600 dark:text-accent-400"
              index={1}
            />
            <StatCard
              icon={AlertTriangle}
              label="High Risk Alerts"
              value={stats.high_risk_count}
              iconBgClass="bg-risk-high/10 dark:bg-risk-high/15"
              iconColorClass="text-risk-high"
              index={2}
            />
          </motion.div>
        ) : null}

        {/* ── Recent Activity ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-heading font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent-500" />
              Recent Activity
            </h2>
            {stats?.recent_predictions?.length > 0 && (
              <Link
                to="/history"
                className="text-sm font-medium text-accent-500 hover:text-accent-400 transition-colors flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {loading ? (
            <TableSkeleton />
          ) : stats?.recent_predictions?.length > 0 ? (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {stats.recent_predictions.map((prediction, index) => (
                <motion.div
                  key={prediction.prediction_id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.4 + index * 0.08,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/result/${prediction.prediction_id}`)}
                    className="w-full text-left elevated-card p-4 sm:p-5 cursor-pointer transition-all duration-200 hover:shadow-glow focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-navy-950"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left side: Patient info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-500/10 dark:bg-accent-500/15 flex items-center justify-center">
                          <span className="text-sm font-semibold text-accent-600 dark:text-accent-400">
                            {(prediction.patient_name || prediction.patient_code || '?')
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {prediction.patient_name || prediction.patient_code || 'Unknown Patient'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {prediction.patient_code || '—'}
                          </p>
                        </div>
                      </div>

                      {/* Right side: Badge, score, date */}
                      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 pl-13 sm:pl-0">
                        <RiskBadge
                          predictedClass={prediction.predicted_class}
                          riskBand={prediction.risk_band}
                        />
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {prediction.risk_score}%
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            risk score
                          </p>
                        </div>
                        <div className="hidden sm:block text-right min-w-[90px]">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(prediction.created_at)}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 hidden sm:block" />
                      </div>
                    </div>

                    {/* Mobile date */}
                    <div className="sm:hidden mt-2 pl-13">
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {formatDate(prediction.created_at)}
                      </p>
                    </div>
                  </button>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <EmptyState />
          )}
        </motion.div>
      </div>

      {/* ── Wave animation keyframes (inline style for the emoji) ── */}
      <style>{`
        @keyframes wave {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </motion.div>
  );
}
