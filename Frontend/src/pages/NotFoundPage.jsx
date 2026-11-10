import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Floating Shapes ──
function FloatingShapes() {
  const shapes = [
    {
      size: 'w-16 h-16',
      color: 'bg-accent-500/10 dark:bg-accent-500/15',
      border: 'border border-accent-500/20 dark:border-accent-400/20',
      x: [-20, 20, -20],
      y: [-10, 15, -10],
      rotate: [0, 180, 360],
      duration: 8,
      delay: 0,
      rounded: 'rounded-2xl',
      position: 'top-10 left-[10%]',
    },
    {
      size: 'w-12 h-12',
      color: 'bg-accent-400/8 dark:bg-accent-400/12',
      border: 'border border-accent-400/15 dark:border-accent-400/15',
      x: [15, -15, 15],
      y: [10, -20, 10],
      rotate: [0, -90, -180],
      duration: 10,
      delay: 1,
      rounded: 'rounded-xl',
      position: 'top-20 right-[15%]',
    },
    {
      size: 'w-20 h-20',
      color: 'bg-accent-500/6 dark:bg-accent-500/10',
      border: 'border border-accent-500/10 dark:border-accent-500/15',
      x: [-10, 25, -10],
      y: [20, -10, 20],
      rotate: [0, 120, 240],
      duration: 12,
      delay: 2,
      rounded: 'rounded-3xl',
      position: 'bottom-20 left-[20%]',
    },
    {
      size: 'w-10 h-10',
      color: 'bg-accent-400/10 dark:bg-accent-400/15',
      border: 'border border-accent-400/20 dark:border-accent-300/15',
      x: [10, -20, 10],
      y: [-15, 10, -15],
      rotate: [0, 270, 360],
      duration: 9,
      delay: 0.5,
      rounded: 'rounded-lg',
      position: 'bottom-32 right-[12%]',
    },
    {
      size: 'w-8 h-8',
      color: 'bg-accent-500/8 dark:bg-accent-500/12',
      border: 'border border-accent-500/15 dark:border-accent-400/10',
      x: [-8, 12, -8],
      y: [12, -8, 12],
      rotate: [0, -180, -360],
      duration: 7,
      delay: 3,
      rounded: 'rounded-full',
      position: 'top-[40%] left-[5%]',
    },
    {
      size: 'w-14 h-14',
      color: 'bg-accent-400/6 dark:bg-accent-400/10',
      border: 'border border-accent-400/10 dark:border-accent-400/10',
      x: [18, -12, 18],
      y: [-18, 8, -18],
      rotate: [0, 150, 300],
      duration: 11,
      delay: 1.5,
      rounded: 'rounded-2xl',
      position: 'top-[35%] right-[8%]',
    },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {shapes.map((shape, i) => (
        <motion.div
          key={i}
          className={`absolute ${shape.position} ${shape.size} ${shape.color} ${shape.border} ${shape.rounded} backdrop-blur-sm`}
          animate={{
            x: shape.x,
            y: shape.y,
            rotate: shape.rotate,
          }}
          transition={{
            duration: shape.duration,
            delay: shape.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ── Main NotFoundPage ──
export default function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50 dark:bg-navy-950 overflow-hidden"
    >
      {/* Gradient background mesh */}
      <div className="absolute inset-0 gradient-mesh" />

      {/* Floating shapes */}
      <FloatingShapes />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative z-10 text-center max-w-lg"
      >
        {/* 404 Number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
          className="mb-6"
        >
          <h1 className="font-heading text-[8rem] sm:text-[10rem] md:text-[12rem] font-extrabold leading-none gradient-text select-none">
            404
          </h1>
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3"
        >
          Page Not Found
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto"
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          {isAuthenticated ? (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-accent flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <LayoutDashboard className="w-4 h-4" />
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate(-1)}
                className="btn-secondary flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/')}
                className="btn-accent flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </button>
              <button
                onClick={() => navigate(-1)}
                className="btn-secondary flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            </>
          )}
        </motion.div>

        {/* Decorative divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-12 flex items-center justify-center gap-2"
        >
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-accent-500/30" />
          <div className="w-2 h-2 rounded-full bg-accent-500/30" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-accent-500/30" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="mt-4 text-xs text-slate-400 dark:text-slate-500"
        >
          XAI-HEDL • Explainable Hybrid Ensemble Deep Learning
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
