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
import { Star, BarChart2 } from 'lucide-react';
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
  const isPositive = item.value >= 0;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-accent-500/20 bg-white dark:bg-navy-900 px-3.5 py-2.5 shadow-lg text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 mb-1">
        <span>{item.label}</span>
        {item.isTop && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-accent-500/15 text-accent-600 dark:text-accent-400 text-[10px]">
            <Star className="w-2.5 h-2.5 fill-current" /> Top Driver
          </span>
        )}
      </div>
      <p className="text-slate-600 dark:text-slate-300 tabular-nums">
        SHAP Value:{' '}
        <span
          className={`font-bold ${
            isPositive
              ? 'text-accent-600 dark:text-accent-400'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {isPositive ? `+${item.value.toFixed(3)}` : item.value.toFixed(3)}
        </span>
      </p>
      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
        {isPositive ? 'Pushes prediction toward higher diabetes risk' : 'Pushes prediction toward lower diabetes risk'}
      </p>
    </div>
  );
}

export default function ShapChart({ shapValues = {}, topFeatures = [] }) {
  const { isDark } = useTheme();

  const data = useMemo(() => {
    const topSet = new Set(topFeatures || []);
    return Object.entries(shapValues || {})
      .map(([key, val]) => ({
        key,
        label: formatFeatureName(key),
        value: Number(val) || 0,
        absValue: Math.abs(Number(val) || 0),
        isTop: topSet.has(key),
      }))
      .sort((a, b) => b.absValue - a.absValue);
  }, [shapValues, topFeatures]);

  const topDriver = data[0];
  const ariaSummary = topDriver
    ? `SHAP analysis shows ${topDriver.label} as the strongest predictor with a value of ${topDriver.value >= 0 ? '+' : ''}${topDriver.value.toFixed(2)}, ${topDriver.value >= 0 ? 'increasing' : 'decreasing'} predicted diabetes risk.`
    : 'SHAP feature importance chart with no biomarker values available.';

  const axisTextColor = isDark ? '#94A3B8' : '#475569';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.08)';
  const zeroLineColor = isDark ? '#475569' : '#94A3B8';

  const maxAbs = useMemo(() => {
    if (!data.length) return 0.5;
    const m = Math.max(...data.map((d) => d.absValue), 0.1);
    return Number((m * 1.25).toFixed(2));
  }, [data]);

  const renderYAxisTick = ({ x, y, payload }) => {
    const item = data.find((d) => d.label === payload.value);
    const isTop = item?.isTop;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={-6}
          y={0}
          dy={4}
          textAnchor="end"
          fill={isTop ? (isDark ? '#22D3EE' : '#0D9488') : axisTextColor}
          fontSize={12}
          fontWeight={isTop ? 600 : 400}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {isTop ? `★ ${payload.value}` : payload.value}
        </text>
      </g>
    );
  };

  return (
    <section
      className="elevated-card p-5 sm:p-6 flex flex-col h-full"
      aria-label={ariaSummary}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-accent-500" aria-hidden="true" />
            <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
              SHAP Feature Importance
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            How each biomarker influenced the ensemble prediction
          </p>
        </div>

        {topFeatures?.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-500/10 text-accent-600 dark:text-accent-400 text-xs font-medium shrink-0">
            <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span>Top {topFeatures.length} highlighted</span>
          </div>
        )}
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-12 text-sm text-slate-500 dark:text-slate-400">
          No SHAP values available for this prediction.
        </div>
      ) : (
        <div className="w-full h-[320px] sm:h-[340px]" role="img" aria-label={ariaSummary}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 44, left: 28, bottom: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis
                type="number"
                domain={[-maxAbs, maxAbs]}
                tick={{ fill: axisTextColor, fontSize: 11 }}
                axisLine={{ stroke: zeroLineColor }}
                tickLine={false}
                tickFormatter={(v) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2))}
                label={{
                  value: 'SHAP Value (Impact on Prediction)',
                  position: 'insideBottom',
                  offset: -14,
                  fill: axisTextColor,
                  fontSize: 11,
                }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={118}
                tick={renderYAxisTick}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
              <ReferenceLine x={0} stroke={zeroLineColor} strokeWidth={1.5} />
              <Bar dataKey="value" barSize={18} radius={[4, 4, 4, 4]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={
                      entry.value >= 0
                        ? entry.isTop
                          ? '#14B8A6'
                          : '#2DD4BF'
                        : isDark
                          ? '#64748B'
                          : '#94A3B8'
                    }
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2))}
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
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-accent-500 inline-block" aria-hidden="true" />
            <span>Positive (+): Increases diabetes risk</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-400 dark:bg-slate-500 inline-block" aria-hidden="true" />
            <span>Negative (−): Decreases diabetes risk</span>
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-accent-600 dark:text-accent-400 font-medium">
          <Star className="w-3 h-3 fill-current" aria-hidden="true" /> Top driver
        </span>
      </div>
    </section>
  );
}

