import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  History,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileX2,
  Calendar,
  ArrowUpDown,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { apiGetPredictions } from '../services/api';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

const RISK_OPTIONS = [
  { value: '', label: 'All Risk Bands' },
  { value: 'Low', label: 'Low' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'High', label: 'High' },
];

const DATE_FILTERS = [
  { value: '', label: 'All Time' },
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
];

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

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Skeleton Components ──
function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="elevated-card p-4">
          <div className="flex items-center gap-4">
            <div className="skeleton h-5 w-32 rounded" />
            <div className="skeleton h-5 w-24 rounded hidden md:block" />
            <div className="skeleton h-5 w-20 rounded hidden md:block" />
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-5 w-12 rounded hidden md:block" />
            <div className="ml-auto skeleton h-8 w-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty State ──
function EmptyState({ search, riskBand }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-navy-800 flex items-center justify-center mb-6">
        <FileX2 className="w-10 h-10 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        No Predictions Found
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
        {search || riskBand
          ? 'No predictions match your current filters. Try adjusting the search term or risk band filter.'
          : 'There are no prediction records yet. Run a new prediction to see results here.'}
      </p>
    </motion.div>
  );
}

// ── Pagination ──
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium
          text-slate-600 dark:text-slate-400
          hover:bg-slate-100 dark:hover:bg-navy-800
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
          dark:disabled:hover:bg-transparent
          transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      <div className="flex items-center gap-1">
        {getVisiblePages().map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all duration-200 ${
              p === page
                ? 'bg-gradient-to-br from-accent-500 to-accent-400 text-white shadow-md shadow-accent-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800'
            }`}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium
          text-slate-600 dark:text-slate-400
          hover:bg-slate-100 dark:hover:bg-navy-800
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
          dark:disabled:hover:bg-transparent
          transition-colors"
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Mobile Card ──
function MobileCard({ prediction, onNavigate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="elevated-card p-4 cursor-pointer active:scale-[0.99] transition-transform"
      onClick={() => onNavigate(prediction.prediction_id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
            {prediction.patient_name || '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {prediction.patient_code || '—'}
          </p>
        </div>
        <RiskBandBadge band={prediction.risk_band} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Date</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {formatDate(prediction.created_at)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Class</p>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {prediction.predicted_class}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Score</p>
          <p className={`text-sm font-bold tabular-nums ${getRiskScoreColor(prediction.risk_band)}`}>
            {prediction.risk_score}
          </p>
        </div>
      </div>

      <div className="flex justify-end mt-3 pt-3 border-t border-slate-100 dark:border-navy-800">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(prediction.prediction_id);
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-accent-500 dark:text-accent-400
            hover:text-accent-600 dark:hover:text-accent-300 transition-colors"
          aria-label={`View prediction details for ${prediction.patient_name}`}
        >
          <Eye className="w-3.5 h-3.5" />
          View Details
        </button>
      </div>
    </motion.div>
  );
}

// ── Main HistoryPage ──
export default function HistoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [predictions, setPredictions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter state derived from URL search params for shareable URLs
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const riskBand = searchParams.get('risk_band') || '';
  const dateDays = searchParams.get('days') || '';

  // Local input state for debouncing search
  const [searchInput, setSearchInput] = useState(search);

  // Debounce search input → URL (only when searchInput differs from URL search)
  useEffect(() => {
    if (searchInput === search) return;
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (searchInput) {
        params.set('search', searchInput);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      setSearchParams(params, { replace: true });
    }, 400);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Fetch predictions when filters change
  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGetPredictions({
        page,
        size: PAGE_SIZE,
        risk_band: riskBand || undefined,
        search: search || undefined,
      });

      let items = res.data.items || [];

      // Client-side date filter (quick filter — not full datepicker)
      if (dateDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(dateDays, 10));
        items = items.filter((p) => new Date(p.created_at) >= cutoff);
      }

      setPredictions(items);
      setTotal(dateDays ? items.length : res.data.total || 0);
    } catch (err) {
      toast.error('Failed to load prediction history.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, riskBand, dateDays]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleNavigate = (predictionId) => {
    navigate(`/result/${predictionId}`);
  };

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params, { replace: true });
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
    >
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center shadow-md shadow-accent-500/20">
          <History className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Prediction History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Browse and filter past prediction records
          </p>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="elevated-card p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by patient name or code..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="form-input pl-10 w-full"
              aria-label="Search predictions by patient name or code"
            />
          </div>

          {/* Risk Band Filter */}
          <div className="relative sm:w-44">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <select
              value={riskBand}
              onChange={(e) => updateParam('risk_band', e.target.value)}
              className="form-input pl-10 w-full appearance-none cursor-pointer"
              aria-label="Filter by risk band"
            >
              {RISK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Quick Filter */}
          <div className="relative sm:w-40">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <select
              value={dateDays}
              onChange={(e) => updateParam('days', e.target.value)}
              className="form-input pl-10 w-full appearance-none cursor-pointer"
              aria-label="Filter by date range"
            >
              {DATE_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Active filters summary */}
        {(search || riskBand || dateDays) && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-navy-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">Active filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent-500/10 text-accent-600 dark:text-accent-400">
                Search: "{search}"
                <button
                  onClick={() => {
                    setSearchInput('');
                    updateParam('search', '');
                  }}
                  className="ml-0.5 hover:text-accent-700 dark:hover:text-accent-300"
                  aria-label="Clear search filter"
                >
                  ×
                </button>
              </span>
            )}
            {riskBand && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent-500/10 text-accent-600 dark:text-accent-400">
                Risk: {riskBand}
                <button
                  onClick={() => updateParam('risk_band', '')}
                  className="ml-0.5 hover:text-accent-700 dark:hover:text-accent-300"
                  aria-label="Clear risk band filter"
                >
                  ×
                </button>
              </span>
            )}
            {dateDays && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent-500/10 text-accent-600 dark:text-accent-400">
                {dateDays === '7' ? 'Last 7 Days' : 'Last 30 Days'}
                <button
                  onClick={() => updateParam('days', '')}
                  className="ml-0.5 hover:text-accent-700 dark:hover:text-accent-300"
                  aria-label="Clear date filter"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {loading ? (
        <TableSkeleton />
      ) : predictions.length === 0 ? (
        <EmptyState search={search} riskBand={riskBand} />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block elevated-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" aria-label="Prediction history table">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-navy-700 bg-slate-50/50 dark:bg-navy-800/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Patient
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Predicted Class
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Score
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Risk Band
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((pred, idx) => (
                    <motion.tr
                      key={pred.prediction_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                        onClick={() => handleNavigate(pred.prediction_id)}
                        className="group cursor-pointer border-b border-slate-100 dark:border-navy-800
                          hover:bg-slate-50 dark:hover:bg-navy-800/60 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                              {pred.patient_name || '—'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {pred.patient_code || '—'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div>
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              {formatDate(pred.created_at)}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                              {formatTime(pred.created_at)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {pred.predicted_class}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-sm font-bold tabular-nums ${getRiskScoreColor(pred.risk_band)}`}>
                            {pred.risk_score}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <RiskBandBadge band={pred.risk_band} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigate(pred.prediction_id);
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-accent-500 dark:hover:text-accent-400
                              hover:bg-accent-500/10 transition-colors"
                            aria-label={`View prediction details for ${pred.patient_name}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {predictions.map((pred) => (
              <MobileCard
                key={pred.prediction_id}
                prediction={pred}
                onNavigate={handleNavigate}
              />
            ))}
          </div>

          {/* Results count */}
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} predictions
            </p>
          </div>

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </motion.div>
  );
}
