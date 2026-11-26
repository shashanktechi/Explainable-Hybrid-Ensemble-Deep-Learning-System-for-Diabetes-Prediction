"""CLI: python -m ml.train --csv data.csv --label Outcome --features Glucose BMI"""

import argparse
import json

from ml.preprocessing import DatasetContract
from ml.training import train_model


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", required=True)
    parser.add_argument("--label", required=True)
    parser.add_argument("--features", nargs="+", required=True)
    parser.add_argument("--output", default="ml/saved_models")
    parser.add_argument("--resampling", choices=("none", "smote"), default="none")
    parser.add_argument("--folds", type=int, default=5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--class-map", help='JSON mapping, e.g. "{\\"0\\":\\"Non-Diabetic\\",\\"1\\":\\"Diabetic\\"}"')
    parser.add_argument("--feature-map", help='JSON mapping source columns to API keys, e.g. "{\\"Glucose\\":\\"glucose\\"}"')
    parser.add_argument("--zero-as-missing", help="Comma-separated canonical features where zero encodes missingness")
    parser.add_argument("--headerless", action="store_true", help="Read CSV without a header row")
    parser.add_argument("--column-names", nargs="+", help="All source column names in file order (required with --headerless)")
    args = parser.parse_args()
    mapping = json.loads(args.class_map) if args.class_map else None
    feature_mapping = json.loads(args.feature_map) if args.feature_map else None
    zero_as_missing = tuple(item.strip() for item in args.zero_as_missing.split(",") if item.strip()) if args.zero_as_missing else ()
    result = train_model(args.csv, DatasetContract(args.label, tuple(args.features), class_mapping=mapping,
                                                    feature_mapping=feature_mapping,
                                                    zero_as_missing=zero_as_missing), args.output,
                         folds=args.folds, resampling=args.resampling, seed=args.seed,
                         headerless=args.headerless, column_names=args.column_names)
    print(result)


if __name__ == "__main__":
    main()
