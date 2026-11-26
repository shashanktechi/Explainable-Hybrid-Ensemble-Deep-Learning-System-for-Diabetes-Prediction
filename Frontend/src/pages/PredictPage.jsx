import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import PatientForm from '../components/PatientForm';
import { apiPredict, apiGetPatients, apiCreatePatient } from '../services/api';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

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
      let resolvedPatientId = formData.patient_id?.trim();
      const { patient_email: patientEmail, ...predictPayload } = formData;

      // In live API mode, /api/predict requires a valid patient UUID.
      // If the user entered a patient name or code, look it up or create the patient first.
      if (!USE_MOCK && resolvedPatientId && !UUID_REGEX.test(resolvedPatientId)) {
        const searchRes = await apiGetPatients({ search: resolvedPatientId, size: 10 });
        const existing = (searchRes.data?.items || []).find(
          (p) =>
            p.patient_code?.toLowerCase() === resolvedPatientId.toLowerCase() ||
            p.full_name?.toLowerCase() === resolvedPatientId.toLowerCase()
        );
        if (existing) {
          resolvedPatientId = existing.patient_id;
        } else {
          const created = await apiCreatePatient({
            full_name: resolvedPatientId,
            age: formData.age,
            gender: formData.gender,
            email: patientEmail?.trim() || undefined,
          });
          resolvedPatientId = created.data.patient_id;
        }
      }

      const res = await apiPredict({ ...predictPayload, patient_id: resolvedPatientId });
      const result = res.data;
      toast.success('Diabetes risk assessment completed!');
      navigate(`/result/${result.prediction_id}`, {
        state: { prediction: result },
      });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
        : detail ||
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

