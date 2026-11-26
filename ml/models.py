"""Base learner factories. Optional learner packages fail with actionable errors."""

from sklearn.neural_network import MLPClassifier


def make_base_models(seed: int = 42):
    models = {
        "dnn": MLPClassifier(hidden_layer_sizes=(128, 64, 32), activation="relu",
                              solver="adam", early_stopping=True, max_iter=400,
                              random_state=seed),
    }
    try:
        from xgboost import XGBClassifier
    except ImportError as exc:
        raise RuntimeError("Install ml/requirements.txt to train the XGBoost learner") from exc
    try:
        from lightgbm import LGBMClassifier
    except ImportError as exc:
        raise RuntimeError("Install ml/requirements.txt to train the LightGBM learner") from exc
    models["xgboost"] = XGBClassifier(n_estimators=300, max_depth=4, learning_rate=0.04,
                                    subsample=0.85, colsample_bytree=0.85,
                                    eval_metric="logloss", random_state=seed, n_jobs=-1)
    models["lightgbm"] = LGBMClassifier(n_estimators=300, num_leaves=15,
                                       learning_rate=0.04, class_weight="balanced",
                                       verbosity=-1, random_state=seed, n_jobs=-1)
    return models
