import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import PatientForm from '../components/PatientForm';
import { apiPredict } from '../services/api';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function PredictPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const defaultPatientId = location.state?.patientId || '';

  const handlePredictSubmit = async (formData) => {
    setIsLoading(true);
    try {
      const res = await apiPredict(formData);
      const result = res.data;
      toast.success('Diabetes risk assessment completed!');
      navigate(`/result/${result.prediction_id}`, {
        state: { prediction: result },
      });
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Prediction failed. Please verify the clinical values and try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
    >
      {/* ── Page Header ── */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center shadow-md shadow-accent-500/20 shrink-0">
            <Stethoscope className="w-5.5 h-5.5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              New Prediction
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Enter patient clinical data to generate a diabetes risk assessment
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-500/10 text-accent-600 dark:text-accent-400 text-xs font-medium self-start sm:self-center">
          <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>SHAP + LIME Explainability Enabled</span>
        </div>
      </div>

      {/* ── Clinical Form ── */}
      <PatientForm
        onSubmit={handlePredictSubmit}
        isLoading={isLoading}
        defaultPatientId={defaultPatientId}
      />
    </motion.div>
  );
}

