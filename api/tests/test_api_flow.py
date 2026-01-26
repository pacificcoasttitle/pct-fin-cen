"""
End-to-end API flow test - full golden path.
"""
import pytest
from datetime import datetime, timedelta


class TestFullAPIFlow:
    """Test the complete flow from report creation to filing."""
    
    def test_complete_filing_flow(self, client, db_session):
        """Test full flow: create → wizard → determine → party-links → submit → ready → file."""
        
        # ===== STEP 1: Create Report =====
        create_response = client.post("/reports", json={
            "property_address_text": "123 Test Street, Demo City, CA 90210",
            "closing_date": (datetime.utcnow().date() + timedelta(days=10)).isoformat(),
            "wizard_data": {}
        })
        assert create_response.status_code == 201
        report = create_response.json()
        report_id = report["id"]
        assert report["status"] == "draft"
        
        # ===== STEP 2: Update Wizard (multiple steps) =====
        # Step 1: Residential
        wizard_response = client.put(f"/reports/{report_id}/wizard", json={
            "wizard_step": 1,
            "wizard_data": {
                "step1": {"is_residential": True}
            }
        })
        assert wizard_response.status_code == 200
        
        # Step 2: Cash transaction
        wizard_response = client.put(f"/reports/{report_id}/wizard", json={
            "wizard_step": 2,
            "wizard_data": {
                "step2": {"is_cash_transaction": True}
            }
        })
        assert wizard_response.status_code == 200
        
        # Step 3: Individual buyer
        wizard_response = client.put(f"/reports/{report_id}/wizard", json={
            "wizard_step": 3,
            "wizard_data": {
                "step3": {"transferee_type": "individual", "transferee_count": 1}
            }
        })
        assert wizard_response.status_code == 200
        
        # Step 4: No exemptions
        wizard_response = client.put(f"/reports/{report_id}/wizard", json={
            "wizard_step": 4,
            "wizard_data": {
                "step4": {"exemptions": {}}
            }
        })
        assert wizard_response.status_code == 200
        
        # Verify wizard data was saved
        get_response = client.get(f"/reports/{report_id}")
        assert get_response.status_code == 200
        report_data = get_response.json()
        assert report_data["wizard_data"]["step1"]["is_residential"] is True
        
        # ===== STEP 3: Run Determination =====
        determine_response = client.post(f"/reports/{report_id}/determine")
        assert determine_response.status_code == 200
        determination = determine_response.json()
        assert determination["is_reportable"] is True
        assert determination["status"] == "determination_complete"
        
        # ===== STEP 4: Create Party Links =====
        links_response = client.post(f"/reports/{report_id}/party-links", json={
            "parties": [
                {
                    "party_role": "transferee",
                    "entity_type": "individual",
                    "display_name": "John Demo"
                }
            ],
            "expires_in_days": 7
        })
        assert links_response.status_code == 200
        links_data = links_response.json()
        assert len(links_data["links"]) == 1
        
        party_link = links_data["links"][0]
        token = party_link["token"]
        assert party_link["link_url"].endswith(f"/party/{token}")
        
        # Verify report status updated
        get_response = client.get(f"/reports/{report_id}")
        assert get_response.json()["status"] == "collecting"
        
        # ===== STEP 5: Party Prefill (GET) =====
        party_response = client.get(f"/party/{token}")
        assert party_response.status_code == 200
        party_data = party_response.json()
        assert party_data["party_role"] == "transferee"
        assert party_data["is_submitted"] is False
        
        # ===== STEP 6: Party Autosave =====
        save_response = client.post(f"/party/{token}/save", json={
            "party_data": {
                "first_name": "John",
                "last_name": "Demo",
                "email": "john@example.com"
            }
        })
        assert save_response.status_code == 200
        assert save_response.json()["status"] == "in_progress"
        
        # ===== STEP 7: Party Submit =====
        submit_response = client.post(f"/party/{token}/submit")
        assert submit_response.status_code == 200
        submit_data = submit_response.json()
        assert submit_data["status"] == "submitted"
        assert submit_data["submitted_at"] is not None
        
        # Verify link is now used
        party_response = client.get(f"/party/{token}")
        assert party_response.status_code == 410  # Link used
        
        # ===== STEP 8: Ready Check =====
        ready_response = client.post(f"/reports/{report_id}/ready-check")
        assert ready_response.status_code == 200
        ready_data = ready_response.json()
        assert ready_data["is_ready"] is True
        assert ready_data["parties_complete"] == 1
        
        # ===== STEP 9: File Report =====
        file_response = client.post(f"/reports/{report_id}/file")
        assert file_response.status_code == 200
        file_data = file_response.json()
        assert file_data["status"] == "filed"
        assert file_data["confirmation_number"].startswith("RRER-")
        
        # ===== STEP 10: Verify Final State =====
        final_response = client.get(f"/reports/{report_id}")
        final_report = final_response.json()
        assert final_report["status"] == "filed"
        assert "filing" in final_report["determination"]
        
        # Cannot file again
        re_file_response = client.post(f"/reports/{report_id}/file")
        assert re_file_response.status_code == 400
    
    def test_exempt_report_cannot_file(self, client, db_session):
        """Exempt reports cannot be filed."""
        # Create report
        create_response = client.post("/reports", json={
            "property_address_text": "500 Commercial Way, Business City, CA 90210",
        })
        report_id = create_response.json()["id"]
        
        # Set as non-residential (exempt)
        client.put(f"/reports/{report_id}/wizard", json={
            "wizard_step": 1,
            "wizard_data": {"step1": {"is_residential": False}}
        })
        
        # Run determination
        determine_response = client.post(f"/reports/{report_id}/determine")
        assert determine_response.json()["is_reportable"] is False
        
        # Try to file
        file_response = client.post(f"/reports/{report_id}/file")
        assert file_response.status_code == 400
        assert "Exempt" in file_response.json()["detail"]
    
    def test_list_reports(self, client, db_session):
        """Test listing reports with filters."""
        # Create multiple reports
        for i in range(3):
            client.post("/reports", json={
                "property_address_text": f"Address {i}",
            })
        
        # List all
        list_response = client.get("/reports")
        assert list_response.status_code == 200
        data = list_response.json()
        assert data["total"] >= 3
        
        # Filter by status
        filter_response = client.get("/reports?status=draft")
        assert filter_response.status_code == 200
        for report in filter_response.json()["reports"]:
            assert report["status"] == "draft"
