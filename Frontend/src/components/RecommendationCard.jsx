import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Apple, Activity, Calendar, CheckCircle2, ClipboardList } from 'lucide-react';

const CATEGORY_META = {
  diet: {
    label: 'Diet & Nutrition',
    icon: Apple,
    accentBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    borderAccent: 'border-emerald-500/20',
  },
  lifestyle: {
    label: 'Lifestyle & Activity',
    icon: Activity,
    accentBg: 'bg-accent-400/10 dark:bg-accent-400/15',
    accentText: 'text-accent-600 dark:text-accent-400',
    borderAccent: 'border-accent-400/20',
  },
  'follow-up': {
    label: 'Clinical Follow-Up',
    icon: Calendar,
    accentBg: 'bg-amber-500/10 dark:bg-amber-500/15',
    accentText: 'text-amber-600 dark:text-amber-400',
    borderAccent: 'border-amber-500/20',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
};

export default function RecommendationCard({ recommendations = [] }) {
  const grouped = useMemo(() => {
    const groups = {
      diet: [],
      lifestyle: [],
      'follow-up': [],
    };
    (recommendations || []).forEach((rec) => {
      const cat = (rec.category || 'lifestyle').toLowerCase();
      if (groups[cat]) {
        groups[cat].push(rec.text);
      } else {
        groups.lifestyle.push(rec.text);
      }
    });
    return groups;
  }, [recommendations]);

  const hasAny = (recommendations || []).length > 0;

  if (!hasAny) {
    return (
      <div className="elevated-card p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 dark:bg-navy-800 flex items-center justify-center mb-3">
          <ClipboardList className="w-6 h-6 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="font-heading text-base font-semibold text-slate-900 dark:text-slate-100">
          No Recommendations Generated
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Personalized clinical guidance will appear here once biomarker data is analyzed.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Personalized clinical recommendations">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="w-5 h-5 text-accent-500" aria-hidden="true" />
        <h2 className="font-heading text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
          Personalized Clinical Recommendations
        </h2>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
      >
        {(['diet', 'lifestyle', 'follow-up']).map((categoryKey) => {
          const meta = CATEGORY_META[categoryKey];
          const Icon = meta.icon;
          const items = grouped[categoryKey];

          return (
            <motion.div
              key={categoryKey}
              variants={cardVariants}
              className={`elevated-card p-5 sm:p-6 border ${meta.borderAccent} flex flex-col`}
            >
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-white/5">
                <div className={`w-10 h-10 rounded-xl ${meta.accentBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${meta.accentText}`} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-semibold text-slate-900 dark:text-slate-100">
                    {meta.label}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {items.length} {items.length === 1 ? 'action item' : 'action items'}
                  </p>
                </div>
              </div>

              {/* Recommendation List */}
              {items.length > 0 ? (
                <ul className="space-y-3 flex-1">
                  {items.map((text, idx) => (
                    <motion.li
                      key={idx}
                      variants={itemVariants}
                      className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                    >
                      <CheckCircle2
                        className={`w-4 h-4 mt-0.5 shrink-0 ${meta.accentText}`}
                        aria-hidden="true"
                      />
                      <span>{text}</span>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic py-4">
                  No specific {meta.label.toLowerCase()} modifications required at this time.
                </p>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

