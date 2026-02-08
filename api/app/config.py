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
        
        # ═══════════════════════════════════════════════════════════════════════
        # FinCEN SDTM (Secure Direct Transfer Mode) Configuration
        # ═══════════════════════════════════════════════════════════════════════
        
        # Transport mode: "mock" (default), "sdtm" (real FinCEN)
        self.FINCEN_TRANSPORT: str = os.getenv("FINCEN_TRANSPORT", "mock")
        
        # FinCEN environment: "sandbox" or "production"
        self.FINCEN_ENV: str = os.getenv("FINCEN_ENV", "sandbox")
        
        # SDTM SFTP connection settings
        self.SDTM_HOST: str = os.getenv("SDTM_HOST", self._default_sdtm_host())
        self.SDTM_PORT: int = int(os.getenv("SDTM_PORT", "2222"))
        self.SDTM_USERNAME: str = os.getenv("SDTM_USERNAME", "")
        self.SDTM_PASSWORD: str = os.getenv("SDTM_PASSWORD", "")
        
        # SDTM directory paths on remote server
        self.SDTM_SUBMISSIONS_DIR: str = os.getenv("SDTM_SUBMISSIONS_DIR", "submissions")
        self.SDTM_ACKS_DIR: str = os.getenv("SDTM_ACKS_DIR", "acks")
        
        # Organization name for SDTM filename (sanitized alphanumeric)
        self.SDTM_ORGNAME: str = self._sanitize_orgname(os.getenv("SDTM_ORGNAME", "PCTITLE"))
        
        # Transmitter identification (REQUIRED for FBARX)
        self.TRANSMITTER_TIN: str = os.getenv("TRANSMITTER_TIN", "")  # 9 digits, no hyphens
        self.TRANSMITTER_TCC: str = os.getenv("TRANSMITTER_TCC", "")  # Must start with "P", length 8
        
        # ═══════════════════════════════════════════════════════════════════════
        # PDFShift Configuration (Invoice PDF Generation)
        # ═══════════════════════════════════════════════════════════════════════
        self.PDFSHIFT_API_KEY: str = os.getenv("PDFSHIFT_API_KEY", "")
        self.PDFSHIFT_ENABLED: bool = os.getenv("PDFSHIFT_ENABLED", "false").lower() == "true"
        
        # ═══════════════════════════════════════════════════════════════════════
        # Notification Configuration
        # ═══════════════════════════════════════════════════════════════════════
        self.STAFF_NOTIFICATION_EMAIL: str = os.getenv("STAFF_NOTIFICATION_EMAIL", "staff@fincenclear.com")
        self.ADMIN_NOTIFICATION_EMAIL: str = os.getenv("ADMIN_NOTIFICATION_EMAIL", "admin@fincenclear.com")
        self.COO_NOTIFICATION_EMAIL: str = os.getenv("COO_NOTIFICATION_EMAIL", "")  # Optional
        self.FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://fincenclear.com")
        
        # ═══════════════════════════════════════════════════════════════════════
        # Auto-File Configuration
        # ═══════════════════════════════════════════════════════════════════════
        self.AUTO_FILE_ENABLED: bool = os.getenv("AUTO_FILE_ENABLED", "true").lower() == "true"
        self.AUTO_FILE_DELAY_SECONDS: int = int(os.getenv("AUTO_FILE_DELAY_SECONDS", "0"))
    
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
    
    def _default_sdtm_host(self) -> str:
        """Return default SDTM host based on FINCEN_ENV."""
        env = os.getenv("FINCEN_ENV", "sandbox")
        if env == "production":
            return "bsaefiling-direct-transfer.fincen.gov"
        return "bsaefiling-direct-transfer-sandbox.fincen.gov"
    
    def _sanitize_orgname(self, name: str) -> str:
        """Sanitize org name to alphanumeric only (SDTM filename requirement)."""
        import re
        return re.sub(r'[^a-zA-Z0-9]', '', name)[:20] or "UNNAMED"
    
    @property
    def sdtm_configured(self) -> bool:
        """Check if SDTM is properly configured for live filing."""
        return bool(
            self.FINCEN_TRANSPORT == "sdtm"
            and self.SDTM_USERNAME
            and self.SDTM_PASSWORD
            and self.TRANSMITTER_TIN
            and self.TRANSMITTER_TCC
        )
    
    @property
    def transmitter_configured(self) -> bool:
        """Check if transmitter identification is configured."""
        return bool(self.TRANSMITTER_TIN and self.TRANSMITTER_TCC)
    
    @property
    def pdfshift_configured(self) -> bool:
        """Check if PDFShift is properly configured."""
        return bool(self.PDFSHIFT_ENABLED and self.PDFSHIFT_API_KEY)
    
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
