const SkeletonPulse = ({ className = '', style }) => (
  <div className={`skeleton rounded ${className}`} style={style} />
);

export const CardSkeleton = ({ count = 1 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-navy-900/80 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-10 w-10 rounded-xl" />
        </div>
        <SkeletonPulse className="h-8 w-32" />
        <SkeletonPulse className="h-3 w-20" />
      </div>
    ))}
  </div>
);

export const TextSkeleton = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonPulse
        key={i}
        className={`h-4 ${i === count - 1 ? 'w-3/5' : i % 2 === 0 ? 'w-full' : 'w-4/5'}`}
      />
    ))}
  </div>
);

export const ChartSkeleton = () => (
  <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-navy-900/80 p-6 space-y-4">
    <div className="flex items-center justify-between">
      <SkeletonPulse className="h-5 w-36" />
      <SkeletonPulse className="h-8 w-24 rounded-lg" />
    </div>
    <div className="flex items-end gap-2 h-48 pt-4">
      {[42, 68, 55, 84, 48, 76, 62, 70].map((h, i) => (
        <SkeletonPulse
          key={i}
          className="flex-1 rounded-t-md"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
    <div className="flex justify-between pt-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonPulse key={i} className="h-3 w-6" />
      ))}
    </div>
  </div>
);

export const GaugeSkeleton = () => (
  <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-navy-900/80 p-6 flex flex-col items-center space-y-4">
    <SkeletonPulse className="h-5 w-32" />
    <SkeletonPulse className="h-40 w-40 rounded-full" />
    <SkeletonPulse className="h-6 w-24" />
    <SkeletonPulse className="h-4 w-44" />
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-navy-900/80 overflow-hidden">
    {/* Table Header */}
    <div className="grid grid-cols-5 gap-4 p-4 border-b border-slate-200 dark:border-white/5">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonPulse key={i} className="h-4 w-full" />
      ))}
    </div>
    {/* Table Rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div
        key={rowIdx}
        className="grid grid-cols-5 gap-4 p-4 border-b border-slate-100 dark:border-white/[0.03] last:border-b-0"
      >
        {Array.from({ length: 5 }).map((_, colIdx) => (
          <SkeletonPulse
            key={colIdx}
            className={`h-4 ${colIdx === 0 ? 'w-4/5' : 'w-full'}`}
          />
        ))}
      </div>
    ))}
  </div>
);

export const FormSkeleton = () => (
  <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-navy-900/80 p-8 space-y-6">
    <SkeletonPulse className="h-7 w-48" />
    <SkeletonPulse className="h-4 w-72" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonPulse className="h-4 w-28" />
          <SkeletonPulse className="h-11 w-full rounded-xl" />
        </div>
      ))}
    </div>
    <div className="flex justify-end pt-4">
      <SkeletonPulse className="h-11 w-40 rounded-xl" />
    </div>
  </div>
);

const variantMap = {
  card: CardSkeleton,
  text: TextSkeleton,
  chart: ChartSkeleton,
  gauge: GaugeSkeleton,
  table: TableSkeleton,
  form: FormSkeleton,
};

const LoadingSkeleton = ({ variant = 'text', count, rows }) => {
  const Component = variantMap[variant] || TextSkeleton;
  const props = {};

  if (count !== undefined) props.count = count;
  if (rows !== undefined) props.rows = rows;

  return <Component {...props} />;
};

export default LoadingSkeleton;
