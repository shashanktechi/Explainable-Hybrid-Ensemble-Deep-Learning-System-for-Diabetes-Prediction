import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Stethoscope,
  Calendar,
  Cpu,
  User,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  FileWarning,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiGetPrediction } from '../services/api';
import RiskScoreGauge from '../components/RiskScoreGauge';
import ShapChart from '../components/ShapChart';
import LimeChart from '../components/LimeChart';
import RecommendationCard from '../components/RecommendationCard';
import { GaugeSkeleton, ChartSkeleton, CardSkeleton } from '../components/LoadingSkeleton';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const CLASS_BADGE_MAP = {
  Diabetic: {
    badgeClass: 'badge-high',
    icon: AlertTriangle,
    description: 'High clinical likelihood of diabetes mellitus; diagnostic confirmation advised.',
  },
  'Pre-Diabetic': {
    badgeClass: 'badge-moderate',
    icon: AlertCircle,
    description: 'Elevated glycemic indicators consistent with impaired glucose tolerance.',
  },
  'Non-Diabetic': {
    badgeClass: 'badge-low',
    icon: ShieldCheck,
    description: 'Biomarkers fall within non-diabetic reference thresholds.',
  },
};

const PROB_BAR_STYLES = {
  'Non-Diabetic': {
    bar: 'bg-accent-500',
    text: 'text-accent-600 dark:text-accent-400',
  },
  'Pre-Diabetic': {
    bar: 'bg-risk-moderate',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  Diabetic: {
    bar: 'bg-risk-high',
    text: 'text-amber-600 dark:text-amber-400',
  },
};

function formatDateTime(iso) {
  if (!iso) return 'Just now';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ResultPage() {
  const { predictionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [prediction, setPrediction] = useState(location.state?.prediction || null);
  const [loading, setLoading] = useState(!location.state?.prediction);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPrediction() {
      // If we already have the exact prediction passed from PredictPage, skip refetch
      if (location.state?.prediction?.prediction_id === predictionId) {
        setPrediction(location.state.prediction);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await apiGetPrediction(predictionId);
        if (!cancelled) {
          setPrediction(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.status === 404
              ? 'Prediction record not found.'
              : 'Failed to load prediction results.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPrediction();
    return () => {
      cancelled = true;
    };
  }, [predictionId, location.state]);

  const handleDownloadPdf = () => {
    toast.success('PDF report generation coming soon.');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-8 w-56 rounded" />
          <div className="skeleton h-4 w-80 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <GaugeSkeleton />
          </div>
          <div className="lg:col-span-7">
            <ChartSkeleton />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <CardSkeleton count={3} />
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="max-w-2xl mx-auto px-4 py-20 text-center"
      >
        <div className="elevated-card p-10">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5">
            <FileWarning className="w-8 h-8 text-amber-500" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {error || 'Prediction Not Found'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            The requested prediction record could not be loaded or does not exist.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/dashboard" className="btn-accent inline-flex items-center gap-2 text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <Link to="/history" className="btn-secondary inline-flex items-center gap-2 text-sm">
              View History
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  const classInfo = CLASS_BADGE_MAP[prediction.predicted_class] || CLASS_BADGE_MAP['Non-Diabetic'];
  const ClassIcon = classInfo.icon;
  const probabilities = prediction.class_probabilities || {};

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8"
    >
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              Prediction Results
            </h1>
          </div>

          {/* Patient & Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-12 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <Link
              to={`/patients/${prediction.patient_id}`}
              className="inline-flex items-center gap-1.5 font-medium text-accent-600 dark:text-accent-400 hover:underline"
            >
              <User className="w-4 h-4" aria-hidden="true" />
              <span>
                {prediction.patient_name || prediction.patient_code || `Patient ${prediction.patient_id}`}
              </span>
              {prediction.patient_code && prediction.patient_name && (
                <span className="text-slate-400 dark:text-slate-500">({prediction.patient_code})</span>
              )}
            </Link>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              {formatDateTime(prediction.created_at)}
            </span>
            {prediction.model_version && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 font-medium text-xs">
                <Cpu className="w-3.5 h-3.5 text-accent-500" aria-hidden="true" />
                Stack-DNN {prediction.model_version}
              </span>
            )}
          </div>
        </div>

        {/* Predicted Class Badge */}
        <div className="flex items-center gap-3 pl-12 lg:pl-0">
          <div className={`badge ${classInfo.badgeClass} px-4 py-2 text-sm gap-2`}>
            <ClassIcon className="w-4 h-4" aria-hidden="true" />
            <span>Predicted: {prediction.predicted_class}</span>
          </div>
        </div>
      </div>

      {/* ── Risk Score Gauge + Class Probabilities ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gauge Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-5 elevated-card p-6 flex flex-col items-center justify-center text-center"
        >
          <h2 className="font-heading text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Calibrated Diabetes Risk Score
          </h2>
          <RiskScoreGauge
            score={prediction.risk_score}
            riskBand={prediction.risk_band}
            animated
          />
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
            {classInfo.description}
          </p>
        </motion.div>

        {/* Class Probabilities Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-7 elevated-card p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-accent-500" aria-hidden="true" />
              <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
                Class Probability Distribution
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
              Softmax confidence output from the Hybrid Ensemble Stack-DNN meta-learner
            </p>

            <div className="space-y-5" role="list" aria-label="Class probability distribution">
              {(['Non-Diabetic', 'Pre-Diabetic', 'Diabetic']).map((cls) => {
                const prob = probabilities[cls] ?? 0;
                const pct = Math.round(prob * 1000) / 10;
                const style = PROB_BAR_STYLES[cls];
                const isWinner = prediction.predicted_class === cls;

                return (
                  <div key={cls} role="listitem" className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            isWinner
                              ? 'text-slate-900 dark:text-slate-100 font-semibold'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {cls}
                        </span>
                        {isWinner && (
                          <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-600 dark:text-accent-400">
                            Predicted
                          </span>
                        )}
                      </div>
                      <span className={`font-bold tabular-nums ${style.text}`}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-navy-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
                        className={`h-full rounded-full ${style.bar}`}
                        aria-label={`${cls}: ${pct.toFixed(1)}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Drivers Pill Summary */}
          {prediction.explanation?.top_features?.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                Key Biomarker Drivers:
              </span>
              {prediction.explanation.top_features.map((feat) => (
                <span
                  key={feat}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-accent-500/10 text-accent-600 dark:text-accent-400"
                >
                  {feat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Explainability Charts (SHAP + LIME) ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 xl:grid-cols-2 gap-6"
      >
        <ShapChart
          shapValues={prediction.explanation?.shap_values}
          topFeatures={prediction.explanation?.top_features}
        />
        <LimeChart
          limeValues={prediction.explanation?.lime_values}
          topFeatures={prediction.explanation?.top_features}
        />
      </motion.div>

      {/* ── Recommendations ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <RecommendationCard recommendations={prediction.recommendations} />
      </motion.div>

      {/* ── Bottom Action Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="elevated-card p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
      >
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="btn-secondary inline-flex items-center justify-center gap-2 text-sm"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Download Report as PDF
        </button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Link
            to="/dashboard"
            className="btn-secondary inline-flex items-center justify-center gap-2 text-sm no-underline"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
          <Link
            to="/predict"
            className="btn-accent inline-flex items-center justify-center gap-2 text-sm no-underline"
          >
            <Stethoscope className="w-4 h-4" aria-hidden="true" />
            New Prediction
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

