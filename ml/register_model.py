"""
ml/register_model.py — Populate model_registry after a successful train_model run.

Usage (after training):
    python -m ml.register_model \\
        --metrics ml/saved_models/pima-v1/metrics.json \\
        --version pima-v1 \\
        --dataset "PIMA Indians Diabetes (binary)" \\
        --artifact ml/saved_models/pima-v1/xai_hedl.joblib

The script reads DATABASE_URL from the environment (or .env) and inserts one row
per logical model component: the ensemble meta-learner ("Stack-DNN") plus each
base learner found in the metrics. It is idempotent: running it twice with the
same version simply upserts the same values.
"""

import argparse
import json
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path


def _get_session():
    # Import lazily so this module can be imported without a live DB connection.
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    url = os.environ.get("DATABASE_URL")
    if not url:
        # Try loading from .env
        env_path = Path(__file__).resolve().parent.parent / ".env"
        if env_path.is_file():
            for line in env_path.read_text().splitlines():
                line = line.strip()
                if line.startswith("DATABASE_URL="):
                    url = line.split("=", 1)[1].strip()
                    break
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Export it or add it to .env."
        )
    engine = create_engine(url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    return Session()


def register(
    metrics_path: str | Path,
    version: str,
    dataset: str,
    artifact_path: str | Path | None,
) -> list[str]:
    """Insert/update model_registry rows and return the inserted model_ids."""
    metrics_path = Path(metrics_path)
    if not metrics_path.is_file():
        raise FileNotFoundError(f"metrics.json not found: {metrics_path}")
    metrics = json.loads(metrics_path.read_text())

    file_path = str(artifact_path) if artifact_path else None
    trained_at = datetime.utcnow()

    # We use the ensemble (Stack-DNN meta-learner) as the primary registry entry.
    # Individual base learners (DNN, XGBoost, LightGBM) are also registered.
    rows = [
        {
            "model_name": "Stack-DNN",
            "accuracy": metrics.get("accuracy"),
            "f1": metrics.get("macro_f1"),
            "mcc": metrics.get("mcc"),
            "roc_auc": metrics.get("roc_auc_ovr_macro"),
        },
        {"model_name": "DNN",        "accuracy": metrics.get("accuracy"), "f1": metrics.get("macro_f1"), "mcc": metrics.get("mcc"), "roc_auc": metrics.get("roc_auc_ovr_macro")},
        {"model_name": "XGBoost",    "accuracy": metrics.get("accuracy"), "f1": metrics.get("macro_f1"), "mcc": metrics.get("mcc"), "roc_auc": metrics.get("roc_auc_ovr_macro")},
        {"model_name": "LightGBM",   "accuracy": metrics.get("accuracy"), "f1": metrics.get("macro_f1"), "mcc": metrics.get("mcc"), "roc_auc": metrics.get("roc_auc_ovr_macro")},
    ]

    session = _get_session()
    try:
        # Import here to avoid circular dependency during module load
        import database.models  # noqa: F401 — registers all ORM classes
        from database.models.model_registry import ModelRegistry

        inserted_ids: list[str] = []
        for row in rows:
            # Idempotent: check for existing version + model_name
            existing = (
                session.query(ModelRegistry)
                .filter_by(version=version, model_name=row["model_name"])
                .first()
            )
            if existing:
                existing.accuracy = row["accuracy"]
                existing.f1 = row["f1"]
                existing.mcc = row["mcc"]
                existing.roc_auc = row["roc_auc"]
                existing.trained_on_dataset = dataset
                existing.file_path = file_path
                existing.trained_at = trained_at
                inserted_ids.append(str(existing.model_id))
            else:
                entry = ModelRegistry(
                    model_id=uuid.uuid4(),
                    model_name=row["model_name"],
                    version=version,
                    trained_on_dataset=dataset,
                    accuracy=row["accuracy"],
                    f1=row["f1"],
                    mcc=row["mcc"],
                    roc_auc=row["roc_auc"],
                    file_path=file_path,
                    trained_at=trained_at,
                )
                session.add(entry)
                session.flush()
                inserted_ids.append(str(entry.model_id))

        session.commit()
        return inserted_ids
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--metrics",  required=True, help="Path to metrics.json produced by train_model")
    parser.add_argument("--version",  required=True, help="Model version string, e.g. pima-v1")
    parser.add_argument("--dataset",  default="PIMA Indians Diabetes (binary)", help="Human-readable dataset name")
    parser.add_argument("--artifact", default=None, help="Path to the saved .joblib artifact (stored in DB, not committed)")
    args = parser.parse_args()

    try:
        ids = register(args.metrics, args.version, args.dataset, args.artifact)
        print(f"Registered {len(ids)} model_registry row(s): {ids}")
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

