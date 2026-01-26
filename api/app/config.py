"""
Application configuration using environment variables.
"""
import os
from functools import lru_cache
from typing import List


class Settings:
    """Application settings loaded from environment variables."""
    
    def __init__(self):
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "")
        self.APP_BASE_URL: str = os.getenv("APP_BASE_URL", "http://localhost:3000")
        self.CORS_ORIGINS: List[str] = self._parse_cors_origins()
        self.APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        self.DEMO_SECRET: str = os.getenv("DEMO_SECRET", "")
    
    def _parse_cors_origins(self) -> List[str]:
        """Parse CORS_ORIGINS from comma-separated string."""
        origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
        # Remove trailing slashes and whitespace from each origin
        return [origin.strip().rstrip("/") for origin in origins_str.split(",") if origin.strip()]


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
