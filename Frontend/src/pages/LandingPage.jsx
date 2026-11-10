import { useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  ShieldCheck,
  Target,
  Brain,
  Award,
  Database,
  Filter,
  Layers,
  BarChart3,
  Eye,
  Gauge,
  ClipboardList,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/* ─────────────────────────── Animated Counter ─────────────────────────── */
function AnimatedCounter({ value, suffix = '', decimals = 0, duration = 2 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()
  );

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionVal, value, {
        duration,
        ease: 'easeOut',
      });
      return controls.stop;
    }
  }, [isInView, motionVal, value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

/* ───────────────────────── Floating Particles ─────────────────────────── */
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: ((i * 37 + 13) % 97) + 1.5,
  y: ((i * 53 + 29) % 95) + 2.5,
  size: (i % 3) + 2,
  duration: 10 + (i % 7) * 2,
  delay: (i % 6) * 0.9,
  opacity: 0.14 + (i % 5) * 0.05,
}));

function FloatingParticles() {
  const particles = PARTICLES;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-accent-500/30 dark:bg-accent-400/20"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -30, 10, -20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [p.opacity, p.opacity * 1.8, p.opacity * 0.6, p.opacity * 1.4, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ───────────────────────── Hero SVG Illustration ──────────────────────── */
function HeroIllustration() {
  return (
    <motion.svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[340px] lg:max-w-[420px] h-auto"
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.85, rotate: -5 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {/* Outer glow ring */}
      <motion.circle
        cx="200"
        cy="200"
        r="170"
        stroke="url(#grad1)"
        strokeWidth="1.5"
        strokeDasharray="8 6"
        opacity="0.35"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '200px 200px' }}
      />

      {/* Secondary orbit */}
      <motion.circle
        cx="200"
        cy="200"
        r="135"
        stroke="url(#grad2)"
        strokeWidth="1"
        strokeDasharray="4 8"
        opacity="0.25"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '200px 200px' }}
      />

      {/* Core gradient circle */}
      <circle cx="200" cy="200" r="95" fill="url(#coreGrad)" opacity="0.15" />
      <circle cx="200" cy="200" r="95" stroke="url(#grad1)" strokeWidth="2" opacity="0.5" />

      {/* Inner pulsing circle */}
      <motion.circle
        cx="200"
        cy="200"
        r="60"
        fill="url(#coreGrad)"
        opacity="0.1"
        animate={{ r: [60, 68, 60] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <circle cx="200" cy="200" r="60" stroke="url(#grad2)" strokeWidth="1.5" opacity="0.4" />

      {/* Neural network nodes */}
      {[
        { cx: 200, cy: 130, r: 6 },
        { cx: 150, cy: 180, r: 5 },
        { cx: 250, cy: 180, r: 5 },
        { cx: 170, cy: 240, r: 5 },
        { cx: 230, cy: 240, r: 5 },
        { cx: 200, cy: 270, r: 6 },
      ].map((node, i) => (
        <motion.circle
          key={`node-${i}`}
          cx={node.cx}
          cy={node.cy}
          r={node.r}
          fill="url(#grad1)"
          opacity="0.85"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: i * 0.3,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Neural connections */}
      {[
        'M200,130 L150,180',
        'M200,130 L250,180',
        'M150,180 L170,240',
        'M150,180 L230,240',
        'M250,180 L170,240',
        'M250,180 L230,240',
        'M170,240 L200,270',
        'M230,240 L200,270',
      ].map((d, i) => (
        <motion.path
          key={`conn-${i}`}
          d={d}
          stroke="url(#grad1)"
          strokeWidth="1"
          opacity="0.3"
          animate={{ opacity: [0.15, 0.45, 0.15] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Gauge arc — top */}
      <motion.path
        d="M 115 200 A 85 85 0 0 1 285 200"
        stroke="url(#grad1)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: 'easeOut', delay: 0.5 }}
      />

      {/* Orbiting dots */}
      {[0, 1, 2].map((i) => (
        <motion.g
          key={`orbit-${i}`}
          animate={{ rotate: 360 }}
          transition={{
            duration: 8 + i * 4,
            repeat: Infinity,
            ease: 'linear',
            delay: i * 0.5,
          }}
          style={{ transformOrigin: '200px 200px' }}
        >
          <circle
            cx={200 + 135 + i * 18}
            cy="200"
            r="4"
            fill={i === 0 ? '#14B8A6' : i === 1 ? '#22D3EE' : '#5EEAD4'}
            opacity="0.75"
          />
        </motion.g>
      ))}

      {/* Gradient definitions */}
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
        <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </radialGradient>
      </defs>
    </motion.svg>
  );
}

/* ──────────────────────── Section Wrapper ──────────────────────────────── */
function Section({ children, className = '', id }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      id={id}
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.section>
  );
}

/* ─────────────────────── Pipeline Step Card ────────────────────────────── */
function PipelineStep({ icon: Icon, title, description, index, total }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <div className="flex flex-col items-center relative" ref={ref}>
      <motion.div
        className="glass-card rounded-2xl p-5 md:p-6 w-full text-center flex flex-col items-center gap-3 relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: index * 0.12, ease: [0.4, 0, 0.2, 1] }}
        whileHover={{ y: -4, transition: { duration: 0.25 } }}
      >
        {/* Step number badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center text-white text-xs font-bold font-heading shadow-lg">
          {index + 1}
        </div>

        <div className="w-12 h-12 rounded-xl bg-accent-500/10 dark:bg-accent-400/10 flex items-center justify-center mt-2">
          <Icon className="w-6 h-6 text-accent-500 dark:text-accent-400" strokeWidth={1.75} />
        </div>

        <h3 className="font-heading font-semibold text-sm md:text-base text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </motion.div>

      {/* Desktop connector arrow — hidden on last step and mobile */}
      {index < total - 1 && (
        <div className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 text-accent-500/40 dark:text-accent-400/30">
          <ChevronRight className="w-5 h-5" />
        </div>
      )}

      {/* Mobile connector line — hidden on last step and desktop */}
      {index < total - 1 && (
        <div className="lg:hidden w-px h-8 bg-gradient-to-b from-accent-500/30 to-accent-500/5 dark:from-accent-400/30 dark:to-accent-400/5 my-1" />
      )}
    </div>
  );
}

/* ─────────────────────── Feature Card ──────────────────────────────────── */
function FeatureCard({ icon: Icon, title, description, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-4 cursor-default"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
    >
      <div className="w-14 h-14 rounded-2xl bg-accent-500/10 dark:bg-accent-400/10 flex items-center justify-center">
        <Icon className="w-7 h-7 text-accent-500 dark:text-accent-400" strokeWidth={1.75} />
      </div>
      <h3 className="font-heading font-semibold text-lg text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();

  /* Redirect authenticated users to dashboard */
  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const trustStats = [
    {
      icon: ShieldCheck,
      value: 97.2,
      suffix: '%',
      decimals: 1,
      label: 'Accuracy',
    },
    {
      icon: Target,
      value: 3,
      suffix: '-Class',
      decimals: 0,
      label: 'Prediction',
    },
    {
      icon: Brain,
      value: null,
      label: 'SHAP + LIME',
      sublabel: 'Explainability',
    },
    {
      icon: Award,
      value: null,
      label: 'IEEE',
      sublabel: 'Published',
    },
  ];

  const pipelineSteps = [
    {
      icon: Database,
      title: 'Multi-Source Datasets',
      description: 'PIMA, BRFSS, and synthetic data for robust training',
    },
    {
      icon: Filter,
      title: 'Advanced Preprocessing',
      description: 'SMOTE oversampling, feature scaling, outlier handling',
    },
    {
      icon: Layers,
      title: 'Hybrid Base Models',
      description: 'XGBoost, LightGBM, CatBoost, BiLSTM, TabNet ensemble',
    },
    {
      icon: Brain,
      title: 'Stack-DNN Meta-Learner',
      description: 'Deep neural network combines base model predictions',
    },
    {
      icon: BarChart3,
      title: 'Explainable Results',
      description: 'SHAP + LIME explanations with actionable recommendations',
    },
  ];

  const features = [
    {
      icon: Eye,
      title: 'Transparent Predictions',
      description:
        'Every prediction comes with SHAP and LIME explanations showing exactly which biomarkers drove the result.',
    },
    {
      icon: Gauge,
      title: 'Calibrated Risk Scoring',
      description:
        '0–100 calibrated risk scores with Low/Moderate/High bands, not just binary yes/no classification.',
    },
    {
      icon: ClipboardList,
      title: 'Actionable Recommendations',
      description:
        'Personalized diet, lifestyle, and follow-up recommendations generated for each patient.',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-navy-950"
    >
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <Navbar />

      {/* ══════════════════════ HERO SECTION ══════════════════════════════ */}
      <section className="relative gradient-mesh overflow-hidden">
        <FloatingParticles />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 md:pt-36 md:pb-28 lg:pt-40 lg:pb-32">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left column — Copy */}
            <div className="flex-1 text-center lg:text-left max-w-2xl">
              <motion.h1
                className="font-heading font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-6xl leading-tight tracking-tight text-slate-900 dark:text-slate-100"
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
              >
                Explainable AI for{' '}
                <span className="gradient-text">Diabetes Prediction</span>
              </motion.h1>

              <motion.p
                className="mt-5 md:mt-6 text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mx-auto lg:mx-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                XAI-HEDL combines hybrid ensemble deep learning with SHAP and LIME
                explainability to give clinicians transparent, trustworthy diabetes risk
                assessments.
              </motion.p>

              <motion.div
                className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                <Link
                  to="/register"
                  className="btn-accent inline-flex items-center gap-2 text-base px-7 py-3 font-heading no-underline"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="btn-secondary inline-flex items-center gap-2 text-base px-7 py-3 font-heading no-underline"
                >
                  Learn More
                </a>
              </motion.div>
            </div>

            {/* Right column — SVG Illustration */}
            <div className="flex-shrink-0 flex items-center justify-center lg:flex-1">
              <HeroIllustration />
            </div>
          </div>
        </div>

        {/* Curved divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto block"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 56V28C240 4 480 0 720 12C960 24 1200 48 1440 28V56H0Z"
              className="fill-slate-50 dark:fill-navy-950"
            />
          </svg>
        </div>
      </section>

      {/* ══════════════════════ TRUST / ACCURACY STRIP ════════════════════ */}
      <Section id="accuracy" className="relative z-10 -mt-2">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card rounded-2xl p-4 md:p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {trustStats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center text-center gap-2 py-3"
                  >
                    <div className="w-11 h-11 rounded-xl bg-accent-500/10 dark:bg-accent-400/10 flex items-center justify-center">
                      <Icon
                        className="w-5 h-5 text-accent-500 dark:text-accent-400"
                        strokeWidth={1.75}
                      />
                    </div>
                    <div className="font-heading font-bold text-xl md:text-2xl text-slate-900 dark:text-slate-100">
                      {stat.value !== null ? (
                        <AnimatedCounter
                          value={stat.value}
                          suffix={stat.suffix}
                          decimals={stat.decimals}
                        />
                      ) : (
                        <span>{stat.label}</span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {stat.value !== null ? stat.label : stat.sublabel}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      {/* ══════════════════════ HOW IT WORKS — PIPELINE ═══════════════════ */}
      <Section id="how-it-works" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-slate-900 dark:text-slate-100">
              How{' '}
              <span className="gradient-text">XAI-HEDL</span>{' '}
              Works
            </h2>
            <p className="mt-4 text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              A five-stage pipeline from raw clinical data to explainable, actionable
              risk predictions.
            </p>
          </div>

          {/* Pipeline steps — horizontal on desktop, vertical on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 lg:gap-4">
            {pipelineSteps.map((step, i) => (
              <PipelineStep
                key={i}
                {...step}
                index={i}
                total={pipelineSteps.length}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════ FEATURE HIGHLIGHTS ════════════════════════ */}
      <Section id="features" className="py-20 md:py-28 bg-slate-100/60 dark:bg-navy-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-slate-900 dark:text-slate-100">
              Why Clinicians Trust{' '}
              <span className="gradient-text">XAI-HEDL</span>
            </h2>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, i) => (
              <FeatureCard key={i} {...feature} index={i} />
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════ CTA SECTION ═══════════════════════════════ */}
      <Section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-slate-900 dark:text-slate-100 leading-tight">
            Ready to Transform{' '}
            <span className="gradient-text">Diabetes Screening</span>?
          </h2>
          <p className="mt-5 text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Join healthcare professionals using explainable AI for better patient
            outcomes.
          </p>
          <motion.div
            className="mt-10"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              to="/register"
              className="btn-accent inline-flex items-center gap-2 text-base px-8 py-3.5 font-heading no-underline"
            >
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <Footer />
    </motion.div>
  );
}
