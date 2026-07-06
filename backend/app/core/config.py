from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Personal Finance Advisor"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/financeai"

    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://frontend:3000",
    ]

    # AI (optional OpenAI/Anthropic key for chatbot)
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Upload
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
