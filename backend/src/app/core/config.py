from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/appdb"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    google_client_id: str = ""
    allowed_origins: str = "http://localhost:3000"

    # Email
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@syriaprojects.com"
    smtp_tls: bool = True
    email_console_mode: bool = True  # In dev: Token in Konsole ausgeben statt Email senden
    resend_api_key: str = ""

    # URLs
    frontend_url: str = "http://localhost:3000"

    # Token expiry
    email_verification_expire_hours: int = 24
    password_reset_expire_minutes: int = 60

    class Config:
        env_file = ".env"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()
