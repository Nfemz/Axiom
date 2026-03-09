"use client";

import { useCallback, useEffect, useState } from "react";

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
  "",
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
      // Mock data for now
      const mockEntries: AuditEntry[] = [];
      setEntries(mockEntries);
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const filtered = entries
    .filter((e) => {
      if (agentIdFilter && !e.agentId.includes(agentIdFilter)) {
        return false;
      }
      if (actionTypeFilter && e.actionType !== actionTypeFilter) {
        return false;
      }
      if (securityOnly && !e.securityFlag) {
        return false;
      }
      if (dateFrom && e.timestamp < dateFrom) {
        return false;
      }
      if (dateTo && e.timestamp > `${dateTo}T23:59:59.999Z`) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading audit log...</div>;
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
        Audit Log
      </h1>

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
          <span style={filterSpanStyle}>Agent ID</span>
          <input
            onChange={(e) => {
              setAgentIdFilter(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by agent ID"
            style={inputStyle}
            type="text"
            value={agentIdFilter}
          />
        </label>

        <label style={filterLabelStyle}>
          <span style={filterSpanStyle}>Action Type</span>
          <select
            onChange={(e) => {
              setActionTypeFilter(e.target.value);
              setPage(0);
            }}
            style={inputStyle}
            value={actionTypeFilter}
          >
            <option value="">All</option>
            {ACTION_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
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

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            cursor: "pointer",
          }}
        >
          <input
            checked={securityOnly}
            onChange={(e) => {
              setSecurityOnly(e.target.checked);
              setPage(0);
            }}
            type="checkbox"
          />
          <span style={{ fontSize: "0.875rem", color: "#d1d5db" }}>
            Security events only
          </span>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>No audit entries found.</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{ borderBottom: "1px solid #374151", textAlign: "left" }}
              >
                <th style={thStyle}>Timestamp</th>
                <th style={thStyle}>Agent ID</th>
                <th style={thStyle}>Action Type</th>
                <th style={thStyle}>Outcome</th>
                <th style={thStyle}>Security</th>
                <th style={thStyle}>Details</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((entry) => (
                <tr
                  key={entry.id}
                  style={{ borderBottom: "1px solid #1f2937" }}
                >
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "monospace",
                      fontSize: "0.8125rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "monospace",
                      fontSize: "0.8125rem",
                    }}
                  >
                    {entry.agentId.slice(0, 8)}...
                  </td>
                  <td style={tdStyle}>{entry.actionType}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        color:
                          entry.outcome === "success" ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {entry.outcome}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {entry.securityFlag ? (
                      <span style={{ color: "#eab308", fontWeight: 600 }}>
                        !
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === entry.id ? null : entry.id)
                      }
                      style={{
                        background: "none",
                        border: "1px solid #374151",
                        borderRadius: "4px",
                        color: "#60a5fa",
                        cursor: "pointer",
                        padding: "0.125rem 0.5rem",
                        fontSize: "0.8125rem",
                      }}
                      type="button"
                    >
                      {expandedId === entry.id ? "Hide" : "Show"}
                    </button>
                    {expandedId === entry.id && (
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
                        {entry.details}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
              Page {page + 1} of {totalPages} ({filtered.length} entries)
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
