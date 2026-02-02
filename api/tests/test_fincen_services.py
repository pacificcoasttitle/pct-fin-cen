"""
Tests for FinCEN SDTM services.

Tests:
- FBARX XML builder
- Response processors (MESSAGES.XML and ACKED)
- Utility functions
- Preflight validation
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime
from uuid import uuid4


class TestUtils:
    """Test utility functions."""
    
    def test_gzip_b64_encode_decode(self):
        """Test compression and decompression round-trip."""
        from app.services.fincen.utils import gzip_b64_encode, gzip_b64_decode
        
        original = "Hello, World! This is a test string for compression."
        
        # Encode
        encoded = gzip_b64_encode(original)
        assert isinstance(encoded, str)
        assert len(encoded) > 0
        
        # Decode
        decoded = gzip_b64_decode(encoded)
        assert decoded.decode("utf-8") == original
    
    def test_gzip_b64_encode_bytes(self):
        """Test encoding bytes input."""
        from app.services.fincen.utils import gzip_b64_encode, gzip_b64_decode
        
        original = b"Binary data \x00\x01\x02"
        
        encoded = gzip_b64_encode(original)
        decoded = gzip_b64_decode(encoded)
        
        assert decoded == original
    
    def test_sha256_hex(self):
        """Test SHA256 hashing."""
        from app.services.fincen.utils import sha256_hex
        
        # Known hash for "test"
        result = sha256_hex("test")
        assert len(result) == 64
        assert result == "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    
    def test_digits_only(self):
        """Test stripping non-digit characters."""
        from app.services.fincen.utils import digits_only
        
        assert digits_only("123-45-6789") == "123456789"
        assert digits_only("(555) 123-4567") == "5551234567"
        assert digits_only("12-3456789") == "123456789"
        assert digits_only("") == ""
    
    def test_country_to_iso2(self):
        """Test country name to ISO code conversion."""
        from app.services.fincen.utils import country_to_iso2
        
        assert country_to_iso2("United States") == "US"
        assert country_to_iso2("USA") == "US"
        assert country_to_iso2("US") == "US"
        assert country_to_iso2("Canada") == "CA"
        assert country_to_iso2("Mexico") == "MX"
        assert country_to_iso2("United Kingdom") == "GB"
        assert country_to_iso2("") == "US"  # Default
    
    def test_sanitize_text_valid(self):
        """Test valid text passes sanitization."""
        from app.services.fincen.utils import sanitize_text
        
        text, valid = sanitize_text("John Smith")
        assert text == "John Smith"
        assert valid is True
    
    def test_sanitize_text_forbidden(self):
        """Test forbidden placeholders are detected."""
        from app.services.fincen.utils import sanitize_text
        
        text, valid = sanitize_text("UNKNOWN")
        assert valid is False
        
        text, valid = sanitize_text("N/A")
        assert valid is False
        
        text, valid = sanitize_text("Name: SEE ABOVE")
        assert valid is False


class TestResponseProcessor:
    """Test FinCEN response file processors."""
    
    def test_parse_messages_xml_accepted(self):
        """Test parsing accepted MESSAGES.XML."""
        from app.services.fincen.response_processor import parse_messages_xml
        
        xml = """<?xml version="1.0"?>
        <EFilingBatchXML>
            <EFilingBatchStatusCode>A</EFilingBatchStatusCode>
            <StatusDate>2026-02-02</StatusDate>
        </EFilingBatchXML>
        """
        
        result = parse_messages_xml(xml)
        
        assert result.status == "accepted"
        assert result.is_accepted is True
        assert result.is_rejected is False
        assert len(result.errors) == 0
    
    def test_parse_messages_xml_rejected(self):
        """Test parsing rejected MESSAGES.XML with errors."""
        from app.services.fincen.response_processor import parse_messages_xml
        
        xml = """<?xml version="1.0"?>
        <EFilingBatchXML>
            <EFilingBatchStatusCode>R</EFilingBatchStatusCode>
            <StatusDate>2026-02-02</StatusDate>
            <ErrorList>
                <Error>
                    <ErrorCode>ER001</ErrorCode>
                    <ErrorDescription>Missing required field</ErrorDescription>
                    <ActivitySequenceNumber>1</ActivitySequenceNumber>
                </Error>
            </ErrorList>
        </EFilingBatchXML>
        """
        
        result = parse_messages_xml(xml)
        
        assert result.status == "rejected"
        assert result.is_rejected is True
        assert len(result.errors) == 1
        assert result.errors[0].code == "ER001"
        assert result.errors[0].message == "Missing required field"
        assert result.primary_rejection_code == "ER001"
    
    def test_parse_messages_xml_with_warnings(self):
        """Test parsing accepted with warnings MESSAGES.XML."""
        from app.services.fincen.response_processor import parse_messages_xml
        
        xml = """<?xml version="1.0"?>
        <EFilingBatchXML>
            <EFilingBatchStatusCode>A</EFilingBatchStatusCode>
            <WarningList>
                <Warning>
                    <WarningCode>WN001</WarningCode>
                    <WarningDescription>Minor format issue</WarningDescription>
                </Warning>
            </WarningList>
        </EFilingBatchXML>
        """
        
        result = parse_messages_xml(xml)
        
        assert result.status == "accepted_with_warnings"
        assert result.has_warnings is True
        assert len(result.warnings) == 1
    
    def test_parse_acked_xml_with_bsa_id(self):
        """Test parsing ACKED file with BSA ID."""
        from app.services.fincen.response_processor import parse_acked_xml
        
        xml = """<?xml version="1.0"?>
        <EFilingBatchXML>
            <Activity>
                <ActivitySequenceNumber>1</ActivitySequenceNumber>
                <BSAID>31000123456789</BSAID>
            </Activity>
            <ReceiptDate>2026-02-02</ReceiptDate>
        </EFilingBatchXML>
        """
        
        result = parse_acked_xml(xml)
        
        assert result.bsa_id == "31000123456789"
        assert result.has_bsa_id is True
        assert result.receipt_date == "2026-02-02"
        assert "1" in result.activity_seq_to_bsa_id
    
    def test_parse_acked_xml_fallback_regex(self):
        """Test ACKED parsing with regex fallback."""
        from app.services.fincen.response_processor import parse_acked_xml
        
        # Malformed XML but contains BSA ID pattern
        xml = """Some text 31000987654321 more text"""
        
        result = parse_acked_xml(xml)
        
        # Should extract via regex fallback
        assert result.bsa_id == "31000987654321"


class TestFbarxBuilder:
    """Test FBARX XML builder."""
    
    @pytest.fixture
    def mock_report(self):
        """Create a mock report with wizard_data."""
        report = MagicMock()
        report.id = uuid4()
        report.closing_date = datetime(2026, 1, 15)
        report.property_address_text = "123 Main St, Anytown, CA 90210"
        
        report.wizard_data = {
            "determination": {
                "buyerType": "entity",
                "entitySubtype": "llc",
            },
            "collection": {
                "closingDate": "2026-01-15",
                "propertyAddress": {
                    "street": "123 Main St",
                    "city": "Anytown",
                    "state": "CA",
                    "zip": "90210",
                    "country": "US",
                },
                "purchasePrice": 500000,
                "reportingPerson": {
                    "companyName": "Test Title Company",
                    "contactName": "John Contact",
                    "phone": "(555) 123-4567",
                    "email": "contact@testtitle.com",
                    "address": {
                        "street": "456 Business Ave",
                        "city": "Commerce",
                        "state": "CA",
                        "zip": "90220",
                        "country": "US",
                    },
                },
                "buyerEntity": {
                    "entity": {
                        "legalName": "Test Buyer LLC",
                        "tin": "12-3456789",
                        "address": {
                            "street": "789 Buyer Blvd",
                            "city": "Buyertown",
                            "state": "CA",
                            "zip": "90230",
                            "country": "US",
                        },
                    },
                },
                "paymentSources": [
                    {
                        "institutionName": "First National Bank",
                        "accountType": "checking",
                        "accountNumberLast4": "5678",
                        "amount": 500000,
                    },
                ],
            },
        }
        
        # Mock parties
        party = MagicMock()
        party.party_role = "transferee"
        party.party_data = report.wizard_data["collection"]["buyerEntity"]
        report.parties = [party]
        
        return report
    
    @pytest.fixture
    def mock_submission(self):
        """Create a mock submission."""
        submission = MagicMock()
        submission.id = uuid4()
        return submission
    
    @pytest.fixture
    def mock_config(self):
        """Create a mock config with transmitter credentials."""
        config = MagicMock()
        config.TRANSMITTER_TIN = "123456789"
        config.TRANSMITTER_TCC = "P1234567"
        config.FINCEN_ENV = "sandbox"
        config.SDTM_ORGNAME = "TESTTITLE"
        return config
    
    def test_build_fbarx_xml_success(self, mock_report, mock_submission, mock_config):
        """Test successful XML generation."""
        from app.services.fincen.fbarx_builder import build_fbarx_xml
        
        xml, debug = build_fbarx_xml(mock_report, mock_submission, mock_config)
        
        # Check XML generated
        assert xml is not None
        assert len(xml) > 0
        assert '<?xml version="1.0"' in xml
        assert "EFilingBatchXML" in xml
        
        # Check parties present
        assert "Test Title Company" in xml  # Transmitter
        assert "John Contact" in xml  # Transmitter Contact
        assert "Test Buyer LLC" in xml  # Filer
        assert "First National Bank" in xml  # Financial Institution
        
        # Check debug summary
        assert debug["report_id"] == str(mock_report.id)
        assert "warnings" in debug
        assert "party_counts" in debug
    
    def test_build_fbarx_xml_missing_transmitter_tin(self, mock_report, mock_submission, mock_config):
        """Test preflight failure when TRANSMITTER_TIN missing."""
        from app.services.fincen.fbarx_builder import build_fbarx_xml, PreflightError
        
        mock_config.TRANSMITTER_TIN = ""
        
        with pytest.raises(PreflightError) as exc_info:
            build_fbarx_xml(mock_report, mock_submission, mock_config)
        
        assert "TRANSMITTER_TIN" in str(exc_info.value)
    
    def test_build_fbarx_xml_missing_transmitter_tcc(self, mock_report, mock_submission, mock_config):
        """Test preflight failure when TRANSMITTER_TCC missing."""
        from app.services.fincen.fbarx_builder import build_fbarx_xml, PreflightError
        
        mock_config.TRANSMITTER_TCC = ""
        
        with pytest.raises(PreflightError) as exc_info:
            build_fbarx_xml(mock_report, mock_submission, mock_config)
        
        assert "TRANSMITTER_TCC" in str(exc_info.value)
    
    def test_build_fbarx_xml_missing_company_name(self, mock_report, mock_submission, mock_config):
        """Test preflight failure when reportingPerson.companyName missing."""
        from app.services.fincen.fbarx_builder import build_fbarx_xml, PreflightError
        
        mock_report.wizard_data["collection"]["reportingPerson"]["companyName"] = ""
        
        with pytest.raises(PreflightError) as exc_info:
            build_fbarx_xml(mock_report, mock_submission, mock_config)
        
        assert "companyName" in str(exc_info.value)
    
    def test_build_fbarx_xml_missing_buyer_identification(self, mock_report, mock_submission, mock_config):
        """Test preflight failure when buyer has no identification."""
        from app.services.fincen.fbarx_builder import build_fbarx_xml, PreflightError
        
        # Remove TIN from buyer entity
        mock_report.wizard_data["collection"]["buyerEntity"]["entity"]["tin"] = ""
        mock_report.parties[0].party_data = mock_report.wizard_data["collection"]["buyerEntity"]
        
        with pytest.raises(PreflightError) as exc_info:
            build_fbarx_xml(mock_report, mock_submission, mock_config)
        
        assert "identification" in str(exc_info.value).lower()
    
    def test_generate_sdtm_filename(self):
        """Test SDTM filename generation."""
        from app.services.fincen.fbarx_builder import generate_sdtm_filename
        from datetime import datetime
        
        ts = datetime(2026, 2, 2, 14, 30, 45)
        submission_id = "12345678-1234-1234-1234-123456789abc"
        
        filename = generate_sdtm_filename("PCTITLE", submission_id, ts)
        
        assert filename.startswith("FBARXST.")
        assert "20260202143045" in filename
        assert "PCTITLE" in filename
        assert filename.endswith(".xml")
    
    def test_generate_sdtm_filename_sanitizes_org(self):
        """Test that org name is sanitized in filename."""
        from app.services.fincen.fbarx_builder import generate_sdtm_filename
        
        filename = generate_sdtm_filename("Test Company!", "abc123", datetime.utcnow())
        
        # Should strip non-alphanumeric
        assert "TestCompany" in filename
        assert "!" not in filename


class TestFilingLifecycleSdtm:
    """Test SDTM-specific filing lifecycle functions."""
    
    def test_mark_needs_review_stores_reason(self, db_session):
        """Test that mark_needs_review stores the reason."""
        from app.services.filing_lifecycle import mark_needs_review, get_or_create_submission
        from uuid import uuid4
        
        # This test requires a database session - skip if not available
        pytest.skip("Requires database fixture")
    
    def test_poll_backoff_schedule(self):
        """Test poll backoff schedule values."""
        from app.services.filing_lifecycle import POLL_BACKOFF_MINUTES
        
        assert POLL_BACKOFF_MINUTES[0] == 15  # First poll: 15 minutes
        assert POLL_BACKOFF_MINUTES[1] == 60  # Second poll: 1 hour
        assert POLL_BACKOFF_MINUTES[-1] == 720  # Max: 12 hours
