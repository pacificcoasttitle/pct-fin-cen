"""
Tests for determination logic - 12 scenarios per spec.
"""
import pytest
from app.services.determination import determine_reportability


class TestDeterminationScenarios:
    """Test all determination scenarios."""
    
    # ===== EXEMPT SCENARIOS =====
    
    def test_scenario_1_non_residential(self):
        """Non-residential property is exempt."""
        wizard_data = {
            "step1": {"is_residential": False},
        }
        is_reportable, details, reasoning = determine_reportability(wizard_data)
        
        assert is_reportable is False
        assert details["final_result"] == "exempt"
        assert details["exemption_reason"] == "non_residential"
        assert "NOT residential" in reasoning[0]
    
    def test_scenario_2_conventional_financing(self):
        """Conventional mortgage financing is exempt."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {"is_cash_transaction": False, "financing_type": "conventional"},
        }
        is_reportable, details, reasoning = determine_reportability(wizard_data)
        
        assert is_reportable is False
        assert details["final_result"] == "exempt"
        assert details["exemption_reason"] == "regulated_financing"
    
    def test_scenario_3_fha_financing(self):
        """FHA financing is exempt."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {"is_cash_transaction": False, "financing_type": "fha"},
        }
        is_reportable, details, reasoning = determine_reportability(wizard_data)
        
        assert is_reportable is False
        assert details["exemption_reason"] == "regulated_financing"
    
    def test_scenario_4_va_financing(self):
        """VA financing is exempt."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {"is_cash_transaction": False, "financing_type": "va"},
        }
        is_reportable, details, reasoning = determine_reportability(wizard_data)
        
        assert is_reportable is False
        assert details["exemption_reason"] == "regulated_financing"
    
    def test_scenario_5_publicly_traded_company(self):
        """Publicly traded company is exempt."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {"is_cash_transaction": True},
            "step3": {"transferee_type": "corporation"},
            "step4": {"exemptions": {"is_publicly_traded": True}},
        }
        is_reportable, details, reasoning = determine_reportability(wizard_data)
        
        assert is_reportable is False
        assert details["exemption_reason"] == "is_publicly_traded"
    
    def test_scenario_6_regulated_bank(self):
        """Regulated financial institution is exempt."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {"is_cash_transaction": True},
            "step3": {"transferee_type": "corporation"},
            "step4": {"exemptions": {"is_regulated_entity": True}},
        }
        is_reportable, details, reasoning = determine_reportability(wizard_data)
        
        assert is_reportable is False
        assert details["exemption_reason"] == "is_regulated_entity"
    
    def test_scenario_7_government_entity(self):
        """Government entity is exempt."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {"is_cash_transaction": True},
            "step3": {"transferee_type": "other"},
            "step4": {"exemptions": {"is_government_entity": True}},
        }
        is_reportable, details, reasoning = determine_reportability(wizard_data)
        
        assert is_reportable is False
        assert details["exemption_reason"] == "is_government_entity"
    
    def test_scenario_8_501c3_nonprofit(self):
        """501(c)(3) nonprofit is exempt."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {"is_cash_transaction": True},
            "step3": {"transferee_type": "corporation"},
            "step4": {"exemptions": {"is_501c3": True}},
        }
        is_reportable, details, reasoning = determine_reportability(wizard_data)
        
        assert is_reportable is False
        assert details["exemption_reason"] == "is_501c3"
    
    # ===== REPORTABLE SCENARIOS =====
    
    def test_scenario_9_cash_individual_buyer(self):
        """Cash purchase by individual is reportable."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {"is_cash_transaction": True},
            "step3": {"transferee_type": "individual", "transferee_count": 1},
            "step4": {"exemptions": {}},
        }
        is_reportable, details, reasoning = determine_reportability(wizard_data)
        
        assert is_reportable is True
        assert details["final_result"] == "reportable"
        assert "IS REPORTABLE" in reasoning[-1]
    
    def test_scenario_10_cash_llc_buyer(self):
        """Cash purchase by LLC is reportable."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {"is_cash_transaction": True},
            "step3": {"transferee_type": "llc", "transferee_count": 1, "beneficial_owner_count": 2},
            "step4": {"exemptions": {}},
        }
        is_reportable, details, reasoning = determine_reportability(wizard_data)
        
        assert is_reportable is True
        assert details["final_result"] == "reportable"
        # Check required parties includes beneficial owners
        required_parties = details["required_parties"]
        bo_parties = [p for p in required_parties if p["party_role"] == "beneficial_owner"]
        assert len(bo_parties) == 2
    
    def test_scenario_11_seller_financing(self):
        """Seller financing is reportable."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {"is_cash_transaction": False, "financing_type": "seller_financing"},
            "step3": {"transferee_type": "individual"},
            "step4": {"exemptions": {}},
        }
        is_reportable, details, reasoning = determine_reportability(wizard_data)
        
        assert is_reportable is True
        assert details["final_result"] == "reportable"
    
    def test_scenario_12_private_loan(self):
        """Private/hard money loan is reportable."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {"is_cash_transaction": False, "financing_type": "private_loan"},
            "step3": {"transferee_type": "trust"},
            "step4": {"exemptions": {}},
        }
        is_reportable, details, reasoning = determine_reportability(wizard_data)
        
        assert is_reportable is True
        assert details["final_result"] == "reportable"
    
    # ===== INCOMPLETE SCENARIOS =====
    
    def test_incomplete_no_residential_answer(self):
        """Missing residential answer returns incomplete."""
        wizard_data = {
            "step1": {},
        }
        is_reportable, details, reasoning = determine_reportability(wizard_data)
        
        assert is_reportable is False
        assert details["final_result"] == "incomplete"
    
    def test_incomplete_no_financing_answer(self):
        """Missing financing answer returns incomplete."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {},
        }
        is_reportable, details, reasoning = determine_reportability(wizard_data)
        
        assert is_reportable is False
        assert details["final_result"] == "incomplete"


class TestDeterminationRequiredParties:
    """Test party determination logic."""
    
    def test_individual_buyer_one_party(self):
        """Individual buyer requires one party."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {"is_cash_transaction": True},
            "step3": {"transferee_type": "individual", "transferee_count": 1},
            "step4": {"exemptions": {}},
        }
        _, details, _ = determine_reportability(wizard_data)
        
        required = details["required_parties"]
        assert len(required) == 1
        assert required[0]["party_role"] == "transferee"
        assert required[0]["entity_type"] == "individual"
    
    def test_llc_requires_beneficial_owners(self):
        """LLC requires beneficial owners."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {"is_cash_transaction": True},
            "step3": {"transferee_type": "llc", "transferee_count": 1, "beneficial_owner_count": 3},
            "step4": {"exemptions": {}},
        }
        _, details, _ = determine_reportability(wizard_data)
        
        required = details["required_parties"]
        transferees = [p for p in required if p["party_role"] == "transferee"]
        bos = [p for p in required if p["party_role"] == "beneficial_owner"]
        
        assert len(transferees) == 1
        assert len(bos) == 3
    
    def test_multiple_individual_buyers(self):
        """Multiple individual buyers."""
        wizard_data = {
            "step1": {"is_residential": True},
            "step2": {"is_cash_transaction": True},
            "step3": {"transferee_type": "individual", "transferee_count": 2},
            "step4": {"exemptions": {}},
        }
        _, details, _ = determine_reportability(wizard_data)
        
        required = details["required_parties"]
        assert len(required) == 2
        assert all(p["party_role"] == "transferee" for p in required)
