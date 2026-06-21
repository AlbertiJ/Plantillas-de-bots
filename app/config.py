"""
============================================
app/config.py — configuración central
============================================

Lee .env y expone settings tipados con pydantic-settings.
# MODIFICAR: agregar nuevas variables a medida que aparezcan.
"""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ---- Telegram ----
    # MODIFICAR: en Fase 3 esto se vuelve un pool de perfiles (commit 10)
    telegram_bot_token: str = ""

    # ---- APIs externas ----
    sherlock_api_key: str = ""
    subfinder_api_key: str = ""
    nuclei_api_key: str = ""

    # ---- App ----
    secret_key: str = ""
    data_dir: str = "./data"
    port: int = 8000
    env: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
BASE_DIR = Path(__file__).resolve().parent.parent
