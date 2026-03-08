"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

interface Secret {
  allowedAgents: string[];
  allowedDomains: string[];
  createdAt: string;
  id: string;
  name: string;
  secretType: string;
}

const SECRET_TYPES = [
  "api_key",
  "credential",
  "payment_method",
  "oauth_token",
] as const;

export default function SecretsPage() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [secretType, setSecretType] = useState<string>(SECRET_TYPES[0]);
  const [value, setValue] = useState("");
  const [allowedAgents, setAllowedAgents] = useState("");
  const [allowedDomains, setAllowedDomains] = useState("");

  const fetchSecrets = useCallback(async () => {
    try {
      const res = await fetch("/api/secrets");
      if (!res.ok) {
        throw new Error(`Failed to fetch secrets: ${res.status}`);
      }
      const json = await res.json();
      setSecrets(json.secrets ?? []);
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          secretType,
          value,
          allowedAgents: allowedAgents
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          allowedDomains: allowedDomains
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create secret: ${res.status}`);
      }

      setName("");
      setSecretType(SECRET_TYPES[0]);
      setValue("");
      setAllowedAgents("");
      setAllowedDomains("");
      await fetchSecrets();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/secrets/${id}`, { method: "DELETE" });
      await fetchSecrets();
    } catch {
      // TODO: Show error toast
    }
  }

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading secrets...</div>;
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
        Secrets Vault
      </h1>

      <form
        onSubmit={handleCreate}
        style={{
          marginBottom: "2rem",
          padding: "1rem",
          border: "1px solid #374151",
          borderRadius: "8px",
        }}
      >
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 500,
            marginBottom: "1rem",
          }}
        >
          Create Secret
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <label
            style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
          >
            <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Name</span>
            <input
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
              type="text"
              value={name}
            />
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
          >
            <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Type</span>
            <select
              onChange={(e) => setSecretType(e.target.value)}
              style={inputStyle}
              value={secretType}
            >
              {SECRET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            marginBottom: "1rem",
          }}
        >
          <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Value</span>
          <input
            onChange={(e) => setValue(e.target.value)}
            required
            style={inputStyle}
            type="password"
            value={value}
          />
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <label
            style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
          >
            <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
              Allowed Agents (comma-separated UUIDs)
            </span>
            <textarea
              onChange={(e) => setAllowedAgents(e.target.value)}
              rows={2}
              style={inputStyle}
              value={allowedAgents}
            />
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
          >
            <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
              Allowed Domains (comma-separated)
            </span>
            <textarea
              onChange={(e) => setAllowedDomains(e.target.value)}
              rows={2}
              style={inputStyle}
              value={allowedDomains}
            />
          </label>
        </div>

        {formError && (
          <p style={{ color: "#ef4444", marginBottom: "0.5rem" }}>
            {formError}
          </p>
        )}

        <button
          disabled={submitting}
          style={{
            padding: "0.5rem 1.5rem",
            backgroundColor: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
          type="submit"
        >
          {submitting ? "Creating..." : "Create Secret"}
        </button>
      </form>

      {secrets.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>No secrets stored yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{ borderBottom: "1px solid #374151", textAlign: "left" }}
            >
              <th style={{ padding: "0.75rem" }}>Name</th>
              <th style={{ padding: "0.75rem" }}>Type</th>
              <th style={{ padding: "0.75rem" }}>Allowed Agents</th>
              <th style={{ padding: "0.75rem" }}>Allowed Domains</th>
              <th style={{ padding: "0.75rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {secrets.map((secret) => (
              <tr key={secret.id} style={{ borderBottom: "1px solid #1f2937" }}>
                <td style={{ padding: "0.75rem" }}>{secret.name}</td>
                <td style={{ padding: "0.75rem" }}>
                  <span
                    style={{
                      padding: "0.125rem 0.5rem",
                      backgroundColor: "#1f2937",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                    }}
                  >
                    {secret.secretType}
                  </span>
                </td>
                <td
                  style={{
                    padding: "0.75rem",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  }}
                >
                  {secret.allowedAgents?.length ?? 0}
                </td>
                <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                  {secret.allowedDomains?.join(", ") || "-"}
                </td>
                <td
                  style={{ padding: "0.75rem", display: "flex", gap: "0.5rem" }}
                >
                  <button
                    onClick={() => handleDelete(secret.id)}
                    style={{
                      padding: "0.25rem 0.75rem",
                      backgroundColor: "#ef4444",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
