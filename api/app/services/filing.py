"""
Mock Filing Provider for demo purposes.
"""
import uuid
import random
import string
from datetime import datetime
from typing import Dict, Any


class MockFilingProvider:
    """
    Mock FinCEN filing provider for demo purposes.
    
    In production, this would integrate with the actual FinCEN BSA E-Filing system.
    """
    
    @staticmethod
    def generate_confirmation_number() -> str:
        """Generate a realistic-looking confirmation number."""
        prefix = "RRER"
        year = datetime.utcnow().strftime("%Y")
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        return f"{prefix}-{year}-{random_part}"
    
    @staticmethod
    def file_report(report_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mock file a report to FinCEN.
        
        In production, this would:
        1. Format data to FinCEN XML schema
        2. Submit via BSA E-Filing API
        3. Handle acknowledgments and errors
        
        For demo, we simulate a successful filing.
        """
        confirmation_number = MockFilingProvider.generate_confirmation_number()
        filed_at = datetime.utcnow()
        
        return {
            "success": True,
            "confirmation_number": confirmation_number,
            "filed_at": filed_at,
            "provider": "MockFilingProvider",
            "message": "Report successfully submitted to FinCEN (MOCK)",
            "metadata": {
                "submission_id": str(uuid.uuid4()),
                "accepted_at": filed_at.isoformat(),
                "environment": "demo",
            }
        }
    
    @staticmethod
    def validate_for_filing(report_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate report data meets FinCEN requirements.
        
        Returns validation result with any errors.
        """
        errors = []
        warnings = []
        
        # Check required fields (simplified for demo)
        if not report_data.get("property_address"):
            errors.append("Property address is required")
        
        if not report_data.get("closing_date"):
            errors.append("Closing date is required")
        
        if not report_data.get("parties") or len(report_data["parties"]) == 0:
            errors.append("At least one transferee party is required")
        
        # Check party completeness
        for party in report_data.get("parties", []):
            if party.get("status") != "submitted":
                warnings.append(f"Party {party.get('display_name', 'Unknown')} has not submitted their information")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
        }
