"""
SDTM (Secure Direct Transfer Mode) SFTP Client for FinCEN.

Provides secure file transfer capabilities for:
- Uploading FBARX XML files to /submissions
- Downloading response files from /acks
"""
import logging
import time
from typing import Optional, List, Tuple
from dataclasses import dataclass

import paramiko

from app.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class SdtmFile:
    """Represents a file on the SDTM server."""
    filename: str
    size: int
    mtime: float


class SdtmConnectionError(Exception):
    """Raised when SFTP connection fails."""
    pass


class SdtmUploadError(Exception):
    """Raised when file upload fails."""
    pass


class SdtmDownloadError(Exception):
    """Raised when file download fails."""
    pass


class SdtmClient:
    """
    SFTP client for FinCEN SDTM (Secure Direct Transfer Mode).
    
    Handles:
    - Connection with retries and timeouts
    - Uploading XML files to /submissions
    - Listing and downloading files from /acks
    
    Usage:
        settings = get_settings()
        client = SdtmClient(
            host=settings.SDTM_HOST,
            port=settings.SDTM_PORT,
            username=settings.SDTM_USERNAME,
            password=settings.SDTM_PASSWORD,
        )
        
        with client.connect() as sftp:
            client.upload(sftp, "file.xml", xml_content)
            files = client.list_acks(sftp)
            content = client.download(sftp, "file.MESSAGES.XML")
    """
    
    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        submissions_dir: str = "submissions",
        acks_dir: str = "acks",
        connect_timeout: int = 30,
        max_retries: int = 3,
        retry_delay: float = 2.0,
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.submissions_dir = submissions_dir
        self.acks_dir = acks_dir
        self.connect_timeout = connect_timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        
        self._transport: Optional[paramiko.Transport] = None
        self._sftp: Optional[paramiko.SFTPClient] = None
    
    @classmethod
    def from_settings(cls) -> "SdtmClient":
        """Create client from application settings."""
        settings = get_settings()
        return cls(
            host=settings.SDTM_HOST,
            port=settings.SDTM_PORT,
            username=settings.SDTM_USERNAME,
            password=settings.SDTM_PASSWORD,
            submissions_dir=settings.SDTM_SUBMISSIONS_DIR,
            acks_dir=settings.SDTM_ACKS_DIR,
        )
    
    def connect(self) -> "SdtmClient":
        """
        Establish SFTP connection with retries.
        
        Returns self for use as context manager.
        """
        last_error = None
        
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(
                    f"SDTM: Connecting to {self.host}:{self.port} "
                    f"(attempt {attempt}/{self.max_retries})"
                )
                
                # Create transport
                self._transport = paramiko.Transport((self.host, self.port))
                self._transport.connect(
                    username=self.username,
                    password=self.password,
                )
                
                # Create SFTP client
                self._sftp = paramiko.SFTPClient.from_transport(self._transport)
                
                logger.info(f"SDTM: Connected successfully to {self.host}")
                return self
                
            except Exception as e:
                last_error = e
                logger.warning(
                    f"SDTM: Connection attempt {attempt} failed: {e}"
                )
                self._cleanup()
                
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * attempt)
        
        raise SdtmConnectionError(
            f"Failed to connect to SDTM after {self.max_retries} attempts: {last_error}"
        )
    
    def _cleanup(self):
        """Clean up connections."""
        if self._sftp:
            try:
                self._sftp.close()
            except Exception:
                pass
            self._sftp = None
        
        if self._transport:
            try:
                self._transport.close()
            except Exception:
                pass
            self._transport = None
    
    def close(self):
        """Close the SFTP connection."""
        self._cleanup()
        logger.info("SDTM: Connection closed")
    
    def __enter__(self) -> "SdtmClient":
        return self.connect()
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False
    
    def upload(self, filename: str, content: str) -> Tuple[str, int]:
        """
        Upload XML file to /submissions directory.
        
        Args:
            filename: Name of the file (e.g., "FBARXST.20260202.PCTITLE.abc123.xml")
            content: XML content as string
            
        Returns:
            (remote_path, bytes_written) tuple
        """
        if not self._sftp:
            raise SdtmConnectionError("Not connected. Call connect() first.")
        
        remote_path = f"/{self.submissions_dir}/{filename}"
        content_bytes = content.encode("utf-8")
        
        try:
            logger.info(f"SDTM: Uploading {filename} ({len(content_bytes)} bytes)")
            
            # Write file
            with self._sftp.file(remote_path, "w") as f:
                f.write(content)
            
            # Verify upload
            stat = self._sftp.stat(remote_path)
            
            logger.info(
                f"SDTM: Upload complete - {remote_path} "
                f"({stat.st_size} bytes on server)"
            )
            
            return remote_path, stat.st_size
            
        except Exception as e:
            logger.error(f"SDTM: Upload failed for {filename}: {e}")
            raise SdtmUploadError(f"Failed to upload {filename}: {e}")
    
    def list_submissions(self) -> List[SdtmFile]:
        """List files in /submissions directory."""
        return self._list_dir(self.submissions_dir)
    
    def list_acks(self) -> List[SdtmFile]:
        """List files in /acks directory."""
        return self._list_dir(self.acks_dir)
    
    def _list_dir(self, directory: str) -> List[SdtmFile]:
        """List files in a directory."""
        if not self._sftp:
            raise SdtmConnectionError("Not connected. Call connect() first.")
        
        remote_path = f"/{directory}"
        files = []
        
        try:
            for entry in self._sftp.listdir_attr(remote_path):
                if entry.filename.startswith("."):
                    continue
                files.append(SdtmFile(
                    filename=entry.filename,
                    size=entry.st_size or 0,
                    mtime=entry.st_mtime or 0,
                ))
            
            logger.debug(f"SDTM: Listed {len(files)} files in {directory}")
            return files
            
        except Exception as e:
            logger.error(f"SDTM: Failed to list {directory}: {e}")
            return []
    
    def download(self, filename: str, from_acks: bool = True) -> Optional[str]:
        """
        Download file content.
        
        Args:
            filename: Name of the file to download
            from_acks: If True, download from /acks; otherwise from /submissions
            
        Returns:
            File content as string, or None if not found
        """
        if not self._sftp:
            raise SdtmConnectionError("Not connected. Call connect() first.")
        
        directory = self.acks_dir if from_acks else self.submissions_dir
        remote_path = f"/{directory}/{filename}"
        
        try:
            logger.info(f"SDTM: Downloading {remote_path}")
            
            with self._sftp.file(remote_path, "r") as f:
                content = f.read()
            
            # Handle bytes vs string
            if isinstance(content, bytes):
                content = content.decode("utf-8")
            
            logger.info(f"SDTM: Downloaded {len(content)} bytes from {remote_path}")
            return content
            
        except FileNotFoundError:
            logger.debug(f"SDTM: File not found: {remote_path}")
            return None
        except Exception as e:
            logger.error(f"SDTM: Download failed for {remote_path}: {e}")
            raise SdtmDownloadError(f"Failed to download {filename}: {e}")
    
    def file_exists(self, filename: str, in_acks: bool = True) -> bool:
        """
        Check if a file exists on the server.
        
        Args:
            filename: Name of the file to check
            in_acks: If True, check in /acks; otherwise in /submissions
            
        Returns:
            True if file exists
        """
        if not self._sftp:
            raise SdtmConnectionError("Not connected. Call connect() first.")
        
        directory = self.acks_dir if in_acks else self.submissions_dir
        remote_path = f"/{directory}/{filename}"
        
        try:
            self._sftp.stat(remote_path)
            return True
        except FileNotFoundError:
            return False
        except Exception:
            return False
    
    def ping(self) -> Tuple[bool, dict]:
        """
        Test SDTM connection and list directories.
        
        Returns:
            (success, info_dict) tuple
        """
        try:
            with self.connect() as client:
                submissions = client.list_submissions()
                acks = client.list_acks()
                
                return True, {
                    "host": self.host,
                    "port": self.port,
                    "submissions_count": len(submissions),
                    "acks_count": len(acks),
                    "submissions_files": [f.filename for f in submissions[:10]],
                    "acks_files": [f.filename for f in acks[:10]],
                }
        except Exception as e:
            return False, {
                "host": self.host,
                "port": self.port,
                "error": str(e),
            }
