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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ──────────────────────────────────────────────────────────

type Severity = "low" | "medium" | "high";

interface QuarantinedItem {
  agentId: string;
  content: string;
  detectedPatterns: string[];
  id: string;
  severity: Severity;
  source: string;
  timestamp: string;
}

// ─── Placeholder Data ───────────────────────────────────────────────

const MOCK_ITEMS: QuarantinedItem[] = [
  {
    id: "q-001",
    source: "web-scraper",
    detectedPatterns: ["credential-leak", "pii-detected"],
    severity: "high",
    agentId: "agent-a1b2c3d4",
    timestamp: "2026-03-07T14:22:00.000Z",
    content:
      "Detected potential credential pattern in scraped output: AWS_ACCESS_KEY=AKIA...",
  },
  {
    id: "q-002",
    source: "file-upload",
    detectedPatterns: ["executable-content"],
    severity: "medium",
    agentId: "agent-e5f6g7h8",
    timestamp: "2026-03-07T13:10:00.000Z",
    content:
      "Uploaded file contains executable shell script embedded in metadata.",
  },
  {
    id: "q-003",
    source: "api-response",
    detectedPatterns: ["suspicious-url"],
    severity: "low",
    agentId: "agent-i9j0k1l2",
    timestamp: "2026-03-06T20:45:00.000Z",
    content:
      "API response contained URL matching known phishing domain pattern.",
  },
];

const SEVERITY_VARIANT: Record<
  Severity,
  "destructive" | "outline" | "secondary"
> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const PAGE_SIZE = 20;

// ─── Component ──────────────────────────────────────────────────────

export default function QuarantinePage() {
  const [items, setItems] = useState<QuarantinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<Severity | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Details
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Replace with real API call
      setItems(MOCK_ITEMS);
      setFetchError(null);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function handleApprove(id: string) {
    setItems((previous) => previous.filter((item) => item.id !== id));
    // TODO: Call API to release from quarantine
  }

  function handleReject(id: string) {
    setItems((previous) => previous.filter((item) => item.id !== id));
    // TODO: Call API to delete quarantined content
  }

  const filtered = applyFilters(items, { severityFilter, dateFrom, dateTo });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) {
    return (
      <div className="text-muted-foreground">Loading quarantine items...</div>
    );
  }

  if (fetchError) {
    return <div className="text-destructive">Error: {fetchError}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-bold text-2xl text-foreground">Quarantine Review</h1>

      <QuarantineFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={(value) => {
          setDateFrom(value);
          setPage(0);
        }}
        onDateToChange={(value) => {
          setDateTo(value);
          setPage(0);
        }}
        onSeverityChange={(value) => {
          setSeverityFilter(value as Severity | "");
          setPage(0);
        }}
        severityFilter={severityFilter}
      />

      <QuarantineTable
        expandedId={expandedId}
        items={paginated}
        onApprove={handleApprove}
        onReject={handleReject}
        onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
        totalCount={filtered.length}
      />

      <QuarantinePagination
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
  dateFrom: string;
  dateTo: string;
  severityFilter: Severity | "";
}

function applyFilters(
  items: QuarantinedItem[],
  filters: FilterOptions
): QuarantinedItem[] {
  return items
    .filter((item) => {
      if (filters.severityFilter && item.severity !== filters.severityFilter) {
        return false;
      }
      if (filters.dateFrom && item.timestamp < filters.dateFrom) {
        return false;
      }
      if (
        filters.dateTo &&
        item.timestamp > `${filters.dateTo}T23:59:59.999Z`
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ─── Filters ────────────────────────────────────────────────────────

interface FiltersProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  severityFilter: Severity | "";
}

function QuarantineFilters({
  severityFilter,
  dateFrom,
  dateTo,
  onSeverityChange,
  onDateFromChange,
  onDateToChange,
}: FiltersProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>
          Narrow down quarantined items by severity and date.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field>
              <FieldLabel>Severity</FieldLabel>
              <Select
                onValueChange={(value) =>
                  onSeverityChange(value === "all" ? "" : value)
                }
                value={severityFilter || "all"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="quarantine-date-from">From</FieldLabel>
              <Input
                id="quarantine-date-from"
                onChange={(event) => onDateFromChange(event.target.value)}
                type="date"
                value={dateFrom}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="quarantine-date-to">To</FieldLabel>
              <Input
                id="quarantine-date-to"
                onChange={(event) => onDateToChange(event.target.value)}
                type="date"
                value={dateTo}
              />
            </Field>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

// ─── Quarantine Table ───────────────────────────────────────────────

interface QuarantineTableProps {
  expandedId: string | null;
  items: QuarantinedItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onToggleExpand: (id: string) => void;
  totalCount: number;
}

function QuarantineTable({
  items,
  expandedId,
  onApprove,
  onReject,
  onToggleExpand,
  totalCount,
}: QuarantineTableProps) {
  if (totalCount === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No quarantined items found.
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
              <TableHead>Source</TableHead>
              <TableHead>Detected Patterns</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <QuarantineRow
                expanded={expandedId === item.id}
                item={item}
                key={item.id}
                onApprove={() => onApprove(item.id)}
                onReject={() => onReject(item.id)}
                onToggle={() => onToggleExpand(item.id)}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Quarantine Row ─────────────────────────────────────────────────

interface QuarantineRowProps {
  expanded: boolean;
  item: QuarantinedItem;
  onApprove: () => void;
  onReject: () => void;
  onToggle: () => void;
}

function QuarantineRow({
  item,
  expanded,
  onApprove,
  onReject,
  onToggle,
}: QuarantineRowProps) {
  return (
    <TableRow>
      <TableCell>{item.source}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {item.detectedPatterns.map((pattern) => (
            <Badge key={pattern} variant="outline">
              {pattern}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={SEVERITY_VARIANT[item.severity]}>
          {item.severity.toUpperCase()}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs">
        {item.agentId.slice(0, 14)}...
      </TableCell>
      <TableCell className="font-mono text-xs">
        {new Date(item.timestamp).toLocaleString()}
      </TableCell>
      <TableCell>
        <div className="flex gap-1.5">
          <ApproveDialog onConfirm={onApprove} />
          <RejectDialog onConfirm={onReject} />
          <Button onClick={onToggle} size="xs" variant="outline">
            {expanded ? "Hide" : "Details"}
          </Button>
        </div>
        {expanded && (
          <pre className="mt-2 whitespace-pre-wrap break-all rounded-md bg-muted p-2 text-muted-foreground text-xs">
            {item.content}
          </pre>
        )}
      </TableCell>
    </TableRow>
  );
}

// ─── Confirmation Dialogs ───────────────────────────────────────────

function ApproveDialog({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="xs" variant="outline">
          Approve
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve this item?</AlertDialogTitle>
          <AlertDialogDescription>
            This will release the quarantined content and allow it through. Make
            sure you have reviewed the content carefully.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Approve</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RejectDialog({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="xs" variant="destructive">
          Reject
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject this item?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the quarantined content. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant="destructive">
            Reject
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Pagination ─────────────────────────────────────────────────────

interface QuarantinePaginationProps {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalCount: number;
  totalPages: number;
}

function QuarantinePagination({
  page,
  setPage,
  totalCount,
  totalPages,
}: QuarantinePaginationProps) {
  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-muted-foreground text-sm">
        Page {page + 1} of {totalPages} ({totalCount} items)
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
