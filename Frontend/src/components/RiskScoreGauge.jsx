import { useEffect, useMemo } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

/**
 * Feature name formatting utility shared across chart components.
 */
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
  cholesterol: 'Cholesterol',
  smoking: 'Smoking',
  physical_activity: 'Physical Activity',
  heart_rate: 'Heart Rate',
  waist_circumference: 'Waist Circumference',
  triglycerides: 'Triglycerides',
  hdl: 'HDL',
  ldl: 'LDL',
};

/* ── Constants ── */
const SIZE = 280;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 110;
const STROKE_WIDTH = 22;
const NEEDLE_LENGTH = RADIUS - 8;

// Arc spans from 150° to 390° (240° total, symmetrical speedometer)
const START_ANGLE = 150;
const END_ANGLE = 390;
const TOTAL_ARC = END_ANGLE - START_ANGLE; // 240°

/** Convert degrees → radians */
const deg2rad = (d) => (d * Math.PI) / 180;

/** Polar → Cartesian relative to center */
const polarToCartesian = (angleDeg, r = RADIUS) => ({
  x: CX + r * Math.cos(deg2rad(angleDeg)),
  y: CY + r * Math.sin(deg2rad(angleDeg)),
});

/** Create an SVG arc path from startAngle to endAngle */
const describeArc = (startAngle, endAngle, r = RADIUS) => {
  const start = polarToCartesian(endAngle, r);
  const end = polarToCartesian(startAngle, r);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

/* ── Segment definitions ── */
const SEGMENTS = [
  { min: 0, max: 33, color: '#14B8A6', label: 'Low' },
  { min: 33, max: 66, color: '#EAB308', label: 'Moderate' },
  { min: 66, max: 100, color: '#F59E0B', label: 'High' },
];

/* ── Tick marks at 0, 25, 50, 75, 100 ── */
const TICKS = [0, 25, 50, 75, 100];

/** Map a score 0-100 to an angle on the arc */
const scoreToAngle = (score) => START_ANGLE + (score / 100) * TOTAL_ARC;

/* ── Animated score display (count-up) ── */
function AnimatedScore({ score }) {
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));

  useEffect(() => {
    spring.set(score);
  }, [score, spring]);

  return (
    <motion.text
      x={CX}
      y={CY - 6}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-slate-900 dark:fill-slate-100"
      style={{
        fontFamily: "'Sora', 'Space Grotesk', system-ui, sans-serif",
        fontSize: '48px',
        fontWeight: 700,
      }}
    >
      <motion.tspan>{display}</motion.tspan>
    </motion.text>
  );
}

/* ── Static score display (no animation) ── */
function StaticScore({ score }) {
  return (
    <text
      x={CX}
      y={CX - 6}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-slate-900 dark:fill-slate-100"
      style={{
        fontFamily: "'Sora', 'Space Grotesk', system-ui, sans-serif",
        fontSize: '48px',
        fontWeight: 700,
      }}
    >
      {Math.round(score)}
    </text>
  );
}

/* ── Main RiskScoreGauge ── */
export default function RiskScoreGauge({ score = 0, riskBand = 'Low', animated = true }) {
  const { isDark } = useTheme();
  const clampedScore = Math.max(0, Math.min(100, score));
  const needleAngle = scoreToAngle(clampedScore);

  // Badge style based on risk band
  const badgeStyles = useMemo(() => {
    switch (riskBand) {
      case 'High':
        return 'bg-risk-high/15 text-amber-700 dark:bg-risk-high/20 dark:text-amber-300';
      case 'Moderate':
        return 'bg-risk-moderate/15 text-yellow-700 dark:bg-risk-moderate/20 dark:text-yellow-300';
      case 'Low':
      default:
        return 'bg-risk-low/15 text-accent-600 dark:bg-risk-low/20 dark:text-accent-400';
    }
  }, [riskBand]);

  // Track background color (faint)
  const trackColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <div
      className="flex flex-col items-center"
      role="img"
      aria-label={`Risk score: ${clampedScore} out of 100, classified as ${riskBand} risk`}
    >
      <svg
        width={SIZE}
        height={SIZE * 0.78}
        viewBox={`0 0 ${SIZE} ${SIZE * 0.78}`}
        className="overflow-visible"
      >
        {/* Background track */}
        <path
          d={describeArc(START_ANGLE, END_ANGLE)}
          fill="none"
          stroke={trackColor}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />

        {/* Colored segments */}
        {SEGMENTS.map((seg) => {
          const segStart = START_ANGLE + (seg.min / 100) * TOTAL_ARC;
          const segEnd = START_ANGLE + (seg.max / 100) * TOTAL_ARC;
          return (
            <path
              key={seg.label}
              d={describeArc(segStart, segEnd)}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="butt"
              opacity={0.85}
            />
          );
        })}

        {/* Tick marks */}
        {TICKS.map((tick) => {
          const angle = scoreToAngle(tick);
          const inner = polarToCartesian(angle, RADIUS - STROKE_WIDTH / 2 - 2);
          const outer = polarToCartesian(angle, RADIUS + STROKE_WIDTH / 2 + 2);
          const labelPos = polarToCartesian(angle, RADIUS + STROKE_WIDTH / 2 + 14);
          return (
            <g key={tick}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={isDark ? '#94A3B8' : '#64748B'}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-slate-400 dark:fill-slate-500"
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '10px',
                  fontWeight: 500,
                }}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <motion.g
          initial={animated ? { rotate: START_ANGLE } : { rotate: needleAngle }}
          animate={{ rotate: needleAngle }}
          transition={
            animated
              ? { type: 'spring', stiffness: 50, damping: 15, mass: 1.2 }
              : { duration: 0 }
          }
          style={{ originX: `${CX}px`, originY: `${CY}px` }}
        >
          {/* Needle body */}
          <line
            x1={CX}
            y1={CY}
            x2={CX + NEEDLE_LENGTH}
            y2={CY}
            stroke={isDark ? '#F1F5F9' : '#0F172A'}
            strokeWidth={3}
            strokeLinecap="round"
          />
          {/* Needle tip */}
          <circle
            cx={CX + NEEDLE_LENGTH}
            cy={CY}
            r={4}
            fill={
              riskBand === 'High'
                ? '#F59E0B'
                : riskBand === 'Moderate'
                  ? '#EAB308'
                  : '#14B8A6'
            }
          />
        </motion.g>

        {/* Center hub */}
        <circle
          cx={CX}
          cy={CY}
          r={8}
          className="fill-slate-200 dark:fill-navy-700"
          stroke={isDark ? '#94A3B8' : '#64748B'}
          strokeWidth={2}
        />

        {/* Score number */}
        {animated ? (
          <AnimatedScore score={clampedScore} />
        ) : (
          <StaticScore score={clampedScore} />
        )}

        {/* "out of 100" subtitle */}
        <text
          x={CX}
          y={CY + 24}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-400 dark:fill-slate-500"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          out of 100
        </text>
      </svg>

      {/* Risk badge */}
      <motion.span
        initial={animated ? { opacity: 0, y: 6 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${badgeStyles}`}
      >
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{
            backgroundColor:
              riskBand === 'High'
                ? '#F59E0B'
                : riskBand === 'Moderate'
                  ? '#EAB308'
                  : '#14B8A6',
          }}
        />
        {riskBand} Risk
      </motion.span>
    </div>
  );
}
