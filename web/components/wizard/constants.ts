// ============================================================
// WIZARD CONSTANTS
// Options for exemption checklists per FinCEN RRE rule
// ============================================================

import { StepMeta } from "./types";

// Transfer-level exemptions (asked FIRST - Section 1 of FinCEN spec)
export const TRANSFER_EXEMPTION_OPTIONS = [
  {
    id: "easement",
    label: "Easement only",
    description: "No fee simple transfer of the property",
  },
  {
    id: "death",
    label: "Transfer resulting from death",
    description: "Inheritance, estate distribution, TOD deed, intestate succession",
  },
  {
    id: "divorce",
    label: "Divorce or dissolution",
    description: "Transfer incidental to divorce or legal dissolution",
  },
  {
    id: "bankruptcy",
    label: "Bankruptcy estate",
    description: "Transfer to a bankruptcy estate",
  },
  {
    id: "court-supervised",
    label: "Court-supervised transfer",
    description: "Judicial sale, receivership, or other court supervision",
  },
  {
    id: "self-settled-trust",
    label: "Self-settled trust",
    description: "No-consideration transfer by individual to their own trust",
  },
  {
    id: "1031-exchange",
    label: "1031 Exchange",
    description: "Transfer to a qualified intermediary for 1031 exchange",
  },
  {
    id: "no-reporting-person",
    label: "No reporting person",
    description: "No reporting person identified for this transaction",
  },
] as const;

// Entity exemptions (16 types per FinCEN spec Section 5)
export const ENTITY_EXEMPTION_OPTIONS = [
  { id: "securities-issuer", label: "Securities reporting issuer (publicly traded)" },
  { id: "government", label: "Governmental authority (federal, state, local, tribal)" },
  { id: "bank", label: "Bank" },
  { id: "credit-union", label: "Credit union" },
  { id: "depository-holding", label: "Depository institution holding company" },
  { id: "msb", label: "Money services business (FinCEN registered)" },
  { id: "broker-dealer", label: "Broker or dealer in securities (SEC registered)" },
  { id: "exchange-clearing", label: "Securities exchange or clearing agency" },
  { id: "exchange-act", label: "Other Exchange Act registered entity" },
  { id: "insurance-company", label: "Insurance company" },
  { id: "insurance-producer", label: "State-licensed insurance producer" },
  { id: "commodity", label: "Commodity Exchange Act registered entity" },
  { id: "public-utility", label: "Public utility" },
  { id: "financial-market-utility", label: "Financial market utility" },
  { id: "investment-company", label: "Registered investment company or adviser" },
  { id: "exempt-subsidiary", label: "Subsidiary of any exempt entity above" },
] as const;

// Trust exemptions (Section 6 of FinCEN spec)
export const TRUST_EXEMPTION_OPTIONS = [
  {
    id: "trust-securities-issuer",
    label: "Trust is a securities reporting issuer",
  },
  {
    id: "trustee-securities-issuer",
    label: "Trustee is a securities reporting issuer",
  },
  {
    id: "exempt-owned",
    label: "Trust wholly owned by an exempt entity",
  },
] as const;

// ============================================================
// RERX MAPPING CONSTANTS
// These values MUST match the RERX builder mapping functions.
// Uses snake_case to match existing codebase (Cursor implemented).
// ============================================================

// Legal description types (matches rerx_builder._map_legal_description_type)
export const LEGAL_DESCRIPTION_TYPE_OPTIONS = [
  {
    id: "metes_and_bounds",
    label: "Metes and Bounds",
    description: "Boundary descriptions using directions and distances",
  },
  {
    id: "lot_block_subdivision",
    label: "Lot/Block/Subdivision",
    description: "Subdivision plat reference (lot #, block #, subdivision name)",
  },
  {
    id: "other",
    label: "Other",
    description: "Condominium unit, tax parcel ID, APN, or other description",
  },
] as const;

// Reporting person categories (matches rerx_builder._map_reporting_person_category)
// Per 31 CFR 1031.320 cascade priority
export const REPORTING_PERSON_CATEGORY_OPTIONS = [
  {
    id: "closing_settlement_agent",
    label: "Closing/Settlement Agent",
    description: "Person who conducts the closing or settlement",
  },
  {
    id: "closing_statement_preparer",
    label: "Closing Statement Preparer",
    description: "Person who prepares the closing or settlement statement (HUD-1/CD)",
  },
  {
    id: "deed_filer",
    label: "Deed Filer",
    description: "Person who files the deed or other instrument of transfer",
  },
  {
    id: "title_insurance_agent",
    label: "Title Insurance Agent",
    description: "Agent for a title insurance company",
  },
  {
    id: "title_insurance_underwriter",
    label: "Title Insurance Underwriter",
    description: "Title insurance underwriting company",
  },
  {
    id: "attorney",
    label: "Attorney",
    description: "Attorney licensed to practice law representing the transferee",
  },
  {
    id: "other",
    label: "Other",
    description: "Other reporting person category",
  },
] as const;

// Step metadata
export const DETERMINATION_STEPS: StepMeta[] = [
  {
    id: "transaction-reference",
    title: "Transaction",
    description: "Property and transaction details",
    phase: "determination",
  },
  {
    id: "transfer-exemptions",
    title: "Transfer Type",
    description: "Check for exempt transfer types",
    phase: "determination",
  },
  {
    id: "property-type",
    title: "Property Type",
    description: "Residential property check",
    phase: "determination",
  },
  {
    id: "financing",
    title: "Financing",
    description: "Non-financed transfer check",
    phase: "determination",
  },
  {
    id: "buyer-type",
    title: "Buyer Type",
    description: "Individual, entity, or trust",
    phase: "determination",
  },
  {
    id: "entity-exemptions",
    title: "Entity Check",
    description: "Exempt entity types",
    phase: "determination",
  },
  {
    id: "trust-exemptions",
    title: "Trust Check",
    description: "Exempt trust types",
    phase: "determination",
  },
  {
    id: "determination-result",
    title: "Result",
    description: "Determination outcome",
    phase: "determination",
  },
];

export const COLLECTION_STEPS: StepMeta[] = [
  {
    id: "party-setup",
    title: "Party Setup",
    description: "Add buyers and sellers",
    phase: "collection",
  },
  {
    id: "party-status",
    title: "Party Status",
    description: "Monitor submissions",
    phase: "collection",
  },
];
