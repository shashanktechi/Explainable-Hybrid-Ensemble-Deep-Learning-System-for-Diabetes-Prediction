# XAI-HEDL: Explainable Hybrid Ensemble Deep Learning System for Diabetes Prediction

An explainable, multi-dataset diabetes risk prediction system combining a hybrid ensemble of **DNN + XGBoost + LightGBM** base learners fused by a calibrated **Stack-DNN meta-learner**, with **SHAP** and **LIME** explainability, a **0–100 calibrated risk score**, and personalized diet/lifestyle/follow-up recommendations — delivered through a doctor-facing web dashboard.

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Datasets](#datasets)
- [Project Timeline](#project-timeline)
- [Team](#team)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview
Existing diabetes prediction systems often train 5–6 separate deep models (Stack-ANN, LSTM, CNN, etc.), which is slow to train and gives doctors a prediction with no explanation of *why*. This project replaces that with a **lighter 4-model hybrid ensemble** (3 base learners + 1 meta-learner), cutting training time by an estimated 3–5x, while adding **SHAP and LIME** so every prediction comes with a biomarker-level explanation, a calibrated risk score, and concrete next-step recommendations — not just a binary label.

The system is evaluated across three public clinical datasets (binary and multi-class) to confirm it generalizes rather than overfitting to one population.

## Features
- 🧠 **Hybrid ensemble**: DNN + XGBoost + LightGBM base learners → Stack-DNN meta-learner
- 📊 **Multi-class support**: binary (Diabetic/Non-Diabetic) and 3-class (+ Pre-Diabetic) prediction
- 🔍 **Explainable AI**: SHAP (global + per-patient) and LIME (local, per-patient) explanations
- 🎯 **0–100 Risk Score** with Low / Moderate (Pre-Diabetic watch) / High bands
- 💡 **Personalized recommendations**: diet, lifestyle, and follow-up advice generated from the risk band and top contributing features
- 🩺 **Doctor dashboard**: patient management, prediction history, authentication
- 🗄️ **Full audit trail**: every prediction, explanation, and recommendation persisted to SQL
- 📈 **Benchmarked** against existing Stack-ANN/LSTM/CNN approaches on training time and accuracy

## Tech Stack

| Layer | Technology |
|---|---|
| Backend / API | Python (FastAPI) |
| ML Core | TensorFlow/Keras (DNN), XGBoost, LightGBM, Scikit-Learn |
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
Full file-by-file breakdown lives in `docs/Diabetes_Prediction_Project_Structure.pdf`.

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

### 3. ML pipeline (train models before first run)
```bash
cd ml
pip install -r requirements.txt
python training/train_pipeline.py --dataset pima      # or ddfh, idpd
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
| POST | `/api/auth/register` | Doctor/admin registration |
| GET | `/api/auth/me` | Current session user |
| POST | `/api/predict` | Submit lab values → prediction + risk score |
| GET | `/api/predictions/:id` | Full result incl. SHAP/LIME + recommendations |
| GET | `/api/predictions` | Paginated prediction history |
| GET | `/api/patients/:id` | Patient profile + record timeline |

## Datasets

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
| **Kisannagari Shashank** | Backend & ML/XAI Developer (Python, model training, SHAP/LIME integration) |
| **[Teammate Name]** | Frontend Developer (React.js) |
| **[Teammate Name]** | Database Developer (SQL schema, ORM, migrations) |
| **[Teammate Name]** | Deployment & GitHub Lead (CI/CD, hosting, repo management) |

*Final-year B.Tech CSE, Madanapalle Institute of Technology & Science*

## Roadmap
- [ ] Add mobile app (React Native) for on-the-go risk checks
- [ ] Integrate wearable device data (continuous glucose monitors)
- [ ] Multi-language support for recommendations
- [ ] Federated learning across hospital datasets for privacy-preserving retraining

## License
This project is for academic purposes as part of a final-year B.Tech CSE capstone project. Dataset licenses belong to their respective sources (see [Datasets](#datasets) above).
