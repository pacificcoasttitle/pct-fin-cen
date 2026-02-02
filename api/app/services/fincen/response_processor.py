"""
FinCEN Response File Processor.

Parses MESSAGES.XML and ACKED response files from FinCEN SDTM.

Response file types:
- filename.MESSAGES.XML - Processing status (accepted/rejected/warnings)
- filename.ACKED - Contains BSA ID upon successful acceptance
"""
import logging
import re
from typing import Dict, List, Optional
from dataclasses import dataclass, field
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)


@dataclass
class MessageError:
    """Represents a single error/warning from MESSAGES.XML."""
    code: str
    message: str
    severity: str  # "error" or "warning"
    element_path: Optional[str] = None
    activity_seq: Optional[str] = None


@dataclass
class MessagesResult:
    """Parsed result from MESSAGES.XML file."""
    status: str  # "accepted", "rejected", "accepted_with_warnings"
    errors: List[MessageError] = field(default_factory=list)
    warnings: List[MessageError] = field(default_factory=list)
    batch_id: Optional[str] = None
    submission_date: Optional[str] = None
    raw_xml: Optional[str] = None
    
    @property
    def is_accepted(self) -> bool:
        return self.status in ("accepted", "accepted_with_warnings")
    
    @property
    def is_rejected(self) -> bool:
        return self.status == "rejected"
    
    @property
    def has_warnings(self) -> bool:
        return len(self.warnings) > 0
    
    @property
    def error_summary(self) -> str:
        """Generate human-readable error summary."""
        if self.errors:
            return "; ".join(f"{e.code}: {e.message}" for e in self.errors[:3])
        return ""
    
    @property
    def primary_rejection_code(self) -> Optional[str]:
        """Get the first/primary rejection code."""
        if self.errors:
            return self.errors[0].code
        return None
    
    @property
    def primary_rejection_message(self) -> Optional[str]:
        """Get the first/primary rejection message."""
        if self.errors:
            return self.errors[0].message
        return None


@dataclass
class AckedResult:
    """Parsed result from ACKED file."""
    bsa_id: Optional[str] = None
    activity_seq_to_bsa_id: Dict[str, str] = field(default_factory=dict)
    receipt_date: Optional[str] = None
    raw_xml: Optional[str] = None
    
    @property
    def has_bsa_id(self) -> bool:
        return bool(self.bsa_id)


def parse_messages_xml(xml_content: str) -> MessagesResult:
    """
    Parse FinCEN MESSAGES.XML response file.
    
    The MESSAGES.XML file contains processing status and any errors/warnings.
    
    Expected structure (simplified):
    ```xml
    <EFilingBatchXML>
      <StatusDate>2026-02-02</StatusDate>
      <EFilingBatchStatusCode>A</EFilingBatchStatusCode>  <!-- A=accepted, R=rejected -->
      <ErrorList>
        <Error>
          <ErrorCode>ER001</ErrorCode>
          <ErrorDescription>Field missing</ErrorDescription>
          <ActivitySequenceNumber>1</ActivitySequenceNumber>
        </Error>
      </ErrorList>
      <WarningList>
        <Warning>
          <WarningCode>WN001</WarningCode>
          <WarningDescription>Minor issue</WarningDescription>
        </Warning>
      </WarningList>
    </EFilingBatchXML>
    ```
    
    Args:
        xml_content: Raw XML content from MESSAGES.XML file
        
    Returns:
        MessagesResult with parsed status and errors
    """
    result = MessagesResult(
        status="unknown",
        raw_xml=xml_content,
    )
    
    try:
        # Remove BOM if present
        if xml_content.startswith('\ufeff'):
            xml_content = xml_content[1:]
        
        root = ET.fromstring(xml_content)
        
        # Try different possible root elements
        batch = root
        if root.tag == "EFilingSubmissionXML":
            batch = root.find(".//EFilingBatchXML") or root
        
        # Parse status code
        status_elem = (
            batch.find(".//EFilingBatchStatusCode") or
            batch.find(".//StatusCode") or
            batch.find(".//BatchStatusCode")
        )
        
        if status_elem is not None and status_elem.text:
            status_code = status_elem.text.strip().upper()
            if status_code in ("A", "ACCEPTED"):
                result.status = "accepted"
            elif status_code in ("R", "REJECTED"):
                result.status = "rejected"
            elif status_code in ("W", "ACCEPTED_WITH_WARNINGS"):
                result.status = "accepted_with_warnings"
        
        # Parse submission/batch date
        date_elem = batch.find(".//StatusDate") or batch.find(".//SubmissionDate")
        if date_elem is not None and date_elem.text:
            result.submission_date = date_elem.text.strip()
        
        # Parse batch ID
        batch_id_elem = batch.find(".//EFilingBatchID") or batch.find(".//BatchID")
        if batch_id_elem is not None and batch_id_elem.text:
            result.batch_id = batch_id_elem.text.strip()
        
        # Parse errors
        for error_elem in batch.findall(".//Error"):
            error = _parse_error_element(error_elem, "error")
            if error:
                result.errors.append(error)
        
        # Also check ErrorList/ErrorDetail patterns
        for error_elem in batch.findall(".//ErrorDetail"):
            error = _parse_error_element(error_elem, "error")
            if error:
                result.errors.append(error)
        
        # Parse warnings
        for warning_elem in batch.findall(".//Warning"):
            warning = _parse_error_element(warning_elem, "warning")
            if warning:
                result.warnings.append(warning)
        
        # Adjust status if we have warnings but no errors and status was accepted
        if result.status == "accepted" and result.warnings and not result.errors:
            result.status = "accepted_with_warnings"
        
        # If we have errors and status is unknown or accepted, mark as rejected
        if result.errors and result.status in ("unknown", "accepted"):
            result.status = "rejected"
        
        logger.info(
            f"MESSAGES.XML parsed: status={result.status}, "
            f"errors={len(result.errors)}, warnings={len(result.warnings)}"
        )
        
    except ET.ParseError as e:
        logger.error(f"Failed to parse MESSAGES.XML: {e}")
        result.status = "unknown"
        result.errors.append(MessageError(
            code="PARSE_ERROR",
            message=f"Failed to parse MESSAGES.XML: {e}",
            severity="error"
        ))
    except Exception as e:
        logger.error(f"Unexpected error parsing MESSAGES.XML: {e}")
        result.errors.append(MessageError(
            code="UNEXPECTED_ERROR",
            message=str(e),
            severity="error"
        ))
    
    return result


def _parse_error_element(elem: ET.Element, severity: str) -> Optional[MessageError]:
    """Parse a single error/warning element."""
    code_elem = (
        elem.find("ErrorCode") or
        elem.find("WarningCode") or
        elem.find("Code")
    )
    msg_elem = (
        elem.find("ErrorDescription") or
        elem.find("WarningDescription") or
        elem.find("Description") or
        elem.find("Message")
    )
    seq_elem = elem.find("ActivitySequenceNumber")
    path_elem = elem.find("ElementPath") or elem.find("XPath")
    
    code = code_elem.text.strip() if code_elem is not None and code_elem.text else "UNKNOWN"
    message = msg_elem.text.strip() if msg_elem is not None and msg_elem.text else "No description"
    
    return MessageError(
        code=code,
        message=message,
        severity=severity,
        activity_seq=seq_elem.text.strip() if seq_elem is not None and seq_elem.text else None,
        element_path=path_elem.text.strip() if path_elem is not None and path_elem.text else None,
    )


def parse_acked_xml(xml_content: str) -> AckedResult:
    """
    Parse FinCEN ACKED response file.
    
    The ACKED file contains the BSA ID assigned to accepted filings.
    
    Expected structure (simplified):
    ```xml
    <EFilingBatchXML>
      <Activity>
        <ActivitySequenceNumber>1</ActivitySequenceNumber>
        <BSAID>31000123456789</BSAID>
      </Activity>
    </EFilingBatchXML>
    ```
    
    Args:
        xml_content: Raw XML content from ACKED file
        
    Returns:
        AckedResult with BSA ID(s)
    """
    result = AckedResult(raw_xml=xml_content)
    
    try:
        # Remove BOM if present
        if xml_content.startswith('\ufeff'):
            xml_content = xml_content[1:]
        
        root = ET.fromstring(xml_content)
        
        # Parse date
        date_elem = root.find(".//ReceiptDate") or root.find(".//AcknowledgementDate")
        if date_elem is not None and date_elem.text:
            result.receipt_date = date_elem.text.strip()
        
        # Find activities with BSA IDs
        for activity in root.findall(".//Activity"):
            seq_elem = activity.find("ActivitySequenceNumber")
            bsa_elem = (
                activity.find("BSAID") or
                activity.find("BSAId") or
                activity.find("bsaid")
            )
            
            if bsa_elem is not None and bsa_elem.text:
                bsa_id = bsa_elem.text.strip()
                seq = seq_elem.text.strip() if seq_elem is not None and seq_elem.text else "1"
                
                result.activity_seq_to_bsa_id[seq] = bsa_id
                
                # Use first BSA ID as primary
                if not result.bsa_id:
                    result.bsa_id = bsa_id
        
        # Also look for BSA ID at root level
        if not result.bsa_id:
            bsa_elem = (
                root.find(".//BSAID") or
                root.find(".//BSAId") or
                root.find(".//bsaid")
            )
            if bsa_elem is not None and bsa_elem.text:
                result.bsa_id = bsa_elem.text.strip()
        
        # Try regex extraction as fallback
        if not result.bsa_id:
            # BSA IDs are typically 14-digit numbers starting with 31
            bsa_match = re.search(r'\b(31\d{12})\b', xml_content)
            if bsa_match:
                result.bsa_id = bsa_match.group(1)
        
        logger.info(
            f"ACKED parsed: bsa_id={result.bsa_id}, "
            f"activities={len(result.activity_seq_to_bsa_id)}"
        )
        
    except ET.ParseError as e:
        logger.error(f"Failed to parse ACKED: {e}")
    except Exception as e:
        logger.error(f"Unexpected error parsing ACKED: {e}")
    
    return result


def extract_filing_status_from_messages(messages: MessagesResult) -> dict:
    """
    Extract normalized filing status info for storage in payload_snapshot.
    
    Args:
        messages: Parsed MessagesResult
        
    Returns:
        Dict with normalized status info
    """
    return {
        "status": messages.status,
        "is_accepted": messages.is_accepted,
        "is_rejected": messages.is_rejected,
        "has_warnings": messages.has_warnings,
        "batch_id": messages.batch_id,
        "submission_date": messages.submission_date,
        "error_count": len(messages.errors),
        "warning_count": len(messages.warnings),
        "errors": [
            {
                "code": e.code,
                "message": e.message,
                "activity_seq": e.activity_seq,
            }
            for e in messages.errors
        ],
        "warnings": [
            {
                "code": w.code,
                "message": w.message,
            }
            for w in messages.warnings[:10]  # Limit warnings stored
        ],
    }


def extract_bsa_id_from_acked(acked: AckedResult) -> dict:
    """
    Extract normalized BSA ID info for storage in payload_snapshot.
    
    Args:
        acked: Parsed AckedResult
        
    Returns:
        Dict with BSA ID info
    """
    return {
        "bsa_id": acked.bsa_id,
        "receipt_date": acked.receipt_date,
        "activity_bsa_ids": acked.activity_seq_to_bsa_id,
    }
