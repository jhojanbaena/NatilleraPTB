"""Configuración general de la aplicación con Pydantic Settings v2."""
from typing import List, Union
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    PROJECT_NAME: str = "Sistema de Gestión Natillera API"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False

    # Seguridad y JWT
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas por defecto

    # PostgreSQL
    DATABASE_URL: str

    # CORS
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:5173,http://localhost:8000"

    @model_validator(mode="after")
    def validate_settings(self) -> "Settings":
        if len(self.SECRET_KEY) < 32:
            raise ValueError("")
        if make_url(self.DATABASE_URL).get_backend_name() != "postgresql":
            raise ValueError("DATABASE_URL debe usar PostgreSQL")
        return self

    @property
    def cors_origins_list(self) -> List[str]:
        """Convierte la cadena de orígenes CORS separados por coma en una lista."""
        if isinstance(self.BACKEND_CORS_ORIGINS, str):
            return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]
        return self.BACKEND_CORS_ORIGINS

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        hide_input_in_errors=True,
        extra="ignore"
    )


settings = Settings()
