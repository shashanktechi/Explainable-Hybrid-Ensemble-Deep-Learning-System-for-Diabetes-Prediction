# XAI-HEDL training package

The uploaded files are exploratory public datasets, not a clinically approved training cohort. Training requires explicit CSV, target, feature, and class mappings. Reported held-out metrics describe this dataset split only; they do not establish clinical validity or generalization.

## Uploaded data audit

- `database/pima-indians-diabetes.csv`: 768 rows, 9 columns, no header row, binary `Outcome` values (0/1), no exact duplicate rows. It follows the standard Pima column order. The Pima population is limited to women of Pima heritage; model use outside that population needs external validation.
- `database/diabetes.csv`: 2,000 rows, 1,256 exact duplicate rows, and 744 unique rows. Of those unique rows, 734 exactly match rows in the Pima file. Its provenance is not independently established, so do not treat it as an independent Frankfurt validation cohort.

The Pima training run used explicit column names and mapping, mapped 0→Non-Diabetic and 1→Diabetic, and treated zero as missing for glucose, blood pressure, skin thickness, insulin, and BMI before fold-fitted imputation. Pregnancies=0 remains a valid value. This zero-coding interpretation is dataset-specific and should not be carried over to other data without checking their documentation.

Reproduce the run from the repository root:

```powershell
python -m ml.train --csv database/pima-indians-diabetes.csv --headerless --column-names Pregnancies Glucose BloodPressure SkinThickness Insulin BMI DiabetesPedigreeFunction Age Outcome --label Outcome --features pregnancies glucose blood_pressure skin_thickness insulin bmi diabetes_pedigree_fn age --feature-map '{"Pregnancies":"pregnancies","Glucose":"glucose","BloodPressure":"blood_pressure","SkinThickness":"skin_thickness","Insulin":"insulin","BMI":"bmi","DiabetesPedigreeFunction":"diabetes_pedigree_fn","Age":"age"}' --class-map '{"0":"Non-Diabetic","1":"Diabetic"}' --zero-as-missing glucose,blood_pressure,skin_thickness,insulin,bmi --resampling none --output ml/saved_models/pima-v1 --seed 42
```

The current local artifact and held-out metrics are in `ml/saved_models/pima-v1/`. This seeded 154-row test split reported accuracy 0.740, balanced accuracy 0.694, macro F1 0.701, MCC 0.409, ROC AUC 0.641, and log loss 0.607. These are exploratory baseline results from one split, not a clinically validated predictor or an estimate of performance on other populations.

Install `ml/requirements.txt`, then run from the repository root:

```powershell
python -m ml.train --csv data.csv --label Outcome --features pregnancies glucose blood_pressure skin_thickness insulin bmi diabetes_pedigree_fn --feature-map '{"Pregnancies":"pregnancies","Glucose":"glucose","BloodPressure":"blood_pressure","SkinThickness":"skin_thickness","Insulin":"insulin","BMI":"bmi","DiabetesPedigreeFunction":"diabetes_pedigree_fn"}' --class-map '{"0":"Non-Diabetic","1":"Diabetic"}' --resampling none --output ml/saved_models
```

For three classes, map source labels explicitly to `Non-Diabetic`, `Pre-Diabetic`, and `Diabetic`. Use `--resampling smote` only when the data owner confirms synthetic minority oversampling is appropriate. The resampler is applied only to training folds and the proper-training fit; calibration and test rows are never resampled.

The pipeline removes duplicate rows, validates configured columns and labels, imputes missing numeric/categorical predictors, maps categoricals and scales numeric values, selects features with Extra Trees, builds out-of-fold DNN/XGBoost/LightGBM probabilities, trains a Stack-DNN, calibrates on a separate calibration partition, and evaluates once on a held-out test partition. The test split is not used for fitting or model selection. `metrics.json` includes accuracy, balanced accuracy, macro F1, MCC, multiclass Brier score, log loss, one-vs-rest ROC AUC (when defined), row count, seed, and artifact SHA-256.

Feature-map values must be canonical prediction API keys (`age`, `gender`, `pregnancies`, `glucose`, `blood_pressure`, `skin_thickness`, `insulin`, `bmi`, `hba1c`, `diabetes_pedigree_fn`); map source dataset names explicitly with `--feature-map`. Prediction requests use the patient's saved age and gender, and each clinical record snapshots those demographics. The DNN base learner is a three-hidden-layer scikit-learn MLP. SHAP uses Kernel SHAP on the complete probability pipeline and LIME uses its tabular explainer; both return local approximations, not exact causal effects, and can be computationally expensive. An explicit class mapping is required by the current API for serving binary or multi-class models under the canonical three-class response.

## Limits and deployment

Risk bands in the API (0–30 Low, 31–65 Moderate, 66–100 High) are application bands, not validated diagnostic thresholds. The numeric score formula combines calibrated probabilities and requires clinical validation on a representative external cohort before clinical use. Outputs are decision support, not diagnosis or treatment advice. Recommendations must be approved by clinical stakeholders for their intended population.

For a local exploratory run of this specific Pima artifact, set `USE_STUB_MODEL=false`, `MODEL_ARTIFACT_PATH=ml/saved_models/pima-v1/xai_hedl.joblib`, and `MODEL_VERSION=pima-v1` in the backend environment. Start the API from the repository root so this relative path resolves. The Pima model is binary and does not estimate a pre-diabetic class. Do not use it for clinical decisions. Apply Alembic migrations with `alembic upgrade head`. Keep artifacts immutable; each new prediction stores its SHA-256 digest and probability vector. The sample `.env.example` remains in demo stub mode by default.
