import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Phone,
  Calendar,
  Hash,
  Activity,
  Eye,
  Plus,
  ArrowLeft,
  Clock,
  FileText,
  Users,
  HeartPulse,
  Droplets,
  Weight,
  TestTube,
  ClipboardList,
  Search,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { apiGetPatient, apiGetPatients } from '../services/api';
import toast from 'react-hot-toast';

function RiskBandBadge({ band }) {
  const icon =
    band === 'High' ? (
      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
    ) : band === 'Moderate' ? (
      <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
    ) : (
      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
    );

  return (
    <span className={getRiskBadgeClass(band)}>
      {icon}
      <span>{band}</span>
    </span>
  );
}

function getRiskBadgeClass(band) {
  switch (band) {
    case 'High':
      return 'badge badge-high';
    case 'Moderate':
      return 'badge badge-moderate';
    case 'Low':
      return 'badge badge-low';
    default:
      return 'badge';
  }
}

function getRiskScoreColor(band) {
  switch (band) {
    case 'High':
      return 'text-amber-500';
    case 'Moderate':
      return 'text-yellow-500 dark:text-yellow-400';
    case 'Low':
      return 'text-accent-500 dark:text-accent-400';
    default:
      return 'text-slate-600 dark:text-slate-400';
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Skeleton ──
function ProfileSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-6">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <div className="skeleton h-7 w-48 rounded" />
          <div className="skeleton h-4 w-32 rounded" />
        </div>
      </div>

      {/* Demographics skeleton */}
      <div className="elevated-card p-6">
        <div className="skeleton h-5 w-40 rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-3 w-16 rounded" />
              <div className="skeleton h-5 w-28 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="elevated-card p-6">
        <div className="skeleton h-5 w-48 rounded mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="skeleton w-3 h-3 rounded-full mt-1" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-3 w-64 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="elevated-card p-6">
        <div className="skeleton h-5 w-56 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Empty State Component ──
function EmptySection({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-navy-800 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-slate-400 dark:text-slate-500" />
      </div>
      <h4 className="font-heading text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
        {title}
      </h4>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
        {description}
      </p>
    </div>
  );
}

// ── Demographics Card ──
function DemographicsCard({ patient }) {
  const fields = [
    { label: 'Full Name', value: patient.full_name, icon: User },
    { label: 'Patient Code', value: patient.patient_code, icon: Hash },
    { label: 'Age', value: patient.age ? `${patient.age} years` : '—', icon: Calendar },
    {
      label: 'Gender',
      value: patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender || '—',
      icon: Users,
    },
    { label: 'Contact', value: patient.contact_number || '—', icon: Phone },
    { label: 'Registered', value: patient.created_at ? formatDate(patient.created_at) : '—', icon: Clock },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="elevated-card p-5 sm:p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <User className="w-4.5 h-4.5 text-accent-500" />
        <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
          Patient Demographics
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {fields.map(({ label, value, icon: FieldIcon }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-navy-800 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FieldIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium mb-0.5">
                {label}
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Prediction Timeline ──
function PredictionTimeline({ predictions, onNavigate }) {
  if (!predictions || predictions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="elevated-card p-5 sm:p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4.5 h-4.5 text-accent-500" />
          <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
            Prediction Timeline
          </h2>
        </div>
        <EmptySection
          icon={Activity}
          title="No Predictions Yet"
          description="This patient has no prediction records. Run a new prediction to get started."
        />
      </motion.div>
    );
  }

  const sorted = [...predictions].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="elevated-card p-5 sm:p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-4.5 h-4.5 text-accent-500" />
        <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
          Prediction Timeline
        </h2>
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-navy-800 px-2 py-0.5 rounded-full">
          {sorted.length} {sorted.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-accent-500/40 via-accent-500/20 to-transparent" />

        <div className="space-y-6">
          {sorted.map((pred, idx) => (
            <motion.div
              key={pred.prediction_id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              className="relative flex gap-4 group cursor-pointer"
              onClick={() => onNavigate(pred.prediction_id)}
            >
              {/* Dot */}
              <div className="relative z-10 w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div
                  className={`w-3 h-3 rounded-full ring-4 transition-all duration-200 group-hover:scale-125 ${
                    pred.risk_band === 'High'
                      ? 'bg-amber-500 ring-amber-500/20'
                      : pred.risk_band === 'Moderate'
                      ? 'bg-yellow-500 ring-yellow-500/20'
                      : 'bg-accent-500 ring-accent-500/20'
                  }`}
                />
              </div>

              {/* Content */}
              <div className="flex-1 pb-1 group-hover:translate-x-1 transition-transform duration-200">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {formatDateTime(pred.created_at)}
                  </span>
                  <RiskBandBadge band={pred.risk_band} />
                </div>

                <div className="elevated-card p-3 sm:p-4 group-hover:border-accent-500/30 dark:group-hover:border-accent-400/30 transition-colors">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Predicted Class</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {pred.predicted_class}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Risk Score</p>
                      <p className={`text-sm font-bold tabular-nums ${getRiskScoreColor(pred.risk_band)}`}>
                        {pred.risk_score}
                      </p>
                    </div>
                    {pred.explanation?.top_features && (
                      <div className="flex-1 min-w-[140px]">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Top Factors</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {pred.explanation.top_features.join(', ')}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(pred.prediction_id);
                      }}
                      className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-accent-500 dark:hover:text-accent-400
                        hover:bg-accent-500/10 transition-colors"
                      aria-label="View full prediction details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Clinical Records Table ──
function ClinicalRecordsTable({ records }) {
  if (!records || records.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="elevated-card p-5 sm:p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-4.5 h-4.5 text-accent-500" />
          <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
            Clinical Records History
          </h2>
        </div>
        <EmptySection
          icon={FileText}
          title="No Clinical Records"
          description="No clinical records have been recorded for this patient yet."
        />
      </motion.div>
    );
  }

  const sorted = [...records].sort(
    (a, b) => new Date(b.recorded_at) - new Date(a.recorded_at)
  );

  const columns = [
    { key: 'recorded_at', label: 'Date', icon: Calendar, format: (v) => formatDate(v) },
    { key: 'glucose', label: 'Glucose', icon: Droplets, unit: 'mg/dL' },
    { key: 'blood_pressure', label: 'BP', icon: HeartPulse, unit: 'mmHg' },
    { key: 'bmi', label: 'BMI', icon: Weight, unit: 'kg/m²' },
    { key: 'hba1c', label: 'HbA1c', icon: TestTube, unit: '%' },
    { key: 'insulin', label: 'Insulin', icon: Droplets, unit: 'µU/mL' },
    { key: 'skin_thickness', label: 'Skin Thick.', unit: 'mm' },
    { key: 'diabetes_pedigree_fn', label: 'DPF', unit: '' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="elevated-card p-5 sm:p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <ClipboardList className="w-4.5 h-4.5 text-accent-500" />
        <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
          Clinical Records History
        </h2>
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-navy-800 px-2 py-0.5 rounded-full">
          {sorted.length} {sorted.length === 1 ? 'visit' : 'visits'}
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
        <table className="w-full min-w-[700px]" aria-label="Clinical records history">
          <thead>
            <tr className="border-b border-slate-200 dark:border-navy-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((record) => (
              <tr
                key={record.record_id}
                className="border-b border-slate-100 dark:border-navy-800 hover:bg-slate-50 dark:hover:bg-navy-800/40 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-3 text-sm text-slate-700 dark:text-slate-300">
                    {col.format
                      ? col.format(record[col.key])
                      : record[col.key] != null
                      ? `${record[col.key]}${col.unit ? ` ${col.unit}` : ''}`
                      : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-4">
        {sorted.map((record) => (
          <div
            key={record.record_id}
            className="p-4 rounded-lg bg-slate-50 dark:bg-navy-800/50 border border-slate-100 dark:border-navy-700"
          >
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200 dark:border-navy-700">
              <Calendar className="w-4 h-4 text-accent-500" />
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {formatDate(record.recorded_at)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {columns.slice(1).map((col) => (
                <div key={col.key}>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{col.label}</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {record[col.key] != null
                      ? `${record[col.key]}${col.unit ? ` ${col.unit}` : ''}`
                      : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Patient Directory View (/patients without :id) ──
function PatientDirectory() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiGetPatients({ search: search || undefined, size: 50 });
        if (!cancelled) {
          setPatients(res.data?.items || []);
        }
      } catch {
        if (!cancelled) toast.error('Failed to load patients.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center shadow-md shadow-accent-500/20">
            <Users className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              Patients
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Select a patient to view demographics, clinical records, and risk timeline
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/predict')}
          className="btn-accent inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Prediction
        </button>
      </div>

      {/* Search */}
      <div className="elevated-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search patients by name or patient code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-10 w-full"
            aria-label="Search patients by name or code"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="elevated-card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="skeleton w-11 h-11 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-3 w-20 rounded" />
                </div>
              </div>
              <div className="skeleton h-4 w-40 rounded" />
            </div>
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="elevated-card p-12 text-center">
          <EmptySection
            icon={Users}
            title="No Patients Found"
            description="No patients matched your search criteria."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p) => (
            <button
              key={p.patient_id}
              type="button"
              onClick={() => navigate(`/patients/${p.patient_id}`)}
              className="elevated-card p-5 text-left group cursor-pointer transition-all hover:border-accent-500/30"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center text-white font-heading font-bold text-sm shrink-0">
                    {p.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-heading text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {p.full_name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {p.patient_code}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-accent-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-white/5">
                <span>{p.age} yrs</span>
                <span>•</span>
                <span>{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : p.gender}</span>
                {p.contact_number && (
                  <>
                    <span>•</span>
                    <span className="truncate">{p.contact_number}</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Main PatientProfilePage ──
export default function PatientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchPatient = async () => {
      setLoading(true);
      try {
        const res = await apiGetPatient(id);
        setPatient(res.data);
      } catch (err) {
        toast.error(
          err.response?.status === 404
            ? 'Patient not found.'
            : 'Failed to load patient data.'
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [id]);

  if (!id) {
    return <PatientDirectory />;
  }

  const handleNavigateToPrediction = (predictionId) => {
    navigate(`/result/${predictionId}`);
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <ProfileSkeleton />
      </motion.div>
    );
  }

  if (!patient) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-navy-800 flex items-center justify-center mb-5">
            <User className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Patient Not Found
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            The patient you're looking for doesn't exist or may have been removed.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center shadow-md shadow-accent-500/20 text-white font-heading font-bold text-lg">
            {patient.full_name
              ? patient.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : '?'}
          </div>
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              {patient.full_name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              {patient.patient_code}
              <span className="mx-1.5 text-slate-300 dark:text-navy-700">|</span>
              {patient.age ? `${patient.age} yrs` : '—'}
              <span className="mx-1.5 text-slate-300 dark:text-navy-700">|</span>
              {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender || '—'}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/predict', { state: { patientId: patient.patient_id } })}
          className="btn-accent flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Run New Prediction
        </button>
      </div>

      {/* ── Content ── */}
      <div className="space-y-6">
        <DemographicsCard patient={patient} />
        <PredictionTimeline
          predictions={patient.predictions}
          onNavigate={handleNavigateToPrediction}
        />
        <ClinicalRecordsTable records={patient.clinical_records} />
      </div>
    </motion.div>
  );
}
