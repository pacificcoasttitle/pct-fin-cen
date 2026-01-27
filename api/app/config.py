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
        # Default origins include localhost and known Vercel deployments
        default_origins = [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://pct-fin-cen-6wx3.vercel.app",  # Production Vercel
            "https://pct-fincen.vercel.app",        # Custom domain if used
        ]
        
        origins_str = os.getenv("CORS_ORIGINS", "")
        if origins_str:
            # Parse env var and add to defaults
            env_origins = [origin.strip().rstrip("/") for origin in origins_str.split(",") if origin.strip()]
            # Combine and dedupe
            all_origins = list(set(default_origins + env_origins))
            return all_origins
        
        return default_origins


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
