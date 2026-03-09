"use client";

import { useCallback, useEffect, useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

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

// ── Placeholder Data ────────────────────────────────────────────────────────

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

// ── Severity Badge ──────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<Severity, string> = {
  low: "#eab308",
  medium: "#f97316",
  high: "#ef4444",
};

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      style={{
        color: SEVERITY_COLORS[severity],
        fontWeight: 600,
        fontSize: "0.8125rem",
        padding: "0.125rem 0.5rem",
        border: `1px solid ${SEVERITY_COLORS[severity]}`,
        borderRadius: "4px",
      }}
    >
      {severity.toUpperCase()}
    </span>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

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
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function handleApprove(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    // TODO: Call API to release from quarantine
  }

  function handleReject(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    // TODO: Call API to delete quarantined content
  }

  const filtered = items
    .filter((item) => {
      if (severityFilter && item.severity !== severityFilter) {
        return false;
      }
      if (dateFrom && item.timestamp < dateFrom) {
        return false;
      }
      if (dateTo && item.timestamp > `${dateTo}T23:59:59.999Z`) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading quarantine items...</div>;
  }
  if (fetchError) {
    return (
      <div style={{ padding: "2rem", color: "#ef4444" }}>
        Error: {fetchError}
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}
      >
        Quarantine Review
      </h1>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
          padding: "1rem",
          border: "1px solid #374151",
          borderRadius: "8px",
          alignItems: "flex-end",
        }}
      >
        <label style={filterLabelStyle}>
          <span style={filterSpanStyle}>Severity</span>
          <select
            onChange={(e) => {
              setSeverityFilter(e.target.value as Severity | "");
              setPage(0);
            }}
            style={inputStyle}
            value={severityFilter}
          >
            <option value="">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label style={filterLabelStyle}>
          <span style={filterSpanStyle}>From</span>
          <input
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            style={inputStyle}
            type="date"
            value={dateFrom}
          />
        </label>

        <label style={filterLabelStyle}>
          <span style={filterSpanStyle}>To</span>
          <input
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            style={inputStyle}
            type="date"
            value={dateTo}
          />
        </label>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>No quarantined items found.</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{ borderBottom: "1px solid #374151", textAlign: "left" }}
              >
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Detected Patterns</th>
                <th style={thStyle}>Severity</th>
                <th style={thStyle}>Agent</th>
                <th style={thStyle}>Timestamp</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #1f2937" }}>
                  <td style={tdStyle}>{item.source}</td>
                  <td style={tdStyle}>
                    {item.detectedPatterns.map((p) => (
                      <span key={p} style={patternTagStyle}>
                        {p}
                      </span>
                    ))}
                  </td>
                  <td style={tdStyle}>
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "monospace",
                      fontSize: "0.8125rem",
                    }}
                  >
                    {item.agentId.slice(0, 14)}...
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "monospace",
                      fontSize: "0.8125rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new Date(item.timestamp).toLocaleString()}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      <button
                        onClick={() => handleApprove(item.id)}
                        style={actionBtnStyle("#22c55e")}
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        style={actionBtnStyle("#ef4444")}
                        type="button"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === item.id ? null : item.id)
                        }
                        style={actionBtnStyle("#60a5fa")}
                        type="button"
                      >
                        {expandedId === item.id ? "Hide" : "Details"}
                      </button>
                    </div>
                    {expandedId === item.id && (
                      <pre
                        style={{
                          marginTop: "0.5rem",
                          padding: "0.5rem",
                          backgroundColor: "#111827",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          color: "#d1d5db",
                        }}
                      >
                        {item.content}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "1rem",
              fontSize: "0.875rem",
              color: "#9ca3af",
            }}
          >
            <span>
              Page {page + 1} of {totalPages} ({filtered.length} items)
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                style={paginationBtnStyle(page === 0)}
                type="button"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                style={paginationBtnStyle(page >= totalPages - 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: "0.5rem",
  backgroundColor: "#111827",
  border: "1px solid #374151",
  borderRadius: "4px",
  color: "#f3f4f6",
  fontSize: "0.875rem",
};

const filterLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
};

const filterSpanStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#9ca3af",
};

const thStyle: React.CSSProperties = { padding: "0.75rem" };
const tdStyle: React.CSSProperties = { padding: "0.75rem", color: "#d1d5db" };

const patternTagStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.125rem 0.375rem",
  marginRight: "0.25rem",
  backgroundColor: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "4px",
  fontSize: "0.75rem",
  color: "#d1d5db",
};

function actionBtnStyle(color: string): React.CSSProperties {
  return {
    background: "none",
    border: `1px solid ${color}`,
    borderRadius: "4px",
    color,
    cursor: "pointer",
    padding: "0.125rem 0.5rem",
    fontSize: "0.8125rem",
  };
}

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "0.375rem 1rem",
    backgroundColor: disabled ? "#1f2937" : "#374151",
    color: disabled ? "#6b7280" : "#f3f4f6",
    border: "none",
    borderRadius: "4px",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
