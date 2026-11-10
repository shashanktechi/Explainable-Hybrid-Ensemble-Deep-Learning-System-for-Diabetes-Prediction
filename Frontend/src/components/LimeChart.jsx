import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  LabelList,
} from 'recharts';
import { Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const FEATURE_LABELS = {
  glucose: 'Glucose',
  hba1c: 'HbA1c',
  bmi: 'BMI',
  age: 'Age',
  blood_pressure: 'Blood Pressure',
  skin_thickness: 'Skin Thickness',
  insulin: 'Insulin',
  diabetes_pedigree_fn: 'Diabetes Pedigree',
  pregnancies: 'Pregnancies',
};

function formatFeatureName(key) {
  if (FEATURE_LABELS[key]) return FEATURE_LABELS[key];
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  const isPositive = item.signedPct >= 0;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-accent-500/20 bg-white dark:bg-navy-900 px-3.5 py-2.5 shadow-lg text-xs">
      <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
        {item.label}
      </p>
      <p className="text-slate-600 dark:text-slate-300 tabular-nums">
        Relative Share:{' '}
        <span className="font-bold text-accent-600 dark:text-accent-400">
          {isPositive ? `+${item.signedPct.toFixed(1)}%` : `${item.signedPct.toFixed(1)}%`}
        </span>
      </p>
      <p className="text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
        Local Weight: {item.raw >= 0 ? `+${item.raw.toFixed(3)}` : item.raw.toFixed(3)}
      </p>
    </div>
  );
}

export default function LimeChart({ limeValues = {}, topFeatures = [] }) {
  const { isDark } = useTheme();

  const data = useMemo(() => {
    const entries = Object.entries(limeValues || {}).map(([key, val]) => ({
      key,
      raw: Number(val) || 0,
      absRaw: Math.abs(Number(val) || 0),
    }));
    const totalAbs = entries.reduce((sum, e) => sum + e.absRaw, 0) || 1;
    const topSet = new Set(topFeatures || []);

    return entries
      .map((e) => ({
        ...e,
        label: formatFeatureName(e.key),
        signedPct: Number(((e.raw / totalAbs) * 100).toFixed(1)),
        absPct: (e.absRaw / totalAbs) * 100,
        isTop: topSet.has(e.key),
      }))
      .sort((a, b) => b.absPct - a.absPct);
  }, [limeValues, topFeatures]);

  const topDriver = data[0];
  const ariaSummary = topDriver
    ? `LIME analysis indicates ${topDriver.label} is the primary contributing factor at ${Math.abs(topDriver.signedPct).toFixed(1)}% relative contribution.`
    : 'LIME local explanation chart with no biomarker values available.';

  const axisTextColor = isDark ? '#94A3B8' : '#475569';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.08)';
  const zeroLineColor = isDark ? '#475569' : '#94A3B8';

  const maxPct = useMemo(() => {
    if (!data.length) return 40;
    const m = Math.max(...data.map((d) => d.absPct), 10);
    return Math.ceil((m * 1.25) / 5) * 5;
  }, [data]);

  return (
    <section
      className="elevated-card p-5 sm:p-6 flex flex-col h-full"
      aria-label={ariaSummary}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-400" aria-hidden="true" />
          <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
            LIME Local Explanation
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Patient-specific feature contributions (% share of local model)
        </p>
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-12 text-sm text-slate-500 dark:text-slate-400">
          No LIME explanation available for this prediction.
        </div>
      ) : (
        <div className="w-full h-[320px] sm:h-[340px]" role="img" aria-label={ariaSummary}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 48, left: 24, bottom: 24 }}
            >
              <defs>
                <linearGradient id="limePositiveGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#14B8A6" />
                  <stop offset="100%" stopColor="#22D3EE" />
                </linearGradient>
                <linearGradient id="limeNegativeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={isDark ? '#1A3A5C' : '#64748B'} />
                  <stop offset="100%" stopColor={isDark ? '#2D5F8A' : '#475569'} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis
                type="number"
                domain={[-maxPct, maxPct]}
                tick={{ fill: axisTextColor, fontSize: 11 }}
                axisLine={{ stroke: zeroLineColor }}
                tickLine={false}
                tickFormatter={(v) => `${v > 0 ? `+${v}` : v}%`}
                label={{
                  value: 'Local Contribution (%)',
                  position: 'insideBottom',
                  offset: -14,
                  fill: axisTextColor,
                  fontSize: 11,
                }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={114}
                tick={{ fill: axisTextColor, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
              <ReferenceLine x={0} stroke={zeroLineColor} strokeWidth={1.5} />
              <Bar dataKey="signedPct" barSize={18} radius={[6, 6, 6, 6]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={entry.signedPct >= 0 ? 'url(#limePositiveGrad)' : 'url(#limeNegativeGrad)'}
                  />
                ))}
                <LabelList
                  dataKey="signedPct"
                  position="right"
                  formatter={(v) => `${v >= 0 ? `+${v}` : v}%`}
                  style={{
                    fill: axisTextColor,
                    fontSize: 11,
                    fontWeight: 500,
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{ background: 'linear-gradient(135deg, #14B8A6, #22D3EE)' }}
            aria-hidden="true"
          />
          <span>Risk-increasing biomarker (%)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm inline-block bg-navy-700 dark:bg-navy-600"
            aria-hidden="true"
          />
          <span>Protective biomarker (%)</span>
        </span>
      </div>
    </section>
  );
}

