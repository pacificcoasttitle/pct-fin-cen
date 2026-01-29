"""
Application configuration using environment variables.
"""
import os
from functools import lru_cache
from typing import List, Optional


class Settings:
    """Application settings loaded from environment variables."""
    
    def __init__(self):
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "")
        self.APP_BASE_URL: str = os.getenv("APP_BASE_URL", "http://localhost:3000")
        self.CORS_ORIGINS: List[str] = self._parse_cors_origins()
        self.APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        self.DEMO_SECRET: str = os.getenv("DEMO_SECRET", "")
        
        # Cloudflare R2 Configuration (Document Storage)
        self.R2_ACCOUNT_ID: str = os.getenv("R2_ACCOUNT_ID", "")
        self.R2_ACCESS_KEY_ID: str = os.getenv("R2_ACCESS_KEY_ID", "")
        self.R2_SECRET_ACCESS_KEY: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
        self.R2_BUCKET_NAME: str = os.getenv("R2_BUCKET_NAME", "pct-fincen-documents")
        self.MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
        self.ALLOWED_FILE_TYPES: List[str] = self._parse_allowed_file_types()
    
    def _parse_allowed_file_types(self) -> List[str]:
        """Parse allowed file types from comma-separated string."""
        default_types = ["image/jpeg", "image/png", "application/pdf"]
        types_str = os.getenv("ALLOWED_FILE_TYPES", "")
        if types_str:
            return [t.strip() for t in types_str.split(",") if t.strip()]
        return default_types
    
    @property
    def r2_configured(self) -> bool:
        """Check if R2 is properly configured."""
        return bool(self.R2_ACCOUNT_ID and self.R2_ACCESS_KEY_ID and self.R2_SECRET_ACCESS_KEY)
    
    def _parse_cors_origins(self) -> List[str]:
        """Parse CORS_ORIGINS from comma-separated string."""
        # Default origins include localhost and known deployments
        default_origins = [
            # Local development
            "http://localhost:3000",
            "http://localhost:3001",
            # Vercel deployments
            "https://pct-fin-cen-6wx3.vercel.app",
            "https://pct-fincen.vercel.app",
            # Production domain
            "https://fincenclear.com",
            "https://www.fincenclear.com",
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
