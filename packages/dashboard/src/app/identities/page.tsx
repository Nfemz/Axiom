"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ──────────────────────────────────────────────────────────

interface Identity {
  agentId: string;
  createdAt: string;
  id: string;
  identifier: string;
  identityType: string;
  provider: string;
  revokedAt: string | null;
  status: string;
}

type TypeFilter = "all" | "email" | "phone" | "voice" | "service_account";
type StatusFilter = "all" | "active" | "revoked";

const TYPE_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  voice: "Voice",
  service_account: "Service Account",
};

// ─── Helpers ────────────────────────────────────────────────────────

function typeBadge(type: string) {
  const label = TYPE_LABELS[type] ?? type;
  switch (type) {
    case "email":
      return <Badge variant="default">{label}</Badge>;
    case "phone":
      return <Badge variant="secondary">{label}</Badge>;
    case "voice":
      return <Badge variant="outline">{label}</Badge>;
    case "service_account":
      return <Badge variant="secondary">{label}</Badge>;
    default:
      return <Badge variant="secondary">{label}</Badge>;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="text-success" variant="outline">
          {status}
        </Badge>
      );
    case "revoked":
      return <Badge variant="destructive">{status}</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ─── Component ──────────────────────────────────────────────────────

export default function IdentitiesPage() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchIdentities = useCallback(async () => {
    try {
      const response = await fetch("/api/identities");
      if (!response.ok) {
        return;
      }
      const json = await response.json();
      setIdentities(json.identities ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIdentities();
  }, [fetchIdentities]);

  async function handleRevoke(identityId: string) {
    try {
      const response = await fetch(`/api/identities/${identityId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        return;
      }
      await fetchIdentities();
    } catch {
      // TODO: toast notification
    }
  }

  const filtered = identities.filter((identity) => {
    if (typeFilter !== "all" && identity.identityType !== typeFilter) {
      return false;
    }
    if (statusFilter !== "all" && identity.status !== statusFilter) {
      return false;
    }
    return true;
  });

  if (loading) {
    return <div className="text-muted-foreground">Loading identities...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-bold text-2xl text-foreground">Identity Registry</h1>

      <div className="flex gap-4">
        <Select
          onValueChange={(value) => setTypeFilter(value as TypeFilter)}
          value={typeFilter}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="voice">Voice</SelectItem>
              <SelectItem value="service_account">Service Account</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          value={statusFilter}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identities</CardTitle>
          <CardDescription>
            Manage agent identities and credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IdentitiesTable identities={filtered} onRevoke={handleRevoke} />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Identities Table ───────────────────────────────────────────────

function IdentitiesTable({
  identities,
  onRevoke,
}: {
  identities: Identity[];
  onRevoke: (identityId: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Identifier</TableHead>
          <TableHead>Agent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {identities.map((identity) => (
          <TableRow key={identity.id}>
            <TableCell>{typeBadge(identity.identityType)}</TableCell>
            <TableCell>{identity.provider}</TableCell>
            <TableCell>{identity.identifier}</TableCell>
            <TableCell className="font-mono text-muted-foreground">
              {identity.agentId.slice(0, 8)}...
            </TableCell>
            <TableCell>{statusBadge(identity.status)}</TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(identity.createdAt).toLocaleString()}
            </TableCell>
            <TableCell>
              {identity.status === "active" && (
                <RevokeDialog
                  identityName={identity.identifier}
                  onConfirm={() => onRevoke(identity.id)}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
        {identities.length === 0 && (
          <TableRow>
            <TableCell
              className="py-12 text-center text-muted-foreground"
              colSpan={7}
            >
              No identities found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

// ─── Revoke Dialog ──────────────────────────────────────────────────

function RevokeDialog({
  identityName,
  onConfirm,
}: {
  identityName: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="destructive">
          Revoke
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke Identity</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to revoke{" "}
            <span className="font-medium text-foreground">{identityName}</span>?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant="destructive">
            Revoke
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
