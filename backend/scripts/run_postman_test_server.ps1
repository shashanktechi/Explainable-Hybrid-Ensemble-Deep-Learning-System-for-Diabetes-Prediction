param(
    [switch]$UseTrainedModel,
    [switch]$UseConfiguredSmtp
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$testDb = Join-Path $env:TEMP "xaihedl_postman_test.db"
Set-Location $projectRoot
$env:PYTHONPATH = $projectRoot

# This script always points at a disposable temp database and resets it.
$env:DATABASE_URL = "sqlite:///$($testDb -replace '\\','/')"
$env:JWT_SECRET = "local-only-postman-test-secret-do-not-deploy"
if (-not $UseConfiguredSmtp) {
    $env:SMTP_HOST = ""
    $env:SMTP_USERNAME = ""
    $env:SMTP_PASSWORD = ""
    $env:SMTP_FROM_EMAIL = ""
}

if ($UseTrainedModel) {
    $env:MODEL_VERSION = "pima-v1"
    $env:MODEL_ARTIFACT_PATH = "ml/saved_models/pima-v1/xai_hedl.joblib"
    $env:USE_STUB_MODEL = "false"
} else {
    $env:MODEL_VERSION = "postman-stub-test"
    $env:MODEL_ARTIFACT_PATH = "ml/saved_models/pima-v1/xai_hedl.joblib"
    $env:USE_STUB_MODEL = "true"
}

python backend/scripts/seed_postman_test_db.py
if ($LASTEXITCODE -ne 0) {
    throw "Could not prepare the disposable Postman database."
}

Write-Host "Starting local API on http://127.0.0.1:8000 (Ctrl+C to stop)."
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --log-level warning
