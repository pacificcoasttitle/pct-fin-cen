"use client"

import { useState, useMemo } from "react"
import {
  Inbox,
  Search,
  Clock,
  Play,
  CheckCircle2,
  Timer,
  Filter,
  Eye,
  UserPlus,
  Building2,
  MapPin,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RequestStatusBadge } from "@/components/admin/request-status-badge"
import { PriorityBadge } from "@/components/admin/priority-badge"
import { RequestDetailSheet, type SubmissionRequest } from "@/components/admin/request-detail-sheet"
import { cn } from "@/lib/utils"

// Mock submission requests data (25 requests)
const mockSubmissionRequests: SubmissionRequest[] = [
  // Pending requests (8)
  {
    id: "req-001",
    companyId: "2",
    companyName: "Golden State Escrow",
    requestedBy: "Mike Chen",
    escrowNumber: "GSE-2026-1547",
    fileNumber: "F-98745",
    propertyAddress: { street: "742 Evergreen Terrace", city: "Springfield", state: "CA", zip: "90210" },
    buyerName: "John Smith",
    buyerType: "individual",
    buyerEmail: "john.smith@email.com",
    sellerName: "Jane Doe",
    purchasePriceCents: 125000000,
    financingType: "cash",
    expectedClosingDate: "2026-02-15",
    notes: "Buyer is purchasing as primary residence. All cash offer.",
    priority: "urgent",
    status: "pending",
    assignedTo: null,
    submittedAt: "2026-01-26T14:30:00Z",
    reportId: null
  },
  {
    id: "req-002",
    companyId: "3",
    companyName: "Summit Title Services",
    requestedBy: "Jennifer Walsh",
    escrowNumber: "STS-2026-0892",
    fileNumber: "F-11234",
    propertyAddress: { street: "1600 Pennsylvania Ave", city: "Washington", state: "CA", zip: "90001" },
    buyerName: "ABC Holdings LLC",
    buyerType: "entity",
    buyerEmail: "legal@abcholdings.com",
    sellerName: "Robert Johnson",
    purchasePriceCents: 275000000,
    financingType: "partial_cash",
    expectedClosingDate: "2026-02-10",
    notes: "Entity buyer - will need beneficial ownership info. Partial cash, partial financing.",
    priority: "normal",
    status: "pending",
    assignedTo: null,
    submittedAt: "2026-01-26T13:15:00Z",
    reportId: null
  },
  {
    id: "req-003",
    companyId: "5",
    companyName: "Coastal Closings Inc",
    requestedBy: "Amanda Torres",
    escrowNumber: "CCI-2026-0445",
    fileNumber: "F-55678",
    propertyAddress: { street: "123 Ocean View Dr", city: "Malibu", state: "CA", zip: "90265" },
    buyerName: "Smith Family Trust",
    buyerType: "trust",
    buyerEmail: "trustee@smithtrust.com",
    sellerName: "Beach Properties Inc",
    purchasePriceCents: 450000000,
    financingType: "cash",
    expectedClosingDate: "2026-02-20",
    notes: "Trust buyer. High value property - expedite if possible.",
    priority: "urgent",
    status: "pending",
    assignedTo: null,
    submittedAt: "2026-01-26T11:00:00Z",
    reportId: null
  },
  {
    id: "req-004",
    companyId: "4",
    companyName: "Bay Area Title Co",
    requestedBy: "David Park",
    escrowNumber: "BAT-2026-2234",
    fileNumber: "F-33445",
    propertyAddress: { street: "456 Tech Lane", city: "Palo Alto", state: "CA", zip: "94301" },
    buyerName: "Maria Garcia",
    buyerType: "individual",
    buyerEmail: "maria.g@email.com",
    sellerName: "Silicon Investments LLC",
    purchasePriceCents: 189500000,
    financingType: "cash",
    expectedClosingDate: "2026-02-08",
    notes: null,
    priority: "normal",
    status: "pending",
    assignedTo: null,
    submittedAt: "2026-01-26T10:30:00Z",
    reportId: null
  },
  {
    id: "req-005",
    companyId: "6",
    companyName: "Premier Escrow Services",
    requestedBy: "Robert Kim",
    escrowNumber: "PES-2026-1122",
    fileNumber: "F-77889",
    propertyAddress: { street: "789 Luxury Blvd", city: "Beverly Hills", state: "CA", zip: "90210" },
    buyerName: "Luxury Living Corp",
    buyerType: "entity",
    buyerEmail: "acquisitions@luxuryliving.com",
    sellerName: "Estate Holdings Trust",
    purchasePriceCents: 875000000,
    financingType: "cash",
    expectedClosingDate: "2026-02-25",
    notes: "Corporate buyer. Multiple beneficial owners expected.",
    priority: "urgent",
    status: "pending",
    assignedTo: null,
    submittedAt: "2026-01-26T09:45:00Z",
    reportId: null
  },
  {
    id: "req-006",
    companyId: "7",
    companyName: "Valley Title Group",
    requestedBy: "Lisa Martinez",
    escrowNumber: "VTG-2026-0567",
    fileNumber: "F-22334",
    propertyAddress: { street: "321 Valley Rd", city: "Van Nuys", state: "CA", zip: "91401" },
    buyerName: "Thomas Anderson",
    buyerType: "individual",
    buyerEmail: "t.anderson@email.com",
    sellerName: "Valley Home Sellers Inc",
    purchasePriceCents: 95000000,
    financingType: "cash",
    expectedClosingDate: "2026-02-12",
    notes: null,
    priority: "normal",
    status: "pending",
    assignedTo: null,
    submittedAt: "2026-01-26T08:30:00Z",
    reportId: null
  },
  {
    id: "req-007",
    companyId: "8",
    companyName: "Sunrise Settlement Co",
    requestedBy: "Kevin O'Brien",
    escrowNumber: "SSC-2026-0234",
    fileNumber: "F-44556",
    propertyAddress: { street: "555 Morning Star Ave", city: "Pasadena", state: "CA", zip: "91101" },
    buyerName: "Sunrise Ventures LLC",
    buyerType: "entity",
    buyerEmail: "legal@sunriseventures.com",
    sellerName: "Patricia Williams",
    purchasePriceCents: 167500000,
    financingType: "cash",
    expectedClosingDate: "2026-02-18",
    notes: "LLC buyer with single member. Need to verify beneficial ownership.",
    priority: "normal",
    status: "pending",
    assignedTo: null,
    submittedAt: "2026-01-25T16:00:00Z",
    reportId: null
  },
  {
    id: "req-008",
    companyId: "10",
    companyName: "Cornerstone Escrow",
    requestedBy: "James Lee",
    escrowNumber: "CSE-2026-0789",
    fileNumber: "F-66778",
    propertyAddress: { street: "888 Harbor View", city: "Long Beach", state: "CA", zip: "90802" },
    buyerName: "Harbor Investment Trust",
    buyerType: "trust",
    buyerEmail: "trust@harborinvest.com",
    sellerName: "Coastal Developers LLC",
    purchasePriceCents: 234000000,
    financingType: "cash",
    expectedClosingDate: "2026-02-22",
    notes: "Investment trust buyer. Trust documents on file.",
    priority: "normal",
    status: "pending",
    assignedTo: null,
    submittedAt: "2026-01-25T14:30:00Z",
    reportId: null
  },

  // In Progress (5)
  {
    id: "req-009",
    companyId: "2",
    companyName: "Golden State Escrow",
    requestedBy: "Linda Tran",
    escrowNumber: "GSE-2026-1489",
    fileNumber: "F-12345",
    propertyAddress: { street: "321 Main St", city: "San Francisco", state: "CA", zip: "94102" },
    buyerName: "Tech Ventures LLC",
    buyerType: "entity",
    buyerEmail: "legal@techventures.com",
    sellerName: "Downtown Properties",
    purchasePriceCents: 325000000,
    financingType: "cash",
    expectedClosingDate: "2026-02-05",
    notes: "Waiting on BO information from buyer.",
    priority: "normal",
    status: "in_progress",
    assignedTo: { id: "u3", name: "Emily Chen" },
    assignedAt: "2026-01-25T14:00:00Z",
    submittedAt: "2026-01-25T10:00:00Z",
    reportId: "rpt-2026-0089"
  },
  {
    id: "req-010",
    companyId: "3",
    companyName: "Summit Title Services",
    requestedBy: "Brian Cooper",
    escrowNumber: "STS-2026-0845",
    fileNumber: "F-23456",
    propertyAddress: { street: "999 Summit Peak Dr", city: "San Diego", state: "CA", zip: "92101" },
    buyerName: "Peak Holdings LLC",
    buyerType: "entity",
    buyerEmail: "admin@peakholdings.com",
    sellerName: "Mountain View Estates",
    purchasePriceCents: 412000000,
    financingType: "cash",
    expectedClosingDate: "2026-02-03",
    notes: "Collecting party information. Buyer responsive.",
    priority: "urgent",
    status: "in_progress",
    assignedTo: { id: "u4", name: "Michael Thompson" },
    assignedAt: "2026-01-24T16:00:00Z",
    submittedAt: "2026-01-24T11:30:00Z",
    reportId: "rpt-2026-0085"
  },
  {
    id: "req-011",
    companyId: "5",
    companyName: "Coastal Closings Inc",
    requestedBy: "Ryan Garcia",
    escrowNumber: "CCI-2026-0398",
    fileNumber: "F-34567",
    propertyAddress: { street: "777 Beachfront Way", city: "Santa Monica", state: "CA", zip: "90401" },
    buyerName: "Sarah Johnson",
    buyerType: "individual",
    buyerEmail: "sarah.j@email.com",
    sellerName: "Beachfront Holdings",
    purchasePriceCents: 198000000,
    financingType: "cash",
    expectedClosingDate: "2026-02-07",
    notes: null,
    priority: "normal",
    status: "in_progress",
    assignedTo: { id: "u5", name: "Jessica Wang" },
    assignedAt: "2026-01-24T10:00:00Z",
    submittedAt: "2026-01-24T08:00:00Z",
    reportId: "rpt-2026-0082"
  },
  {
    id: "req-012",
    companyId: "4",
    companyName: "Bay Area Title Co",
    requestedBy: "Susan Miller",
    escrowNumber: "BAT-2026-2198",
    fileNumber: "F-45678",
    propertyAddress: { street: "444 Innovation Dr", city: "Menlo Park", state: "CA", zip: "94025" },
    buyerName: "Innovation Partners LP",
    buyerType: "entity",
    buyerEmail: "deals@innovationpartners.com",
    sellerName: "Tech Campus LLC",
    purchasePriceCents: 567000000,
    financingType: "cash",
    expectedClosingDate: "2026-02-01",
    notes: "High priority. Multiple LPs to verify.",
    priority: "urgent",
    status: "in_progress",
    assignedTo: { id: "u6", name: "Daniel Kim" },
    assignedAt: "2026-01-23T15:00:00Z",
    submittedAt: "2026-01-23T09:00:00Z",
    reportId: "rpt-2026-0079"
  },
  {
    id: "req-013",
    companyId: "6",
    companyName: "Premier Escrow Services",
    requestedBy: "Patricia Nguyen",
    escrowNumber: "PES-2026-1098",
    fileNumber: "F-56789",
    propertyAddress: { street: "222 Rodeo Dr", city: "Beverly Hills", state: "CA", zip: "90210" },
    buyerName: "Rodriguez Family Trust",
    buyerType: "trust",
    buyerEmail: "trust@rodriguezfamily.com",
    sellerName: "Luxury Estates Inc",
    purchasePriceCents: 345000000,
    financingType: "cash",
    expectedClosingDate: "2026-02-04",
    notes: "Trust documentation received. Verifying trustees.",
    priority: "normal",
    status: "in_progress",
    assignedTo: { id: "u7", name: "Rachel Foster" },
    assignedAt: "2026-01-23T11:00:00Z",
    submittedAt: "2026-01-22T16:00:00Z",
    reportId: "rpt-2026-0076"
  },

  // Completed (12)
  {
    id: "req-014",
    companyId: "3",
    companyName: "Summit Title Services",
    requestedBy: "Brian Cooper",
    escrowNumber: "STS-2026-0756",
    fileNumber: "F-99887",
    propertyAddress: { street: "555 Park Ave", city: "San Diego", state: "CA", zip: "92101" },
    buyerName: "Michael Thompson",
    buyerType: "individual",
    buyerEmail: "m.thompson@email.com",
    sellerName: "Park Avenue Homes",
    purchasePriceCents: 156000000,
    financingType: "cash",
    expectedClosingDate: "2026-01-28",
    notes: null,
    priority: "normal",
    status: "completed",
    assignedTo: { id: "u4", name: "Michael Thompson" },
    assignedAt: "2026-01-24T09:00:00Z",
    completedAt: "2026-01-26T16:30:00Z",
    submittedAt: "2026-01-24T08:00:00Z",
    reportId: "rpt-2026-0078"
  },
  {
    id: "req-015",
    companyId: "2",
    companyName: "Golden State Escrow",
    requestedBy: "Steve Martinez",
    escrowNumber: "GSE-2026-1456",
    fileNumber: "F-88776",
    propertyAddress: { street: "123 Golden Gate Way", city: "San Francisco", state: "CA", zip: "94102" },
    buyerName: "Chen Family Trust",
    buyerType: "trust",
    buyerEmail: "chen.trust@email.com",
    sellerName: "Bay View Properties",
    purchasePriceCents: 289000000,
    financingType: "cash",
    expectedClosingDate: "2026-01-27",
    notes: null,
    priority: "normal",
    status: "completed",
    assignedTo: { id: "u3", name: "Emily Chen" },
    assignedAt: "2026-01-23T10:00:00Z",
    completedAt: "2026-01-26T14:00:00Z",
    submittedAt: "2026-01-23T08:30:00Z",
    reportId: "rpt-2026-0075"
  },
  {
    id: "req-016",
    companyId: "5",
    companyName: "Coastal Closings Inc",
    requestedBy: "Nicole Adams",
    escrowNumber: "CCI-2026-0367",
    fileNumber: "F-77665",
    propertyAddress: { street: "888 Coastal Hwy", city: "Laguna Beach", state: "CA", zip: "92651" },
    buyerName: "David Williams",
    buyerType: "individual",
    buyerEmail: "d.williams@email.com",
    sellerName: "Coastal Investments LLC",
    purchasePriceCents: 178000000,
    financingType: "cash",
    expectedClosingDate: "2026-01-26",
    notes: null,
    priority: "normal",
    status: "completed",
    assignedTo: { id: "u5", name: "Jessica Wang" },
    assignedAt: "2026-01-22T14:00:00Z",
    completedAt: "2026-01-26T11:00:00Z",
    submittedAt: "2026-01-22T10:00:00Z",
    reportId: "rpt-2026-0072"
  },
  {
    id: "req-017",
    companyId: "4",
    companyName: "Bay Area Title Co",
    requestedBy: "Greg Thompson",
    escrowNumber: "BAT-2026-2145",
    fileNumber: "F-66554",
    propertyAddress: { street: "456 Silicon Ave", city: "Mountain View", state: "CA", zip: "94043" },
    buyerName: "Valley Ventures LLC",
    buyerType: "entity",
    buyerEmail: "legal@valleyventures.com",
    sellerName: "Tech Campus Holdings",
    purchasePriceCents: 423000000,
    financingType: "cash",
    expectedClosingDate: "2026-01-25",
    notes: null,
    priority: "urgent",
    status: "completed",
    assignedTo: { id: "u6", name: "Daniel Kim" },
    assignedAt: "2026-01-21T09:00:00Z",
    completedAt: "2026-01-26T09:30:00Z",
    submittedAt: "2026-01-20T16:00:00Z",
    reportId: "rpt-2026-0068"
  },
  {
    id: "req-018",
    companyId: "6",
    companyName: "Premier Escrow Services",
    requestedBy: "Mark Davis",
    escrowNumber: "PES-2026-1067",
    fileNumber: "F-55443",
    propertyAddress: { street: "111 Sunset Blvd", city: "West Hollywood", state: "CA", zip: "90069" },
    buyerName: "Entertainment Holdings LLC",
    buyerType: "entity",
    buyerEmail: "admin@entertainmenthold.com",
    sellerName: "Sunset Properties Inc",
    purchasePriceCents: 567000000,
    financingType: "cash",
    expectedClosingDate: "2026-01-24",
    notes: null,
    priority: "normal",
    status: "completed",
    assignedTo: { id: "u7", name: "Rachel Foster" },
    assignedAt: "2026-01-20T11:00:00Z",
    completedAt: "2026-01-25T15:00:00Z",
    submittedAt: "2026-01-20T08:00:00Z",
    reportId: "rpt-2026-0065"
  },
  {
    id: "req-019",
    companyId: "7",
    companyName: "Valley Title Group",
    requestedBy: "Eric Johnson",
    escrowNumber: "VTG-2026-0534",
    fileNumber: "F-44332",
    propertyAddress: { street: "789 Valley View Rd", city: "Encino", state: "CA", zip: "91436" },
    buyerName: "Amanda Roberts",
    buyerType: "individual",
    buyerEmail: "a.roberts@email.com",
    sellerName: "Encino Estates",
    purchasePriceCents: 134000000,
    financingType: "cash",
    expectedClosingDate: "2026-01-23",
    notes: null,
    priority: "normal",
    status: "completed",
    assignedTo: { id: "u3", name: "Emily Chen" },
    assignedAt: "2026-01-19T15:00:00Z",
    completedAt: "2026-01-25T10:00:00Z",
    submittedAt: "2026-01-19T11:00:00Z",
    reportId: "rpt-2026-0062"
  },
  {
    id: "req-020",
    companyId: "8",
    companyName: "Sunrise Settlement Co",
    requestedBy: "Samantha Lee",
    escrowNumber: "SSC-2026-0198",
    fileNumber: "F-33221",
    propertyAddress: { street: "234 Morning Glory Ln", city: "Glendale", state: "CA", zip: "91201" },
    buyerName: "Morning Star Trust",
    buyerType: "trust",
    buyerEmail: "trust@morningstar.com",
    sellerName: "Glendale Homes LLC",
    purchasePriceCents: 112000000,
    financingType: "cash",
    expectedClosingDate: "2026-01-22",
    notes: null,
    priority: "normal",
    status: "completed",
    assignedTo: { id: "u4", name: "Michael Thompson" },
    assignedAt: "2026-01-18T10:00:00Z",
    completedAt: "2026-01-24T16:00:00Z",
    submittedAt: "2026-01-18T08:00:00Z",
    reportId: "rpt-2026-0058"
  },
  {
    id: "req-021",
    companyId: "10",
    companyName: "Cornerstone Escrow",
    requestedBy: "Michelle Park",
    escrowNumber: "CSE-2026-0745",
    fileNumber: "F-22110",
    propertyAddress: { street: "567 Stone Canyon Rd", city: "Bel Air", state: "CA", zip: "90077" },
    buyerName: "Canyon Partners LLC",
    buyerType: "entity",
    buyerEmail: "admin@canyonpartners.com",
    sellerName: "Stone Estate Holdings",
    purchasePriceCents: 789000000,
    financingType: "cash",
    expectedClosingDate: "2026-01-21",
    notes: null,
    priority: "urgent",
    status: "completed",
    assignedTo: { id: "u5", name: "Jessica Wang" },
    assignedAt: "2026-01-17T09:00:00Z",
    completedAt: "2026-01-24T11:00:00Z",
    submittedAt: "2026-01-16T15:00:00Z",
    reportId: "rpt-2026-0055"
  },
  {
    id: "req-022",
    companyId: "2",
    companyName: "Golden State Escrow",
    requestedBy: "Mike Chen",
    escrowNumber: "GSE-2026-1423",
    fileNumber: "F-11009",
    propertyAddress: { street: "890 Market St", city: "San Francisco", state: "CA", zip: "94103" },
    buyerName: "Market Square LLC",
    buyerType: "entity",
    buyerEmail: "legal@marketsquare.com",
    sellerName: "Urban Developers Inc",
    purchasePriceCents: 356000000,
    financingType: "cash",
    expectedClosingDate: "2026-01-20",
    notes: null,
    priority: "normal",
    status: "completed",
    assignedTo: { id: "u6", name: "Daniel Kim" },
    assignedAt: "2026-01-16T14:00:00Z",
    completedAt: "2026-01-23T15:00:00Z",
    submittedAt: "2026-01-16T09:00:00Z",
    reportId: "rpt-2026-0052"
  },
  {
    id: "req-023",
    companyId: "3",
    companyName: "Summit Title Services",
    requestedBy: "Maria Santos",
    escrowNumber: "STS-2026-0712",
    fileNumber: "F-00998",
    propertyAddress: { street: "432 Summit Dr", city: "La Jolla", state: "CA", zip: "92037" },
    buyerName: "Robert Chen",
    buyerType: "individual",
    buyerEmail: "r.chen@email.com",
    sellerName: "La Jolla Properties",
    purchasePriceCents: 234500000,
    financingType: "cash",
    expectedClosingDate: "2026-01-19",
    notes: null,
    priority: "normal",
    status: "completed",
    assignedTo: { id: "u7", name: "Rachel Foster" },
    assignedAt: "2026-01-15T10:00:00Z",
    completedAt: "2026-01-22T14:00:00Z",
    submittedAt: "2026-01-15T08:00:00Z",
    reportId: "rpt-2026-0048"
  },
  {
    id: "req-024",
    companyId: "5",
    companyName: "Coastal Closings Inc",
    requestedBy: "Jason Wright",
    escrowNumber: "CCI-2026-0334",
    fileNumber: "F-99887",
    propertyAddress: { street: "765 Pacific Coast Hwy", city: "Huntington Beach", state: "CA", zip: "92648" },
    buyerName: "Pacific Dreams LLC",
    buyerType: "entity",
    buyerEmail: "info@pacificdreams.com",
    sellerName: "Surfside Holdings",
    purchasePriceCents: 198700000,
    financingType: "cash",
    expectedClosingDate: "2026-01-18",
    notes: null,
    priority: "normal",
    status: "completed",
    assignedTo: { id: "u3", name: "Emily Chen" },
    assignedAt: "2026-01-14T11:00:00Z",
    completedAt: "2026-01-21T16:00:00Z",
    submittedAt: "2026-01-14T08:30:00Z",
    reportId: "rpt-2026-0045"
  },
  {
    id: "req-025",
    companyId: "4",
    companyName: "Bay Area Title Co",
    requestedBy: "David Park",
    escrowNumber: "BAT-2026-2112",
    fileNumber: "F-88776",
    propertyAddress: { street: "321 University Ave", city: "Berkeley", state: "CA", zip: "94702" },
    buyerName: "University Holdings Trust",
    buyerType: "trust",
    buyerEmail: "trust@uniholdings.com",
    sellerName: "Berkeley Real Estate LLC",
    purchasePriceCents: 145000000,
    financingType: "cash",
    expectedClosingDate: "2026-01-17",
    notes: null,
    priority: "normal",
    status: "completed",
    assignedTo: { id: "u4", name: "Michael Thompson" },
    assignedAt: "2026-01-13T09:00:00Z",
    completedAt: "2026-01-20T11:00:00Z",
    submittedAt: "2026-01-13T07:30:00Z",
    reportId: "rpt-2026-0042"
  },
]

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function truncateAddress(address: { street: string; city: string; state: string }): string {
  const full = `${address.street}, ${address.city}`
  return full.length > 30 ? full.substring(0, 30) + "..." : full
}

export default function AdminRequestsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [selectedRequest, setSelectedRequest] = useState<SubmissionRequest | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Calculate stats
  const stats = useMemo(() => {
    const pending = mockSubmissionRequests.filter(r => r.status === "pending").length
    const inProgress = mockSubmissionRequests.filter(r => r.status === "in_progress").length
    const today = new Date().toDateString()
    const completedToday = mockSubmissionRequests.filter(
      r => r.status === "completed" && r.completedAt && new Date(r.completedAt).toDateString() === today
    ).length
    return {
      pending,
      inProgress,
      completedToday,
      avgProcessingHours: 4.2, // Mock value
    }
  }, [])

  // Filter requests
  const filteredRequests = useMemo(() => {
    return mockSubmissionRequests.filter(request => {
      const matchesSearch = 
        request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.escrowNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.propertyAddress.street.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || request.status === statusFilter
      const matchesPriority = priorityFilter === "all" || request.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [searchQuery, statusFilter, priorityFilter])

  const handleViewRequest = (request: SubmissionRequest) => {
    setSelectedRequest(request)
    setSheetOpen(true)
  }

  const handleAssign = (requestId: string, userId: string) => {
    console.log("Assign request", requestId, "to user", userId)
    // Demo: would update state here
  }

  const handleStartWizard = (requestId: string) => {
    console.log("Start wizard for request", requestId)
    // Demo: would create report and redirect
  }

  const handleCancel = (requestId: string) => {
    console.log("Cancel request", requestId)
    // Demo: would update status
    setSheetOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Submission Requests</h1>
          <p className="text-slate-500">Process incoming FinCEN filing requests from clients</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Play className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Completed Today</p>
                <p className="text-2xl font-bold">{stats.completedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-xl">
                <Timer className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Processing</p>
                <p className="text-2xl font-bold">{stats.avgProcessingHours} hrs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Request Queue</CardTitle>
                <CardDescription>
                  {filteredRequests.length} {filteredRequests.length === 1 ? "request" : "requests"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search requests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Status Filter Tabs */}
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending" className="gap-1.5">
                  Pending
                  <Badge variant="secondary" className="h-5 px-1.5 bg-amber-100 text-amber-700">
                    {mockSubmissionRequests.filter(r => r.status === "pending").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Request</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Escrow #</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                      No requests found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow 
                      key={request.id} 
                      className={cn(
                        "cursor-pointer hover:bg-slate-50",
                        request.priority === "urgent" && "border-l-2 border-l-red-400"
                      )}
                      onClick={() => handleViewRequest(request)}
                    >
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {request.id.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-sm">{request.companyName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {truncateAddress(request.propertyAddress)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {request.buyerName}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-slate-600">
                          {request.escrowNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={request.priority} showIcon />
                      </TableCell>
                      <TableCell>
                        <RequestStatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {formatTimeAgo(request.submittedAt)}
                      </TableCell>
                      <TableCell>
                        {request.assignedTo ? (
                          <span className="text-sm font-medium">{request.assignedTo.name}</span>
                        ) : (
                          <span className="text-sm text-slate-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewRequest(request)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Demo Notice */}
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span>
                <strong>Demo data</strong> — This is sample request data for demonstration purposes.
                Request processing features will be available post-launch.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Request Detail Sheet */}
      <RequestDetailSheet
        request={selectedRequest}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onAssign={handleAssign}
        onStartWizard={handleStartWizard}
        onCancel={handleCancel}
      />
    </div>
  )
}
