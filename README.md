# XAI-HEDL: Explainable Hybrid Ensemble Deep Learning System for Diabetes Prediction

An explainable, multi-dataset diabetes risk prediction system combining a hybrid ensemble of **DNN + XGBoost + LightGBM** base learners fused by a calibrated **Stack-DNN meta-learner**, with **SHAP** and **LIME** explainability, a **0–100 calibrated risk score**, and personalized diet/lifestyle/follow-up recommendations — delivered through a doctor-facing web dashboard.

---

## Table of Contents
- [XAI-HEDL: Explainable Hybrid Ensemble Deep Learning System for Diabetes Prediction](#xai-hedl-explainable-hybrid-ensemble-deep-learning-system-for-diabetes-prediction)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
  - [System Architecture](#system-architecture)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [1. Clone the repo](#1-clone-the-repo)
    - [2. Backend setup](#2-backend-setup)
    - [3. ML pipeline (train models before first run)](#3-ml-pipeline-train-models-before-first-run)
    - [4. Database setup](#4-database-setup)
    - [5. Frontend setup](#5-frontend-setup)
  - [API Endpoints](#api-endpoints)
  - [Datasets](#datasets)
  - [Project Timeline](#project-timeline)
  - [Team](#team)
  - [Roadmap](#roadmap)
  - [License](#license)

---

## Overview
This project implements a four-model hybrid ensemble (DNN, XGBoost, and LightGBM base learners with a Stack-DNN meta-learner), with SHAP and LIME explanations, risk scoring, and recommendations. The repository does not contain a clinical dataset, and no clinical performance, generalization, or training-time advantage has yet been established.

The training package supports explicitly configured binary and multiclass datasets. Evaluation on external clinical datasets remains necessary before making generalization claims.

## Features
- 🧠 **Hybrid ensemble**: DNN + XGBoost + LightGBM base learners → Stack-DNN meta-learner
- 📊 **Multi-class support**: binary (Diabetic/Non-Diabetic) and 3-class (+ Pre-Diabetic) prediction
- 🔍 **Explainable AI**: SHAP (global + per-patient) and LIME (local, per-patient) explanations
- 🎯 **0–100 Risk Score** with Low / Moderate (Pre-Diabetic watch) / High bands
- 💡 **Personalized recommendations**: diet, lifestyle, and follow-up advice generated from the risk band and top contributing features
- 🩺 **Doctor dashboard**: patient management, prediction history, authentication
- 🗄️ **Full audit trail**: every prediction, explanation, and recommendation persisted to SQL
- 📈 **Evaluation report** with held-out accuracy, balanced accuracy, macro F1, MCC, log loss, ROC AUC, and artifact digest

## Tech Stack

| Layer | Technology |
|---|---|
| Backend / API | Python (FastAPI) |
| ML Core | Scikit-Learn (MLPClassifier DNN, Stack-DNN), XGBoost, LightGBM |
| Explainable AI | SHAP, LIME |
| Frontend | React.js (Vite) + Tailwind CSS + Recharts |
| Database | SQL (PostgreSQL/MySQL) + SQLAlchemy ORM |
| Deployment | GitHub Actions CI, Docker |

## System Architecture
```
Datasets (PIMA-IDD-I, DDFH-G, IDPD-I)
        │
        ▼
Preprocessing (clean → impute → MinMax normalize → SMOTE balance)
        │
        ▼
Feature Selection (Extra Tree Classifier + Gini importance)
        │
        ▼
Hybrid Base Models  ──┬── DNN
                      ├── XGBoost
                      └── LightGBM
        │
        ▼
Stack-DNN Meta-Learner (fuses base model probabilities)
        │
        ├──▶ SHAP + LIME Explainability
        ├──▶ 0–100 Risk Score + Band
        └──▶ Personalized Recommendations
        │
        ▼
FastAPI Backend ──▶ SQL Database ──▶ React.js Dashboard
```

## Project Structure
```
diabetes-prediction-system/
├── backend/         # FastAPI app — routes, schemas, services
├── ml/              # preprocessing, feature selection, one file per algorithm, training, evaluation
├── xai/             # shap_explainer.py, lime_explainer.py, risk_score_calculator.py, recommendation_engine.py
├── database/        # schema.sql, migrations, SQLAlchemy models
├── frontend/        # React.js app — components, pages, services
├── docs/            # IEEE paper, project report
└── README.md
```
The project-structure PDF referenced by the original specification was not included in this checkout. See [ml/README.md](ml/README.md) for the implemented training contract, leakage controls, evaluation outputs, and limitations.

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL or MySQL
- Git

### 1. Clone the repo
```bash
git clone https://github.com/<org-or-username>/diabetes-prediction-system.git
cd diabetes-prediction-system
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # fill in DB_URL, JWT_SECRET, MODEL_PATH
uvicorn app.main:app --reload
```

### 3. ML pipeline (provide data contract before training)
```bash
cd ml
pip install -r requirements.txt
python -m ml.train --csv <dataset.csv> --label <target-column> --features <canonical-feature-keys...> --feature-map '<JSON source-to-canonical mapping>' --class-map '<JSON source-label-to-API-class mapping>' --output ml/saved_models
```

### 4. Database setup
```bash
cd database
psql -U <user> -d <dbname> -f schema.sql
# or: mysql -u <user> -p <dbname> < schema.sql
```

### 5. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env               # set VITE_API_BASE_URL, VITE_USE_MOCK=false
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Doctor/admin login |
| POST | `/api/auth/register` | Create pending doctor account and send verification code |
| POST | `/api/auth/verify-email` | Verify account using emailed six-digit code |
| POST | `/api/auth/resend-verification` | Resend an account verification code |
| POST | `/api/auth/forgot-password` | Request a password reset code (generic response) |
| POST | `/api/auth/reset-password` | Validate reset code and set a new password |
| POST | `/api/auth/password-change-otp` | Send code to verified account for password change |
| PUT | `/api/auth/password` | Change password with current password and email code |
| GET | `/api/auth/me` | Current session user |
| POST | `/api/predict` | Submit lab values → prediction + risk score |
| GET | `/api/predictions/:id` | Full result incl. SHAP/LIME + recommendations |
| GET | `/api/predictions` | Paginated prediction history |
| GET | `/api/patients/:id` | Patient profile + record timeline |

### Configure email OTP

Email verification, password recovery, and password changes require outbound SMTP. Copy the `SMTP_*` and `OTP_*` values from `.env.example` into a local, untracked `.env`; for Gmail, use `smtp.gmail.com:587`, enable two-step verification, and create a Google App Password. Put that app password in `SMTP_PASSWORD` and use a separate random value for `OTP_HASH_SECRET`. Never commit these values or paste them into source code. Existing accounts are treated as verified during migration; self-registered accounts must verify before login. Codes are hashed in SQL, expire after 10 minutes, allow five attempts, and have a one-minute resend cooldown. Unknown email addresses receive the same forgot-password response as known addresses.

Apply migrations with `alembic upgrade head` before deploying. If SMTP is not configured, registration and OTP email requests fail closed with HTTP 503 rather than claiming an email was sent. To use your local `.env` SMTP settings with the disposable test database, start the API with `.\backend\scripts\run_postman_test_server.ps1 -UseConfiguredSmtp`; then complete signup in the frontend with an inbox you can access. The default Postman smoke run disables email delivery and checks the safe unconfigured behavior.

### Run the Postman API checks (Windows)

From the repository root, prepare and start the local API against a disposable SQLite database:

```powershell
.\backend\scripts\run_postman_test_server.ps1
```

Import `backend/postman/XAI-HEDL API.postman_collection.json` into Postman and run the collection. It covers the OpenAPI route inventory, OTP configuration/error behavior, auth and role checks, patient and clinical-record CRUD, predictions and history, model registry, and audit logging. The script resets only `%TEMP%\xaihedl_postman_test.db` and creates synthetic admin and doctor accounts; it does not use `database/` credentials. Stop the server with Ctrl+C.

To exercise the trained Pima artifact and real SHAP/LIME explanations instead of the development stub, start with:

```powershell
.\backend\scripts\run_postman_test_server.ps1 -UseTrainedModel
```

Set the collection variable `expectedExplanation` to `Kernel SHAP + LIME` for that run; leave it as `stub` for the default server. The trained Pima artifact is binary and exploratory; it does not validate a three-class pre-diabetes model or establish clinical performance.

## Datasets

No dataset files are bundled in this checkout. Dataset names and public links below are project notes; confirm source versions, licenses, target definitions, and column mappings before training. Training does not infer target or feature columns.

| Dataset | Size | Source |
|---|---|---|
| **PIMA-IDD-I** (Pima Indians Diabetes Database) | 768 rows, binary | [Kaggle](https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database) |
| **DDFH-G** (Diabetes Dataset, Frankfurt Hospital, Germany) | 2,000 rows, binary | [Kaggle](https://www.kaggle.com/datasets/johndasilva/diabetes) |
| **IDPD-I** (Iraqi Diabetes Patients Dataset) | 1,000 rows, 3-class | [Mendeley Data](https://data.mendeley.com/datasets/wj9rwkp9c2/1) (official source — cite this, not Kaggle mirrors) |

## Project Timeline

| Days | Dates | Phase |
|---|---|---|
| 1–3 | Nov 6–8 | Setup & Data |
| 4–6 | Nov 9–11 | Preprocessing & Base Models |
| 7–9 | Nov 12–14 | Meta-Model & DB Integration |
| 10–12 | Nov 15–17 | Explainable AI Integration |
| 13–15 | Nov 18–20 | Evaluation & Multi-dataset Testing |
| 16–17 | Nov 21–22 | Integration Testing |
| 18–19 | Nov 23–24 | Documentation & Demo Prep |
| 20 | Nov 25 | Final Submission |

Full day-by-day plan with owners: `docs/Diabetes_Prediction_Project_Structure.pdf`.

## Team

| Name | Role |
|---|---|
| **Sanjana** | Backend & ML/XAI Developer (Python, model training, SHAP/LIME integration) |
| **Shashank** | Frontend Developer (React.js) |
| **Santhosh** | Database Developer (SQL schema, ORM, migrations) |
| **Prashanth** | Deployment & GitHub Lead (CI/CD, hosting, repo management) |

*Final-year B.Tech CSE, Madanapalle Institute of Technology & Science*

## Roadmap
- [ ] Add mobile app (React Native) for on-the-go risk checks
- [ ] Integrate wearable device data (continuous glucose monitors)
- [ ] Multi-language support for recommendations
- [ ] Federated learning across hospital datasets for privacy-preserving retraining

## License
This project is for academic purposes as part of a final-year B.Tech CSE capstone project. Dataset licenses belong to their respective sources (see [Datasets](#datasets) above).
