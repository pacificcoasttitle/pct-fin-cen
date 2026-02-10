# 🏢 Branches & Offices Feature

## Overview

Allow escrow admins to create and manage branches/offices within their company. Team members (escrow officers) can be associated with specific branches.

---

## Data Model

### New Table: `branches`

```python
# api/app/models/branch.py

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from app.database import Base

class Branch(Base):
    __tablename__ = "branches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    
    # Branch details
    name = Column(String(255), nullable=False)  # e.g., "Downtown Office"
    code = Column(String(50), nullable=True)    # e.g., "DT-01"
    
    # Address
    street = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(50), nullable=True)
    zip = Column(String(20), nullable=True)
    
    # Contact
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    
    # Manager
    manager_name = Column(String(255), nullable=True)
    manager_email = Column(String(255), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_headquarters = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="branches")
    users = relationship("User", back_populates="branch")
```

### Update User Model

```python
# api/app/models/user.py

class User(Base):
    # ... existing fields ...
    
    # Add branch association
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)
    
    # Relationships
    branch = relationship("Branch", back_populates="users")
```

### Update Company Model

```python
# api/app/models/company.py

class Company(Base):
    # ... existing fields ...
    
    # Relationships
    branches = relationship("Branch", back_populates="company", cascade="all, delete-orphan")
```

---

## Migration

**File:** `api/alembic/versions/20260209_add_branches.py`

```python
"""Add branches table and user branch association

Revision ID: 20260209_branches
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '20260209_branches'
down_revision = None  # Update to latest
branch_labels = None
depends_on = None

def upgrade():
    # Create branches table
    op.create_table(
        'branches',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('company_id', UUID(as_uuid=True), sa.ForeignKey('companies.id'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(50), nullable=True),
        sa.Column('street', sa.String(255), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(50), nullable=True),
        sa.Column('zip', sa.String(20), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('manager_name', sa.String(255), nullable=True),
        sa.Column('manager_email', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_headquarters', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )
    
    # Add branch_id to users
    op.add_column('users', sa.Column('branch_id', UUID(as_uuid=True), sa.ForeignKey('branches.id'), nullable=True))

def downgrade():
    op.drop_column('users', 'branch_id')
    op.drop_table('branches')
```

---

## API Endpoints

**File:** `api/app/routes/branches.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.branch import Branch
from app.models.user import User
from app.auth import get_current_user

router = APIRouter(prefix="/branches", tags=["branches"])

# Schemas
class BranchCreate(BaseModel):
    name: str
    code: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    is_headquarters: bool = False

class BranchUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    is_active: Optional[bool] = None
    is_headquarters: Optional[bool] = None

class BranchResponse(BaseModel):
    id: UUID
    name: str
    code: Optional[str]
    street: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    manager_name: Optional[str]
    manager_email: Optional[str]
    is_active: bool
    is_headquarters: bool
    user_count: int
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[BranchResponse])
async def list_branches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all branches for the current user's company."""
    
    if current_user.role not in ["client_admin"]:
        raise HTTPException(403, "Only client admins can manage branches")
    
    branches = db.query(Branch).filter(
        Branch.company_id == current_user.company_id,
        Branch.is_active == True
    ).all()
    
    # Add user counts
    result = []
    for branch in branches:
        user_count = db.query(User).filter(User.branch_id == branch.id).count()
        result.append({
            **branch.__dict__,
            "user_count": user_count
        })
    
    return result


@router.post("/", response_model=BranchResponse)
async def create_branch(
    branch_data: BranchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new branch."""
    
    if current_user.role not in ["client_admin"]:
        raise HTTPException(403, "Only client admins can create branches")
    
    # If setting as HQ, unset other HQ
    if branch_data.is_headquarters:
        db.query(Branch).filter(
            Branch.company_id == current_user.company_id,
            Branch.is_headquarters == True
        ).update({"is_headquarters": False})
    
    branch = Branch(
        company_id=current_user.company_id,
        **branch_data.dict()
    )
    
    db.add(branch)
    db.commit()
    db.refresh(branch)
    
    return {**branch.__dict__, "user_count": 0}


@router.get("/{branch_id}", response_model=BranchResponse)
async def get_branch(
    branch_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific branch."""
    
    branch = db.query(Branch).filter(
        Branch.id == branch_id,
        Branch.company_id == current_user.company_id
    ).first()
    
    if not branch:
        raise HTTPException(404, "Branch not found")
    
    user_count = db.query(User).filter(User.branch_id == branch.id).count()
    
    return {**branch.__dict__, "user_count": user_count}


@router.patch("/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: UUID,
    branch_data: BranchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a branch."""
    
    if current_user.role not in ["client_admin"]:
        raise HTTPException(403, "Only client admins can update branches")
    
    branch = db.query(Branch).filter(
        Branch.id == branch_id,
        Branch.company_id == current_user.company_id
    ).first()
    
    if not branch:
        raise HTTPException(404, "Branch not found")
    
    # If setting as HQ, unset other HQ
    if branch_data.is_headquarters:
        db.query(Branch).filter(
            Branch.company_id == current_user.company_id,
            Branch.is_headquarters == True,
            Branch.id != branch_id
        ).update({"is_headquarters": False})
    
    for key, value in branch_data.dict(exclude_unset=True).items():
        setattr(branch, key, value)
    
    db.commit()
    db.refresh(branch)
    
    user_count = db.query(User).filter(User.branch_id == branch.id).count()
    
    return {**branch.__dict__, "user_count": user_count}


@router.delete("/{branch_id}")
async def delete_branch(
    branch_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete a branch (set inactive)."""
    
    if current_user.role not in ["client_admin"]:
        raise HTTPException(403, "Only client admins can delete branches")
    
    branch = db.query(Branch).filter(
        Branch.id == branch_id,
        Branch.company_id == current_user.company_id
    ).first()
    
    if not branch:
        raise HTTPException(404, "Branch not found")
    
    # Unassign users from this branch
    db.query(User).filter(User.branch_id == branch_id).update({"branch_id": None})
    
    branch.is_active = False
    db.commit()
    
    return {"success": True, "message": "Branch deleted"}


@router.get("/{branch_id}/users")
async def list_branch_users(
    branch_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List users assigned to a branch."""
    
    branch = db.query(Branch).filter(
        Branch.id == branch_id,
        Branch.company_id == current_user.company_id
    ).first()
    
    if not branch:
        raise HTTPException(404, "Branch not found")
    
    users = db.query(User).filter(User.branch_id == branch_id).all()
    
    return [
        {
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "role": u.role,
        }
        for u in users
    ]


@router.post("/{branch_id}/users/{user_id}")
async def assign_user_to_branch(
    branch_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign a user to a branch."""
    
    if current_user.role not in ["client_admin"]:
        raise HTTPException(403, "Only client admins can assign users to branches")
    
    branch = db.query(Branch).filter(
        Branch.id == branch_id,
        Branch.company_id == current_user.company_id
    ).first()
    
    if not branch:
        raise HTTPException(404, "Branch not found")
    
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == current_user.company_id
    ).first()
    
    if not user:
        raise HTTPException(404, "User not found")
    
    user.branch_id = branch_id
    db.commit()
    
    return {"success": True, "message": f"User assigned to {branch.name}"}


@router.delete("/{branch_id}/users/{user_id}")
async def remove_user_from_branch(
    branch_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a user from a branch."""
    
    if current_user.role not in ["client_admin"]:
        raise HTTPException(403, "Only client admins can manage branch users")
    
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == current_user.company_id,
        User.branch_id == branch_id
    ).first()
    
    if not user:
        raise HTTPException(404, "User not found in this branch")
    
    user.branch_id = None
    db.commit()
    
    return {"success": True, "message": "User removed from branch"}
```

---

## Frontend: Branch Management Page

**File:** `web/app/(app)/app/settings/branches/page.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  Plus, 
  Users, 
  MapPin, 
  Phone, 
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Branch {
  id: string;
  name: string;
  code: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  manager_name: string | null;
  manager_email: string | null;
  is_headquarters: boolean;
  user_count: number;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    manager_name: "",
    manager_email: "",
    is_headquarters: false,
  });

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (res.ok) {
        setBranches(await res.json());
      }
    } catch (error) {
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleSubmit = async () => {
    try {
      const url = editingBranch 
        ? `/api/branches/${editingBranch.id}`
        : "/api/branches";
      
      const res = await fetch(url, {
        method: editingBranch ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingBranch ? "Branch updated" : "Branch created");
        setShowCreateDialog(false);
        setEditingBranch(null);
        resetForm();
        fetchBranches();
      } else {
        toast.error("Failed to save branch");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (!confirm(`Delete ${branch.name}? Users will be unassigned from this branch.`)) return;
    
    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Branch deleted");
        fetchBranches();
      }
    } catch (error) {
      toast.error("Failed to delete branch");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      phone: "",
      email: "",
      manager_name: "",
      manager_email: "",
      is_headquarters: false,
    });
  };

  const openEditDialog = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code || "",
      street: branch.street || "",
      city: branch.city || "",
      state: branch.state || "",
      zip: branch.zip || "",
      phone: branch.phone || "",
      email: branch.email || "",
      manager_name: branch.manager_name || "",
      manager_email: branch.manager_email || "",
      is_headquarters: branch.is_headquarters,
    });
    setShowCreateDialog(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches & Offices</h1>
          <p className="text-gray-500">Manage your company's locations</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            setEditingBranch(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-teal-500 to-cyan-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBranch ? "Edit Branch" : "Add New Branch"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Branch Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Downtown Office"
                  />
                </div>
                <div>
                  <Label>Branch Code</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="DT-01"
                  />
                </div>
              </div>

              <div>
                <Label>Street Address</Label>
                <Input
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  placeholder="123 Main Street, Suite 100"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Los Angeles"
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="CA"
                  />
                </div>
                <div>
                  <Label>ZIP</Label>
                  <Input
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    placeholder="90001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="downtown@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Branch Manager</Label>
                  <Input
                    value={formData.manager_name}
                    onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <Label>Manager Email</Label>
                  <Input
                    value={formData.manager_email}
                    onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                    placeholder="jane@company.com"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_headquarters}
                  onChange={(e) => setFormData({ ...formData, is_headquarters: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">This is the headquarters / main office</span>
              </label>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.name}>
                  {editingBranch ? "Save Changes" : "Create Branch"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Branches Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Team</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No branches yet. Create your first branch to get started.
                  </TableCell>
                </TableRow>
              ) : (
                branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                          <Building className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{branch.name}</span>
                            {branch.is_headquarters && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                HQ
                              </Badge>
                            )}
                          </div>
                          {branch.code && (
                            <span className="text-sm text-gray-500">{branch.code}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {branch.city && branch.state ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          {branch.city}, {branch.state}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {branch.manager_name ? (
                        <div className="text-sm">
                          <p>{branch.manager_name}</p>
                          <p className="text-gray-500">{branch.manager_email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{branch.user_count} members</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(branch)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(branch)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Update Team Invitations

When inviting team members, add branch selection:

**Update:** `web/app/(app)/app/settings/team/page.tsx`

Add a branch dropdown to the invite form:

```tsx
// In the invite dialog form, add:
<div>
  <Label>Branch (Optional)</Label>
  <select
    value={inviteData.branch_id || ""}
    onChange={(e) => setInviteData({ ...inviteData, branch_id: e.target.value })}
    className="w-full px-3 py-2 border rounded-md"
  >
    <option value="">No branch assignment</option>
    {branches.map(branch => (
      <option key={branch.id} value={branch.id}>
        {branch.name}
      </option>
    ))}
  </select>
</div>
```

---

## Navigation

Add to `web/lib/navigation.ts`:

```typescript
// Under client_admin settings
{
  name: "Branches",
  href: "/app/settings/branches",
  icon: Building,
}
```

---

## Summary

| Component | Purpose |
|-----------|---------|
| `branches` table | Store branch/office data |
| `Branch` model | SQLAlchemy model |
| `branch_id` on users | Associate users with branches |
| `/branches` API | CRUD for branches |
| Branches settings page | UI for managing branches |
| Team invite update | Branch selection when inviting |
