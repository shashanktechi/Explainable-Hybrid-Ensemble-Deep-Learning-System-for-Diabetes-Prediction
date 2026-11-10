import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Droplets,
  Scale,
  User,
  Loader2,
  Activity,
  Send,
  HelpCircle,
} from 'lucide-react';
import { apiGetPatients } from '../services/api';

const patientSchema = z.object({
  patient_id: z.string().trim().min(1, 'Patient ID is required'),
  glucose: z
    .number({ error: 'Glucose is required' })
    .min(30, 'Minimum value is 30 mg/dL')
    .max(600, 'Maximum value is 600 mg/dL'),
  hba1c: z
    .union([
      z.number().min(3, 'Minimum value is 3%').max(20, 'Maximum value is 20%'),
      z.nan(),
    ])
    .optional()
    .transform((v) => (Number.isNaN(v) ? undefined : v)),
  insulin: z
    .number({ error: 'Insulin is required' })
    .min(0, 'Minimum value is 0 μU/mL')
    .max(1000, 'Maximum value is 1000 μU/mL'),
  bmi: z
    .number({ error: 'BMI is required' })
    .min(10, 'Minimum value is 10 kg/m²')
    .max(80, 'Maximum value is 80 kg/m²'),
  skin_thickness: z
    .union([
      z.number().min(1, 'Minimum value is 1 mm').max(100, 'Maximum value is 100 mm'),
      z.nan(),
    ])
    .optional()
    .transform((v) => (Number.isNaN(v) ? undefined : v)),
  blood_pressure: z
    .number({ error: 'Blood pressure is required' })
    .min(20, 'Minimum value is 20 mmHg')
    .max(250, 'Maximum value is 250 mmHg'),
  age: z
    .number({ error: 'Age is required' })
    .int('Age must be a whole number')
    .min(1, 'Minimum age is 1')
    .max(120, 'Maximum age is 120'),
  pregnancies: z
    .union([
      z.number().int('Must be a whole number').min(0, 'Minimum is 0').max(20, 'Maximum is 20'),
      z.nan(),
    ])
    .optional()
    .transform((v) => (Number.isNaN(v) ? undefined : v)),
  gender: z.enum(['M', 'F', 'Other'], { error: 'Gender is required' }),
  diabetes_pedigree_fn: z
    .union([
      z.number().min(0, 'Minimum value is 0').max(3, 'Maximum value is 3'),
      z.nan(),
    ])
    .optional()
    .transform((v) => (Number.isNaN(v) ? undefined : v)),
});

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
  }),
};

function FieldError({ message, id }) {
  if (!message) return null;
  return (
    <motion.p
      id={id}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400"
      role="alert"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </motion.p>
  );
}

function HelperText({ text, id }) {
  return (
    <p id={id} className="mt-1 flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400">
      <HelpCircle className="mt-0.5 h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}

function FormField({
  label,
  name,
  type = 'number',
  register,
  error,
  helper,
  required = false,
  step,
  placeholder,
  children,
}) {
  const hasError = !!error;

  if (children) {
    return (
      <div className="space-y-1">
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {children}
        {helper && <HelperText id={`${name}-helper`} text={helper} />}
        <FieldError id={`${name}-error`} message={error?.message} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        id={name}
        type={type}
        step={step}
        placeholder={placeholder}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${name}-error` : helper ? `${name}-helper` : undefined}
        className={`form-input w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-navy-800 dark:text-slate-100 dark:placeholder:text-slate-500 ${
          hasError
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:focus:ring-red-500/30'
            : 'border-slate-300 focus:border-accent-500 focus:ring-accent-500/20 dark:border-navy-600 dark:focus:border-accent-400 dark:focus:ring-accent-400/20'
        }`}
        {...register(name, { valueAsNumber: type === 'number' })}
      />
      {helper && <HelperText id={`${name}-helper`} text={helper} />}
      <FieldError id={`${name}-error`} message={error?.message} />
    </div>
  );
}

function SectionCard({ icon: Icon, title, children, index }) {
  return (
    <motion.section
      custom={index}
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      className="elevated-card p-5 sm:p-6"
    >
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-400 text-white shadow-sm">
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold text-slate-800 font-heading dark:text-slate-100">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">{children}</div>
    </motion.section>
  );
}

export default function PatientForm({ onSubmit, isLoading = false, defaultPatientId = '' }) {
  const [patients, setPatients] = useState([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      patient_id: defaultPatientId,
      glucose: undefined,
      hba1c: undefined,
      insulin: undefined,
      bmi: undefined,
      skin_thickness: undefined,
      blood_pressure: undefined,
      age: undefined,
      pregnancies: undefined,
      gender: '',
      diabetes_pedigree_fn: undefined,
    },
    mode: 'onTouched',
  });

  useEffect(() => {
    if (defaultPatientId) {
      setValue('patient_id', defaultPatientId, { shouldValidate: true });
    }
  }, [defaultPatientId, setValue]);

  useEffect(() => {
    let cancelled = false;
    apiGetPatients({ size: 50 })
      .then((res) => {
        if (!cancelled) {
          setPatients(res.data?.items || []);
        }
      })
      .catch(() => {
        // Optional helper dropdown — safe to ignore if unavailable
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentPatientId = watch('patient_id');

  const handlePatientSelect = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    setValue('patient_id', selectedId, { shouldValidate: true });
    const match = patients.find((p) => p.patient_id === selectedId);
    if (match) {
      if (match.age) setValue('age', match.age, { shouldValidate: true });
      if (match.gender) setValue('gender', match.gender, { shouldValidate: true });
    }
  };

  const submitHandler = (data) => {
    const cleaned = { ...data };
    if (cleaned.hba1c === undefined || cleaned.hba1c === null) delete cleaned.hba1c;
    if (cleaned.skin_thickness === undefined || cleaned.skin_thickness === null) delete cleaned.skin_thickness;
    if (cleaned.pregnancies === undefined || cleaned.pregnancies === null) delete cleaned.pregnancies;
    if (cleaned.diabetes_pedigree_fn === undefined || cleaned.diabetes_pedigree_fn === null) delete cleaned.diabetes_pedigree_fn;
    onSubmit(cleaned);
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)} noValidate className="space-y-6">
      {/* Patient Selection */}
      <SectionCard icon={Activity} title="Patient Identification" index={0}>
        {patients.length > 0 && (
          <div>
            <label htmlFor="patient_select" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Select Existing Patient
            </label>
            <select
              id="patient_select"
              value={patients.some((p) => p.patient_id === currentPatientId) ? currentPatientId : ''}
              onChange={handlePatientSelect}
              className="form-input w-full cursor-pointer"
            >
              <option value="">Choose a registered patient (optional)…</option>
              {patients.map((p) => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.full_name} ({p.patient_code})
                </option>
              ))}
            </select>
            <HelperText text="Auto-fills patient ID, age, and gender from records" />
          </div>
        )}

        <div className={patients.length > 0 ? '' : 'md:col-span-2'}>
          <FormField
            label="Patient ID / Code"
            name="patient_id"
            type="text"
            register={register}
            error={errors.patient_id}
            required
            placeholder="Enter Patient ID (e.g. p1 or PAT-000001)"
            helper="Unique patient identifier or medical record number"
          />
        </div>
      </SectionCard>

      {/* Glucose & Metabolic Panel */}
      <SectionCard icon={Droplets} title="Glucose & Metabolic Panel" index={1}>
        <FormField
          label="Fasting Plasma Glucose (mg/dL)"
          name="glucose"
          register={register}
          error={errors.glucose}
          required
          step="1"
          placeholder="e.g. 100"
          helper="Fasting plasma glucose in mg/dL. Normal: 70–100"
        />
        <FormField
          label="HbA1c (%)"
          name="hba1c"
          register={register}
          error={errors.hba1c}
          step="0.1"
          placeholder="e.g. 5.4"
          helper="Glycated hemoglobin %. Normal: below 5.7%"
        />
        <FormField
          label="Serum Insulin (μU/mL)"
          name="insulin"
          register={register}
          error={errors.insulin}
          required
          step="1"
          placeholder="e.g. 80"
          helper="2-hour serum insulin in μU/mL. Normal: 16–166"
        />
      </SectionCard>

      {/* Body Measurements */}
      <SectionCard icon={Scale} title="Body Measurements" index={2}>
        <FormField
          label="BMI (kg/m²)"
          name="bmi"
          register={register}
          error={errors.bmi}
          required
          step="0.1"
          placeholder="e.g. 24.5"
          helper="Body Mass Index in kg/m². Normal: 18.5–24.9"
        />
        <FormField
          label="Skin Thickness (mm)"
          name="skin_thickness"
          register={register}
          error={errors.skin_thickness}
          step="1"
          placeholder="e.g. 29"
          helper="Triceps skinfold thickness in mm. Normal: 10–50"
        />
        <FormField
          label="Diastolic Blood Pressure (mmHg)"
          name="blood_pressure"
          register={register}
          error={errors.blood_pressure}
          required
          step="1"
          placeholder="e.g. 72"
          helper="Diastolic blood pressure in mmHg. Normal: 60–80"
        />
      </SectionCard>

      {/* Demographics & History */}
      <SectionCard icon={User} title="Demographics & History" index={3}>
        <FormField
          label="Age (years)"
          name="age"
          register={register}
          error={errors.age}
          required
          step="1"
          placeholder="e.g. 45"
          helper="Patient age in years"
        />
        <FormField
          label="Pregnancies"
          name="pregnancies"
          register={register}
          error={errors.pregnancies}
          step="1"
          placeholder="e.g. 0"
          helper="Number of times pregnant. Enter 0 if male or not applicable"
        />
        <FormField
          label="Gender"
          name="gender"
          register={register}
          error={errors.gender}
          required
          helper="Biological sex of the patient"
        >
          <select
            id="gender"
            aria-invalid={!!errors.gender}
            aria-describedby={errors.gender ? 'gender-error' : 'gender-helper'}
            className={`form-input w-full cursor-pointer rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 dark:bg-navy-800 dark:text-slate-100 ${
              errors.gender
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:focus:ring-red-500/30'
                : 'border-slate-300 focus:border-accent-500 focus:ring-accent-500/20 dark:border-navy-600 dark:focus:border-accent-400 dark:focus:ring-accent-400/20'
            }`}
            {...register('gender')}
          >
            <option value="">Select gender</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="Other">Other</option>
          </select>
        </FormField>
        <FormField
          label="Diabetes Pedigree Function"
          name="diabetes_pedigree_fn"
          register={register}
          error={errors.diabetes_pedigree_fn}
          step="0.001"
          placeholder="e.g. 0.627"
          helper="Diabetes pedigree function score. Typical: 0.08–2.42"
        />
      </SectionCard>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
      >
        <button
          type="submit"
          disabled={isLoading}
          className="btn-accent group relative flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-400 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-accent-500/30 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-navy-950"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span>Running Ensemble Prediction…</span>
            </>
          ) : (
            <>
              <Send className="h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
              <span>Run Diabetes Prediction</span>
            </>
          )}
        </button>
      </motion.div>
    </form>
  );
}
