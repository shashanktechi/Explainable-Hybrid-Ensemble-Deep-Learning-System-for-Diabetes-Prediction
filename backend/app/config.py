"""
Application configuration — all settings loaded from environment / .env file.
Never hardcode secrets here.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Reads values from .env (or real env vars in production)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database (Supabase PostgreSQL)
    database_url: str

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # CORS
    cors_origins: str = "http://localhost:3000"  # comma-separated if multiple

    # ML stub
    model_version: str = "stub-v0"
    use_stub_model: bool = True

    # Logging
    log_level: str = "INFO"

    # Testing (optional — only needed when running tests)
    test_database_url: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        """Split comma-separated CORS_ORIGINS into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()  # type: ignore[call-arg]
