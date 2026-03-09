"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ──────────────────────────────────────────────────────────

interface AuditEntry {
  actionType: string;
  agentId: string;
  details: string;
  id: string;
  outcome: string;
  securityFlag: boolean;
  timestamp: string;
}

const ACTION_TYPES = [
  "secret_access",
  "secret_create",
  "secret_update",
  "secret_delete",
  "agent_spawn",
  "agent_terminate",
  "agent_pause",
  "agent_resume",
  "budget_exceeded",
  "domain_blocked",
  "auth_login",
  "auth_failure",
] as const;

const PAGE_SIZE = 20;

// ─── Component ──────────────────────────────────────────────────────

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [agentIdFilter, setAgentIdFilter] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [securityOnly, setSecurityOnly] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Replace with real API call to /api/audit
      const mockEntries: AuditEntry[] = [];
      setEntries(mockEntries);
      setFetchError(null);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const filtered = applyFilters(entries, {
    agentIdFilter,
    actionTypeFilter,
    securityOnly,
    dateFrom,
    dateTo,
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) {
    return <div className="text-muted-foreground">Loading audit log...</div>;
  }

  if (fetchError) {
    return <div className="text-destructive">Error: {fetchError}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-bold text-2xl text-foreground">Audit Log</h1>

      <FiltersCard
        actionTypeFilter={actionTypeFilter}
        agentIdFilter={agentIdFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onActionTypeChange={(value) => {
          setActionTypeFilter(value);
          setPage(0);
        }}
        onAgentIdChange={(value) => {
          setAgentIdFilter(value);
          setPage(0);
        }}
        onDateFromChange={(value) => {
          setDateFrom(value);
          setPage(0);
        }}
        onDateToChange={(value) => {
          setDateTo(value);
          setPage(0);
        }}
        onSecurityOnlyChange={(value) => {
          setSecurityOnly(value);
          setPage(0);
        }}
        securityOnly={securityOnly}
      />

      <AuditTable
        entries={paginated}
        expandedId={expandedId}
        onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
        totalCount={filtered.length}
      />

      <AuditPagination
        page={page}
        setPage={setPage}
        totalCount={filtered.length}
        totalPages={totalPages}
      />
    </div>
  );
}

// ─── Filter Logic ───────────────────────────────────────────────────

interface FilterOptions {
  actionTypeFilter: string;
  agentIdFilter: string;
  dateFrom: string;
  dateTo: string;
  securityOnly: boolean;
}

function applyFilters(
  entries: AuditEntry[],
  filters: FilterOptions
): AuditEntry[] {
  return entries
    .filter((entry) => {
      if (
        filters.agentIdFilter &&
        !entry.agentId.includes(filters.agentIdFilter)
      ) {
        return false;
      }
      if (
        filters.actionTypeFilter &&
        entry.actionType !== filters.actionTypeFilter
      ) {
        return false;
      }
      if (filters.securityOnly && !entry.securityFlag) {
        return false;
      }
      if (filters.dateFrom && entry.timestamp < filters.dateFrom) {
        return false;
      }
      if (
        filters.dateTo &&
        entry.timestamp > `${filters.dateTo}T23:59:59.999Z`
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ─── Filters Card ───────────────────────────────────────────────────

interface FiltersCardProps {
  actionTypeFilter: string;
  agentIdFilter: string;
  dateFrom: string;
  dateTo: string;
  onActionTypeChange: (value: string) => void;
  onAgentIdChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSecurityOnlyChange: (value: boolean) => void;
  securityOnly: boolean;
}

function FiltersCard({
  agentIdFilter,
  actionTypeFilter,
  dateFrom,
  dateTo,
  securityOnly,
  onAgentIdChange,
  onActionTypeChange,
  onDateFromChange,
  onDateToChange,
  onSecurityOnlyChange,
}: FiltersCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Narrow down audit log entries.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="audit-agent-id">Agent ID</FieldLabel>
              <Input
                id="audit-agent-id"
                onChange={(event) => onAgentIdChange(event.target.value)}
                placeholder="Filter by agent ID"
                value={agentIdFilter}
              />
            </Field>

            <Field>
              <FieldLabel>Action Type</FieldLabel>
              <Select
                onValueChange={(value) =>
                  onActionTypeChange(value === "all" ? "" : value)
                }
                value={actionTypeFilter || "all"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {ACTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="audit-date-from">From</FieldLabel>
              <Input
                id="audit-date-from"
                onChange={(event) => onDateFromChange(event.target.value)}
                type="date"
                value={dateFrom}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="audit-date-to">To</FieldLabel>
              <Input
                id="audit-date-to"
                onChange={(event) => onDateToChange(event.target.value)}
                type="date"
                value={dateTo}
              />
            </Field>
          </div>

          <Field orientation="horizontal">
            <Switch
              checked={securityOnly}
              id="audit-security-only"
              onCheckedChange={onSecurityOnlyChange}
            />
            <FieldLabel htmlFor="audit-security-only">
              Security events only
            </FieldLabel>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

// ─── Audit Table ────────────────────────────────────────────────────

interface AuditTableProps {
  entries: AuditEntry[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  totalCount: number;
}

function AuditTable({
  entries,
  expandedId,
  onToggleExpand,
  totalCount,
}: AuditTableProps) {
  if (totalCount === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No audit entries found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Agent ID</TableHead>
              <TableHead>Action Type</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Security</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <AuditRow
                entry={entry}
                expanded={expandedId === entry.id}
                key={entry.id}
                onToggle={() => onToggleExpand(entry.id)}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Audit Row ──────────────────────────────────────────────────────

interface AuditRowProps {
  entry: AuditEntry;
  expanded: boolean;
  onToggle: () => void;
}

function AuditRow({ entry, expanded, onToggle }: AuditRowProps) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">
        {new Date(entry.timestamp).toLocaleString()}
      </TableCell>
      <TableCell className="font-mono text-xs">
        {entry.agentId.slice(0, 8)}...
      </TableCell>
      <TableCell>{entry.actionType}</TableCell>
      <TableCell>
        <Badge
          variant={entry.outcome === "success" ? "default" : "destructive"}
        >
          {entry.outcome}
        </Badge>
      </TableCell>
      <TableCell>
        {entry.securityFlag ? (
          <Badge variant="destructive">!</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <Button onClick={onToggle} size="xs" variant="outline">
          {expanded ? "Hide" : "Show"}
        </Button>
        {expanded && (
          <pre className="mt-2 whitespace-pre-wrap break-all rounded-md bg-muted p-2 text-muted-foreground text-xs">
            {entry.details}
          </pre>
        )}
      </TableCell>
    </TableRow>
  );
}

// ─── Pagination ─────────────────────────────────────────────────────

interface AuditPaginationProps {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalCount: number;
  totalPages: number;
}

function AuditPagination({
  page,
  setPage,
  totalCount,
  totalPages,
}: AuditPaginationProps) {
  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-muted-foreground text-sm">
        Page {page + 1} of {totalPages} ({totalCount} entries)
      </span>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              className={page === 0 ? "pointer-events-none opacity-50" : ""}
              onClick={() => setPage((previous) => previous - 1)}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              className={
                page >= totalPages - 1 ? "pointer-events-none opacity-50" : ""
              }
              onClick={() => setPage((previous) => previous + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
