import axios from 'axios';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// ── Axios Instance ──
const http = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor: Attach JWT ──
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('xai_hedl_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor: Handle 401 ──
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('xai_hedl_token');
      localStorage.removeItem('xai_hedl_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Mock Helpers ──
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const mockDelay = () => delay(600 + Math.random() * 300);

const MOCK_USER = {
  user_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  full_name: 'Dr. Sarah Chen',
  email: 'sarah.chen@hospital.org',
  role: 'doctor',
  hospital_name: 'Metro General Hospital',
  created_at: '2024-08-15T09:30:00Z',
  last_login: new Date().toISOString(),
};

const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAiLCJleHAiOjk5OTk5OTk5OTl9.mock';

const MOCK_PATIENTS = [
  { patient_id: 'p1', patient_code: 'PAT-000001', full_name: 'Rajesh Kumar', age: 52, gender: 'M', contact_number: '+91-9876543210', created_by: MOCK_USER.user_id, created_at: '2024-09-01T10:00:00Z' },
  { patient_id: 'p2', patient_code: 'PAT-000002', full_name: 'Priya Sharma', age: 45, gender: 'F', contact_number: '+91-9876543211', created_by: MOCK_USER.user_id, created_at: '2024-09-05T11:30:00Z' },
  { patient_id: 'p3', patient_code: 'PAT-000003', full_name: 'Amjad Khan', age: 61, gender: 'M', contact_number: '+91-9876543212', created_by: MOCK_USER.user_id, created_at: '2024-09-10T14:00:00Z' },
  { patient_id: 'p4', patient_code: 'PAT-000004', full_name: 'Lakshmi Devi', age: 38, gender: 'F', contact_number: '+91-9876543213', created_by: MOCK_USER.user_id, created_at: '2024-09-15T09:00:00Z' },
  { patient_id: 'p5', patient_code: 'PAT-000005', full_name: 'Vikram Singh', age: 55, gender: 'M', contact_number: '+91-9876543214', created_by: MOCK_USER.user_id, created_at: '2024-09-20T16:00:00Z' },
  { patient_id: 'p6', patient_code: 'PAT-000006', full_name: 'Fatima Begum', age: 48, gender: 'F', contact_number: '+91-9876543215', created_by: MOCK_USER.user_id, created_at: '2024-10-01T08:30:00Z' },
  { patient_id: 'p7', patient_code: 'PAT-000007', full_name: 'Suresh Patel', age: 67, gender: 'M', contact_number: '+91-9876543216', created_by: MOCK_USER.user_id, created_at: '2024-10-05T13:00:00Z' },
  { patient_id: 'p8', patient_code: 'PAT-000008', full_name: 'Ananya Reddy', age: 34, gender: 'F', contact_number: '+91-9876543217', created_by: MOCK_USER.user_id, created_at: '2024-10-10T10:30:00Z' },
];

const MOCK_PREDICTIONS = [
  {
    prediction_id: 'pred-001',
    record_id: 'rec-001',
    patient_id: 'p1',
    patient_name: 'Rajesh Kumar',
    patient_code: 'PAT-000001',
    predicted_class: 'Diabetic',
    class_probabilities: { 'Non-Diabetic': 0.08, 'Pre-Diabetic': 0.22, 'Diabetic': 0.70 },
    probability_score: 0.70,
    risk_score: 82,
    risk_band: 'High',
    model_version: 'v2.1.0',
    explanation: {
      shap_values: { glucose: 0.42, hba1c: 0.35, bmi: 0.18, insulin: -0.12, age: 0.15, blood_pressure: 0.08, diabetes_pedigree_fn: 0.11, skin_thickness: -0.04, pregnancies: 0.02 },
      lime_values: { glucose: 0.38, hba1c: 0.32, bmi: 0.20, insulin: -0.10, age: 0.14, blood_pressure: 0.06, diabetes_pedigree_fn: 0.09, skin_thickness: -0.03, pregnancies: 0.01 },
      top_features: ['glucose', 'hba1c', 'bmi'],
    },
    recommendations: [
      { category: 'diet', text: 'Reduce daily carbohydrate intake to under 130g. Prioritize low-glycemic-index foods such as legumes, non-starchy vegetables, and whole grains.' },
      { category: 'diet', text: 'Increase dietary fiber to 25-30g/day through vegetables, oats, and flaxseeds to improve glycemic control.' },
      { category: 'lifestyle', text: 'Begin 150 minutes/week of moderate-intensity aerobic exercise (brisk walking, cycling). Split into 30-min sessions, 5 days/week.' },
      { category: 'lifestyle', text: 'Aim for 7-8 hours of quality sleep per night. Poor sleep directly worsens insulin resistance.' },
      { category: 'follow-up', text: 'Schedule HbA1c retest in 8 weeks. If HbA1c > 6.5% on retest, initiate pharmacological intervention discussion.' },
      { category: 'follow-up', text: 'Refer to certified diabetes educator for comprehensive self-management training.' },
    ],
    created_at: '2024-10-28T14:30:00Z',
  },
  {
    prediction_id: 'pred-002',
    record_id: 'rec-002',
    patient_id: 'p2',
    patient_name: 'Priya Sharma',
    patient_code: 'PAT-000002',
    predicted_class: 'Pre-Diabetic',
    class_probabilities: { 'Non-Diabetic': 0.25, 'Pre-Diabetic': 0.55, 'Diabetic': 0.20 },
    probability_score: 0.55,
    risk_score: 54,
    risk_band: 'Moderate',
    model_version: 'v2.1.0',
    explanation: {
      shap_values: { glucose: 0.25, bmi: 0.28, hba1c: 0.15, age: 0.10, insulin: -0.08, blood_pressure: 0.12, diabetes_pedigree_fn: 0.06, skin_thickness: 0.02, pregnancies: -0.03 },
      lime_values: { glucose: 0.22, bmi: 0.30, hba1c: 0.13, age: 0.08, insulin: -0.06, blood_pressure: 0.10, diabetes_pedigree_fn: 0.05, skin_thickness: 0.01, pregnancies: -0.02 },
      top_features: ['bmi', 'glucose', 'hba1c'],
    },
    recommendations: [
      { category: 'diet', text: 'Adopt a Mediterranean-style eating pattern. Emphasize olive oil, fish, nuts, and abundant vegetables.' },
      { category: 'diet', text: 'Limit refined sugar and processed foods. Aim for no more than 25g of added sugars per day.' },
      { category: 'lifestyle', text: 'Achieve and maintain a 5-7% body weight reduction over the next 6 months through combined diet and exercise.' },
      { category: 'lifestyle', text: 'Include resistance training 2-3 times per week to improve insulin sensitivity.' },
      { category: 'follow-up', text: 'Repeat fasting glucose and HbA1c in 12 weeks. Monitor BMI trend monthly.' },
    ],
    created_at: '2024-10-27T09:15:00Z',
  },
  {
    prediction_id: 'pred-003',
    record_id: 'rec-003',
    patient_id: 'p3',
    patient_name: 'Amjad Khan',
    patient_code: 'PAT-000003',
    predicted_class: 'Non-Diabetic',
    class_probabilities: { 'Non-Diabetic': 0.82, 'Pre-Diabetic': 0.14, 'Diabetic': 0.04 },
    probability_score: 0.18,
    risk_score: 18,
    risk_band: 'Low',
    model_version: 'v2.1.0',
    explanation: {
      shap_values: { glucose: -0.15, hba1c: -0.20, bmi: -0.12, insulin: -0.05, age: 0.18, blood_pressure: 0.06, diabetes_pedigree_fn: -0.03, skin_thickness: -0.01, pregnancies: 0.0 },
      lime_values: { glucose: -0.12, hba1c: -0.18, bmi: -0.10, insulin: -0.04, age: 0.16, blood_pressure: 0.05, diabetes_pedigree_fn: -0.02, skin_thickness: -0.01, pregnancies: 0.0 },
      top_features: ['hba1c', 'age', 'glucose'],
    },
    recommendations: [
      { category: 'diet', text: 'Maintain current balanced diet. Continue regular intake of fruits, vegetables, and whole grains.' },
      { category: 'lifestyle', text: 'Continue regular physical activity. Consider adding mindfulness or stress management practices.' },
      { category: 'follow-up', text: 'Annual routine screening recommended given age-related risk factors. Next check-up in 12 months.' },
    ],
    created_at: '2024-10-25T11:00:00Z',
  },
  {
    prediction_id: 'pred-004',
    record_id: 'rec-004',
    patient_id: 'p4',
    patient_name: 'Lakshmi Devi',
    patient_code: 'PAT-000004',
    predicted_class: 'Pre-Diabetic',
    class_probabilities: { 'Non-Diabetic': 0.30, 'Pre-Diabetic': 0.50, 'Diabetic': 0.20 },
    probability_score: 0.50,
    risk_score: 48,
    risk_band: 'Moderate',
    model_version: 'v2.1.0',
    explanation: {
      shap_values: { glucose: 0.20, bmi: 0.22, hba1c: 0.12, insulin: 0.15, age: -0.05, blood_pressure: 0.10, diabetes_pedigree_fn: 0.08, skin_thickness: 0.03, pregnancies: 0.05 },
      lime_values: { glucose: 0.18, bmi: 0.20, hba1c: 0.10, insulin: 0.12, age: -0.04, blood_pressure: 0.08, diabetes_pedigree_fn: 0.06, skin_thickness: 0.02, pregnancies: 0.04 },
      top_features: ['bmi', 'glucose', 'insulin'],
    },
    recommendations: [
      { category: 'diet', text: 'Reduce portion sizes and follow a structured meal plan with 3 main meals and 2 healthy snacks.' },
      { category: 'lifestyle', text: 'Begin a walking program: start with 20 minutes daily, increase to 45 minutes over 8 weeks.' },
      { category: 'follow-up', text: 'Schedule oral glucose tolerance test (OGTT) for comprehensive assessment in 6 weeks.' },
    ],
    created_at: '2024-10-22T16:45:00Z',
  },
  {
    prediction_id: 'pred-005',
    record_id: 'rec-005',
    patient_id: 'p5',
    patient_name: 'Vikram Singh',
    patient_code: 'PAT-000005',
    predicted_class: 'Diabetic',
    class_probabilities: { 'Non-Diabetic': 0.05, 'Pre-Diabetic': 0.15, 'Diabetic': 0.80 },
    probability_score: 0.80,
    risk_score: 91,
    risk_band: 'High',
    model_version: 'v2.1.0',
    explanation: {
      shap_values: { glucose: 0.48, hba1c: 0.40, bmi: 0.15, insulin: 0.20, age: 0.12, blood_pressure: 0.10, diabetes_pedigree_fn: 0.14, skin_thickness: -0.02, pregnancies: 0.0 },
      lime_values: { glucose: 0.45, hba1c: 0.38, bmi: 0.13, insulin: 0.18, age: 0.10, blood_pressure: 0.08, diabetes_pedigree_fn: 0.12, skin_thickness: -0.01, pregnancies: 0.0 },
      top_features: ['glucose', 'hba1c', 'insulin'],
    },
    recommendations: [
      { category: 'diet', text: 'Strict carbohydrate management: limit to 100-120g/day. Eliminate sugary beverages entirely.' },
      { category: 'diet', text: 'Increase protein intake to 1.2g/kg body weight from lean sources (chicken, fish, legumes).' },
      { category: 'lifestyle', text: 'Urgent: Begin structured exercise program immediately. Combine aerobic and resistance training.' },
      { category: 'lifestyle', text: 'Monitor blood glucose at home twice daily (fasting and 2-hour post-meal).' },
      { category: 'follow-up', text: 'Urgent endocrinology referral recommended. Consider metformin initiation discussion.' },
      { category: 'follow-up', text: 'Complete diabetic screening panel: eye exam, kidney function, lipid profile within 2 weeks.' },
    ],
    created_at: '2024-10-20T10:30:00Z',
  },
];

const MOCK_CLINICAL_RECORDS = [
  { record_id: 'rec-001', patient_id: 'p1', pregnancies: 2, glucose: 180, blood_pressure: 88, skin_thickness: 35, insulin: 220, bmi: 33.6, hba1c: 7.8, diabetes_pedigree_fn: 0.627, recorded_at: '2024-10-28T14:00:00Z' },
  { record_id: 'rec-002', patient_id: 'p2', pregnancies: 1, glucose: 140, blood_pressure: 78, skin_thickness: 28, insulin: 150, bmi: 29.1, hba1c: 6.2, diabetes_pedigree_fn: 0.351, recorded_at: '2024-10-27T09:00:00Z' },
  { record_id: 'rec-003', patient_id: 'p3', pregnancies: 0, glucose: 95, blood_pressure: 72, skin_thickness: 22, insulin: 80, bmi: 24.5, hba1c: 5.1, diabetes_pedigree_fn: 0.198, recorded_at: '2024-10-25T10:30:00Z' },
  { record_id: 'rec-101', patient_id: 'p1', pregnancies: 2, glucose: 165, blood_pressure: 85, skin_thickness: 34, insulin: 200, bmi: 32.8, hba1c: 7.2, diabetes_pedigree_fn: 0.627, recorded_at: '2024-08-15T11:00:00Z' },
  { record_id: 'rec-102', patient_id: 'p1', pregnancies: 2, glucose: 172, blood_pressure: 86, skin_thickness: 35, insulin: 210, bmi: 33.2, hba1c: 7.5, diabetes_pedigree_fn: 0.627, recorded_at: '2024-06-10T09:00:00Z' },
];

// ── Session-persisted Mock Predictions helper ──
const STORAGE_PRED_KEY = 'xai_hedl_mock_predictions';
function getStoredMockPredictions() {
  try {
    const raw = sessionStorage.getItem(STORAGE_PRED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveStoredMockPrediction(pred) {
  try {
    const existing = getStoredMockPredictions();
    sessionStorage.setItem(STORAGE_PRED_KEY, JSON.stringify([pred, ...existing]));
  } catch {
    // ignore storage errors
  }
}
function getAllMockPredictions() {
  const stored = getStoredMockPredictions();
  const seen = new Set(stored.map((p) => p.prediction_id));
  return [...stored, ...MOCK_PREDICTIONS.filter((p) => !seen.has(p.prediction_id))];
}

// ── Mock API Functions ──
const mockApi = {
  login: async ({ email, password }) => {
    await mockDelay();
    if (!password || password.length < 3) {
      throw { response: { status: 401, data: { detail: 'Incorrect email or password' } } };
    }
    return {
      data: {
        token: MOCK_TOKEN,
        access_token: MOCK_TOKEN,
        token_type: 'bearer',
        user: { ...MOCK_USER, email },
      },
    };
  },

  register: async (data) => {
    await mockDelay();
    return { data: { ...MOCK_USER, ...data, user_id: crypto.randomUUID(), created_at: new Date().toISOString() } };
  },

  getMe: async () => {
    await mockDelay();
    return { data: MOCK_USER };
  },

  predict: async (data) => {
    await mockDelay();
    const glucose = Number(data.glucose ?? 120);
    const hba1c = Number(data.hba1c ?? 5.6);
    const bmi = Number(data.bmi ?? 25);
    const age = Number(data.age ?? 42);
    const insulin = Number(data.insulin ?? 95);
    const bp = Number(data.blood_pressure ?? 76);
    const dpf = Number(data.diabetes_pedigree_fn ?? 0.35);
    const skin = Number(data.skin_thickness ?? 25);
    const pregnancies = Number(data.pregnancies ?? 0);

    // Compute realistic risk score from clinical inputs
    const glucoseContrib = Number(((glucose - 105) / 140).toFixed(3));
    const hba1cContrib = Number(((hba1c - 5.7) / 3.5).toFixed(3));
    const bmiContrib = Number(((bmi - 25) / 30).toFixed(3));
    const ageContrib = Number(((age - 40) / 80).toFixed(3));
    const insulinContrib = Number(((insulin - 120) / 400).toFixed(3));
    const bpContrib = Number(((bp - 80) / 100).toFixed(3));
    const dpfContrib = Number(((dpf - 0.3) / 2.2).toFixed(3));
    const skinContrib = Number(((skin - 28) / 120).toFixed(3));
    const pregContrib = Number((pregnancies * 0.015).toFixed(3));

    const shap_values = {
      glucose: glucoseContrib,
      hba1c: hba1cContrib,
      bmi: bmiContrib,
      age: ageContrib,
      insulin: insulinContrib,
      blood_pressure: bpContrib,
      diabetes_pedigree_fn: dpfContrib,
      skin_thickness: skinContrib,
      pregnancies: pregContrib,
    };

    const lime_values = Object.fromEntries(
      Object.entries(shap_values).map(([k, v]) => [k, Number((v * 0.92).toFixed(3))])
    );

    const top_features = Object.entries(shap_values)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 3)
      .map(([k]) => k);

    let predicted_class, risk_score, risk_band, class_probabilities;
    if (glucose >= 155 || hba1c >= 6.5) {
      predicted_class = 'Diabetic';
      risk_score = Math.min(98, Math.max(68, Math.round(55 + (glucose - 110) * 0.28 + (hba1c - 5.5) * 8)));
      risk_band = 'High';
      const pDiab = Number((risk_score / 100).toFixed(2));
      const pPre = Number(((1 - pDiab) * 0.72).toFixed(2));
      const pNon = Number(Math.max(0.01, 1 - pDiab - pPre).toFixed(2));
      class_probabilities = { 'Non-Diabetic': pNon, 'Pre-Diabetic': pPre, Diabetic: pDiab };
    } else if (glucose >= 115 || hba1c >= 5.7 || bmi >= 30) {
      predicted_class = 'Pre-Diabetic';
      risk_score = Math.min(66, Math.max(34, Math.round(32 + (glucose - 95) * 0.3 + (bmi - 24) * 0.8)));
      risk_band = 'Moderate';
      class_probabilities = { 'Non-Diabetic': 0.26, 'Pre-Diabetic': 0.56, Diabetic: 0.18 };
    } else {
      predicted_class = 'Non-Diabetic';
      risk_score = Math.min(32, Math.max(6, Math.round(12 + (glucose - 80) * 0.25)));
      risk_band = 'Low';
      class_probabilities = { 'Non-Diabetic': 0.84, 'Pre-Diabetic': 0.12, Diabetic: 0.04 };
    }

    const matchedPatient = MOCK_PATIENTS.find(
      (p) => p.patient_id === data.patient_id || p.patient_code === data.patient_id
    );

    const newId = 'pred-' + Date.now();
    const recordId = 'rec-' + Date.now();
    const createdAt = new Date().toISOString();

    const recommendations =
      risk_band === 'High'
        ? [
            { category: 'diet', text: 'Reduce daily carbohydrate intake to under 130g. Prioritize low-glycemic-index foods such as legumes and non-starchy vegetables.' },
            { category: 'diet', text: 'Increase dietary fiber to 25–30g/day through leafy greens, oats, and chia/flaxseeds.' },
            { category: 'lifestyle', text: 'Initiate 150 minutes/week of moderate-intensity aerobic exercise combined with twice-weekly resistance training.' },
            { category: 'lifestyle', text: 'Monitor fasting and 2-hour post-prandial blood glucose daily and maintain a log.' },
            { category: 'follow-up', text: 'Schedule confirmatory HbA1c and fasting lipid panel within 2–4 weeks.' },
            { category: 'follow-up', text: 'Discuss pharmacotherapy initiation and diabetes self-management education referral.' },
          ]
        : risk_band === 'Moderate'
          ? [
              { category: 'diet', text: 'Adopt a Mediterranean-style eating pattern emphasizing whole foods, lean protein, and healthy fats.' },
              { category: 'diet', text: 'Limit added sugars to under 25g/day and replace refined grains with high-fiber whole grains.' },
              { category: 'lifestyle', text: 'Target a gradual 5–7% body weight reduction over 6 months via 30 minutes of daily brisk walking.' },
              { category: 'lifestyle', text: 'Prioritize 7–8 hours of consistent sleep to support insulin sensitivity.' },
              { category: 'follow-up', text: 'Repeat fasting plasma glucose and HbA1c in 12 weeks to evaluate trajectory.' },
            ]
          : [
              { category: 'diet', text: 'Maintain balanced nutrition with abundant vegetables, whole grains, and lean proteins.' },
              { category: 'lifestyle', text: 'Continue regular physical activity (150+ min/week) and routine hydration.' },
              { category: 'follow-up', text: 'Continue standard annual preventive metabolic screening.' },
            ];

    const newPrediction = {
      prediction_id: newId,
      record_id: recordId,
      patient_id: matchedPatient?.patient_id || data.patient_id || 'p1',
      patient_name: matchedPatient?.full_name || `Patient ${data.patient_id}`,
      patient_code: matchedPatient?.patient_code || data.patient_id || 'PAT-CUSTOM',
      predicted_class,
      class_probabilities,
      probability_score: Number((risk_score / 100).toFixed(2)),
      risk_score,
      risk_band,
      model_version: 'v2.1.0',
      explanation: {
        shap_values,
        lime_values,
        top_features,
      },
      recommendations,
      created_at: createdAt,
    };

    saveStoredMockPrediction(newPrediction);

    if (matchedPatient) {
      MOCK_CLINICAL_RECORDS.unshift({
        record_id: recordId,
        patient_id: matchedPatient.patient_id,
        pregnancies,
        glucose,
        blood_pressure: bp,
        skin_thickness: skin,
        insulin,
        bmi,
        hba1c,
        diabetes_pedigree_fn: dpf,
        recorded_at: createdAt,
      });
    }

    return { data: newPrediction };
  },

  getPrediction: async (id) => {
    await mockDelay();
    const pred = getAllMockPredictions().find((p) => p.prediction_id === id);
    if (!pred) throw { response: { status: 404, data: { detail: 'Prediction not found' } } };
    return { data: pred };
  },

  getPredictions: async ({ page = 1, size = 10, risk_band, search } = {}) => {
    await mockDelay();
    let filtered = getAllMockPredictions();
    if (risk_band) filtered = filtered.filter((p) => p.risk_band === risk_band);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (p) => (p.patient_name || '').toLowerCase().includes(s) || (p.patient_code || '').toLowerCase().includes(s)
      );
    }
    const total = filtered.length;
    const start = (page - 1) * size;
    const items = filtered.slice(start, start + size);
    return { data: { items, total, page, size } };
  },

  getPatient: async (id) => {
    await mockDelay();
    const patient = MOCK_PATIENTS.find((p) => p.patient_id === id || p.patient_code === id);
    if (!patient) throw { response: { status: 404, data: { detail: 'Patient not found' } } };
    const records = MOCK_CLINICAL_RECORDS.filter((r) => r.patient_id === patient.patient_id);
    const predictions = getAllMockPredictions().filter((p) => p.patient_id === patient.patient_id);
    return { data: { ...patient, clinical_records: records, predictions } };
  },

  getPatients: async ({ page = 1, size = 20, search } = {}) => {
    await mockDelay();
    let filtered = [...MOCK_PATIENTS];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (p) => p.full_name.toLowerCase().includes(s) || p.patient_code.toLowerCase().includes(s)
      );
    }
    const total = filtered.length;
    const start = (page - 1) * size;
    const items = filtered.slice(start, start + size);
    return { data: { items, total, page, size } };
  },

  getDashboardStats: async () => {
    await mockDelay();
    const allPreds = getAllMockPredictions();
    return {
      data: {
        total_patients: MOCK_PATIENTS.length,
        predictions_this_week: 12 + getStoredMockPredictions().length,
        high_risk_count: allPreds.filter((p) => p.risk_band === 'High').length,
        recent_predictions: allPreds.slice(0, 5),
      },
    };
  },

  changePassword: async () => {
    await mockDelay();
    return { data: { message: 'Password changed successfully' } };
  },

  forgotPassword: async () => {
    await mockDelay();
    return { data: { message: 'If an account with that email exists, a reset link has been sent.' } };
  },
};

// ── Real API Functions ──
const realApi = {
  login: ({ email, password }) => http.post('/api/auth/login', { email, password }),

  register: (data) => http.post('/api/auth/register', data),

  getMe: () => http.get('/api/auth/me'),

  predict: (data) => http.post('/api/predict', data),

  getPrediction: (id) => http.get(`/api/predictions/${id}`),

  getPredictions: ({ page = 1, size = 10, risk_band, search } = {}) => {
    const params = new URLSearchParams({ page, size });
    if (risk_band) params.append('risk_band', risk_band);
    if (search) params.append('search', search);
    return http.get(`/api/predictions?${params.toString()}`);
  },

  getPatient: (id) => http.get(`/api/patients/${id}`),

  getPatients: ({ page = 1, size = 20, search } = {}) => {
    const params = new URLSearchParams({ page, size });
    if (search) params.append('search', search);
    return http.get(`/api/patients?${params.toString()}`);
  },

  getDashboardStats: () => http.get('/api/dashboard/stats'),

  changePassword: (data) => http.put('/api/auth/password', data),

  forgotPassword: (data) => http.post('/api/auth/forgot-password', data),
};

// ── Export the active API based on VITE_USE_MOCK ──
const api = USE_MOCK ? mockApi : realApi;

export const apiLogin = api.login;
export const apiRegister = api.register;
export const apiGetMe = api.getMe;
export const apiPredict = api.predict;
export const apiGetPrediction = api.getPrediction;
export const apiGetPredictions = api.getPredictions;
export const apiGetPatient = api.getPatient;
export const apiGetPatients = api.getPatients;
export const apiGetDashboardStats = api.getDashboardStats;
export const apiChangePassword = api.changePassword;
export const apiForgotPassword = api.forgotPassword;

export default http;

