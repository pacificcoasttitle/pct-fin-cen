"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Props {
  partyId: string
  partyName: string
  onSuccess?: () => void
}

export function RequestCorrectionsDialog({ partyId, partyName, onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message describing what needs to be corrected",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
      const res = await fetch(`${apiBase}/party/parties/${partyId}/request-corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }))
        throw new Error(err.detail || "Failed to request corrections")
      }

      toast({
        title: "Corrections Requested",
        description: `Correction request sent for ${partyName}. They can now edit and resubmit.`,
      })
      setOpen(false)
      setMessage("")
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send correction request",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <AlertTriangle className="w-4 h-4 mr-1" />
          Request Corrections
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Corrections from {partyName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>What needs to be corrected?</Label>
            <Textarea
              placeholder="Please describe what information needs to be corrected or updated..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          
          <p className="text-sm text-gray-500">
            The party&apos;s status will be reset so they can edit and resubmit their information.
            They will receive access to their portal link again.
          </p>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
