#!/usr/bin/env python3
"""
Seed local database with realistic RERX test data.

Creates tables and inserts test data for validating RERX XML generation.

Usage:
    python -m app.scripts.seed_rerx_test
"""

import sys
import os

# Load .env for local development
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from datetime import datetime, date
from uuid import uuid4

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.database import Base, engine
from app.models.report import Report
from app.models.report_party import ReportParty
from app.models.filing_submission import FilingSubmission

# Import all models to ensure they're registered
from app.models import (
    Company, User, SubmissionRequest, PartyLink, AuditLog,
    BillingEvent, Invoice, Document, NotificationEvent
)


def main():
    print("=" * 60)
    print("RERX Test Data Seeder")
    print("=" * 60)
    print()
    
    # Create all tables
    print("[1/4] Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("      Tables created successfully")
    print()
    
    # Create session
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Check if test data already exists
        existing = db.query(Report).filter(Report.escrow_number == "RERX-TEST-001").first()
        if existing:
            print("[INFO] Test report already exists. Deleting to recreate...")
            db.delete(existing)
            db.commit()
        
        # Create test report
        print("[2/4] Creating test report...")
        
        report_id = uuid4()
        
        # Realistic wizard_data matching what rerx_builder expects
        wizard_data = {
            "determination": {
                "buyerType": "entity",
                "transactionType": "residential",
                "totalConsideration": 850000,
                "reportingRequired": True,
                "exemptions": {
                    "financedByMortgage": False,
                    "purchasedFromGovernment": False,
                    "purchaserIsSecuritiesBroker": False
                }
            },
            "collection": {
                # Reporting Person (Pacific Coast Title)
                "reportingPerson": {
                    "companyName": "Pacific Coast Title Company",
                    "contactName": "Maria Garcia",
                    "address": {
                        "street": "1234 Business Park Drive, Suite 100",
                        "city": "Santa Ana",
                        "state": "CA",
                        "zip": "92705",
                        "country": "US"
                    },
                    "phone": "(714) 555-0199",
                    "email": "compliance@pacificcoasttitle.com"
                },
                
                # Buyer Entity (LLC)
                "buyerType": "entity",
                "buyerEntity": {
                    "entity": {
                        "legalName": "Coastal Investment Holdings LLC",
                        "dbaName": "",
                        "entityType": "llc",
                        "stateOfFormation": "DE",
                        "dateOfFormation": "2020-06-15",
                        "tin": "84-1234567",
                        "address": {
                            "street": "500 Newport Center Drive, Suite 700",
                            "city": "Newport Beach",
                            "state": "CA",
                            "zip": "92660",
                            "country": "US"
                        }
                    },
                    "beneficialOwners": [
                        {
                            "firstName": "Robert",
                            "lastName": "Chen",
                            "middleName": "J",
                            "dateOfBirth": "1975-03-22",
                            "ssn": "123-45-6789",
                            "idType": "ssn",
                            "ownershipPercentage": 60,
                            "address": {
                                "street": "1001 Ocean Avenue, Unit 1204",
                                "city": "Santa Monica",
                                "state": "CA",
                                "zip": "90401",
                                "country": "US"
                            }
                        },
                        {
                            "firstName": "Sarah",
                            "lastName": "Martinez",
                            "middleName": "L",
                            "dateOfBirth": "1982-11-08",
                            "ssn": "987-65-4321",
                            "idType": "ssn",
                            "ownershipPercentage": 40,
                            "address": {
                                "street": "2050 Main Street, Apt 305",
                                "city": "Irvine",
                                "state": "CA",
                                "zip": "92614",
                                "country": "US"
                            }
                        }
                    ]
                },
                
                # Sellers (1 individual)
                "sellers": [
                    {
                        "type": "individual",
                        "individual": {
                            "firstName": "James",
                            "lastName": "Wilson",
                            "middleName": "P",
                            "dateOfBirth": "1958-07-14",
                            "address": {
                                "street": "9876 Palm Drive",
                                "city": "Laguna Beach",
                                "state": "CA",
                                "zip": "92651",
                                "country": "US"
                            }
                        }
                    }
                ],
                
                # Property Address
                "propertyAddress": {
                    "street": "456 Seaside Boulevard",
                    "unit": "",
                    "city": "Huntington Beach",
                    "state": "CA",
                    "zip": "92648",
                    "county": "Orange",
                    "country": "US"
                },
                "legalDescription": "LOT 15 OF TRACT NO. 12345, IN THE CITY OF HUNTINGTON BEACH, COUNTY OF ORANGE, STATE OF CALIFORNIA, AS PER MAP RECORDED IN BOOK 123, PAGE 45 OF MISCELLANEOUS MAPS, RECORDS OF SAID COUNTY.",
                
                # Payment Sources
                "paymentSources": [
                    {
                        "sourceType": "wire",
                        "amount": 700000,
                        "institutionName": "First National Bank",
                        "accountNumberLast4": "4567",
                        "description": "Wire transfer from business account"
                    },
                    {
                        "sourceType": "cashiers_check",
                        "amount": 150000,
                        "institutionName": "Chase Bank",
                        "accountNumberLast4": "8901",
                        "description": "Cashier's check for down payment"
                    }
                ],
                
                # Transaction Details
                "closingDate": "2026-03-15",
                "purchasePrice": 850000,
                
                # Signing Individuals (authorized signers for the LLC)
                "signingIndividuals": [
                    {
                        "firstName": "Robert",
                        "lastName": "Chen",
                        "title": "Managing Member",
                        "dateOfBirth": "1975-03-22",
                        "ssn": "123-45-6789",
                        "idType": "ssn"
                    }
                ]
            }
        }
        
        report = Report(
            id=report_id,
            status="ready_to_file",
            property_address_text="456 Seaside Boulevard, Huntington Beach, CA 92648",
            closing_date=date(2026, 3, 15),
            filing_deadline=date(2026, 4, 14),  # 30 days after closing
            wizard_step=10,
            wizard_data=wizard_data,
            determination=wizard_data["determination"],
            escrow_number="RERX-TEST-001"
        )
        
        db.add(report)
        print(f"      Report created: {report_id}")
        print()
        
        # Create report parties
        print("[3/4] Creating report parties...")
        
        # Transferee party (the LLC)
        transferee = ReportParty(
            id=uuid4(),
            report_id=report_id,
            party_role="transferee",
            entity_type="llc",
            display_name="Coastal Investment Holdings LLC",
            status="submitted",
            party_data={
                "entity": {
                    "legalName": "Coastal Investment Holdings LLC",
                    "tin": "84-1234567",
                    "address": {
                        "street": "500 Newport Center Drive, Suite 700",
                        "city": "Newport Beach",
                        "state": "CA",
                        "zip": "92660"
                    }
                },
                "beneficialOwners": wizard_data["collection"]["buyerEntity"]["beneficialOwners"]
            }
        )
        db.add(transferee)
        print(f"      Transferee (LLC): {transferee.id}")
        
        # Transferor party (the seller)
        transferor = ReportParty(
            id=uuid4(),
            report_id=report_id,
            party_role="transferor",
            entity_type="individual",
            display_name="James P Wilson",
            status="submitted",
            party_data={
                "individual": {
                    "firstName": "James",
                    "lastName": "Wilson",
                    "middleName": "P",
                    "dateOfBirth": "1958-07-14",
                    "address": {
                        "street": "9876 Palm Drive",
                        "city": "Laguna Beach",
                        "state": "CA",
                        "zip": "92651"
                    }
                }
            }
        )
        db.add(transferor)
        print(f"      Transferor (Individual): {transferor.id}")
        
        db.commit()
        print()
        
        # Verify
        print("[4/4] Verifying test data...")
        
        test_report = db.query(Report).filter(Report.id == report_id).first()
        party_count = db.query(ReportParty).filter(ReportParty.report_id == report_id).count()
        
        print(f"      Report ID: {test_report.id}")
        print(f"      Status: {test_report.status}")
        print(f"      Closing Date: {test_report.closing_date}")
        print(f"      Parties: {party_count}")
        print()
        
        wd = test_report.wizard_data
        collection = wd.get("collection", {})
        
        print("      Data Summary:")
        print(f"        Buyer Type: {wd.get('determination', {}).get('buyerType')}")
        print(f"        Reporting Person: {collection.get('reportingPerson', {}).get('companyName')}")
        print(f"        Entity: {collection.get('buyerEntity', {}).get('entity', {}).get('legalName')}")
        print(f"        BOs: {len(collection.get('buyerEntity', {}).get('beneficialOwners', []))}")
        print(f"        Sellers: {len(collection.get('sellers', []))}")
        print(f"        Property: {collection.get('propertyAddress', {}).get('street')}")
        print(f"        Payment Sources: {len(collection.get('paymentSources', []))}")
        print(f"        Purchase Price: ${collection.get('purchasePrice', 0):,}")
        print()
        
        print("=" * 60)
        print("[SUCCESS] Test data created!")
        print("=" * 60)
        print()
        print("Next: Run the RERX dry run:")
        print("  python -m app.scripts.rerx_dry_run --show-data")
        print()
        
        return 0
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return 1
        
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
