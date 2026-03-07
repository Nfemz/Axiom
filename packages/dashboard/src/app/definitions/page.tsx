"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";

interface Definition {
  id: string;
  name: string;
  model?: string;
  modelProvider?: string;
  defaultBudget?: number;
  mission?: string;
  createdAt?: string;
}

interface CreateDefinitionForm {
  name: string;
  mission: string;
  modelProvider: string;
  modelId: string;
  defaultBudget: string;
  capabilities: string;
  tools: string;
  approvalPolicies: string;
  retryPolicy: string;
  heartbeatConfig: string;
}

const EMPTY_FORM: CreateDefinitionForm = {
  name: "",
  mission: "",
  modelProvider: "anthropic",
  modelId: "",
  defaultBudget: "10.00",
  capabilities: "[]",
  tools: "[]",
  approvalPolicies: "{}",
  retryPolicy: "{}",
  heartbeatConfig: "{}",
};

const MODEL_PROVIDERS = ["anthropic", "openai", "google"] as const;

export default function DefinitionsPage() {
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateDefinitionForm>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const fetchDefinitions = useCallback(async () => {
    try {
      const res = await fetch("/api/definitions");
      if (!res.ok) throw new Error(`Failed to fetch definitions: ${res.status}`);
      const json = await res.json();
      setDefinitions(json.definitions ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  function updateField(field: keyof CreateDefinitionForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const body = {
        name: form.name,
        mission: form.mission,
        modelProvider: form.modelProvider,
        modelId: form.modelId,
        defaultBudget: parseFloat(form.defaultBudget),
        capabilities: JSON.parse(form.capabilities),
        tools: JSON.parse(form.tools),
        approvalPolicies: JSON.parse(form.approvalPolicies),
        retryPolicy: JSON.parse(form.retryPolicy),
        heartbeatConfig: JSON.parse(form.heartbeatConfig),
      };

      const res = await fetch("/api/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Failed to create definition: ${res.status}`);

      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      await fetchDefinitions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create definition");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/definitions/${id}`, { method: "DELETE" });
      await fetchDefinitions();
    } catch {
      // TODO: Show error toast
    }
  }

  if (loading) return <div style={{ padding: "2rem" }}>Loading definitions...</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Agent Definitions</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: showForm ? "#374151" : "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "Create Definition"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "0.75rem", backgroundColor: "#7f1d1d", borderRadius: "4px", marginBottom: "1rem", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: "2rem", padding: "1.5rem", backgroundColor: "#1f2937", borderRadius: "8px" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>New Definition</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <FormField label="Name" value={form.name} onChange={(v) => updateField("name", v)} required />
            <FormField label="Model ID" value={form.modelId} onChange={(v) => updateField("modelId", v)} placeholder="e.g., claude-sonnet-4-20250514" />
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.25rem" }}>
                Model Provider
              </label>
              <select
                value={form.modelProvider}
                onChange={(e) => updateField("modelProvider", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "4px",
                  color: "#e5e7eb",
                }}
              >
                {MODEL_PROVIDERS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <FormField label="Default Budget ($)" value={form.defaultBudget} onChange={(v) => updateField("defaultBudget", v)} type="number" />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.25rem" }}>Mission</label>
            <textarea
              value={form.mission}
              onChange={(e) => updateField("mission", e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "0.5rem",
                backgroundColor: "#111827",
                border: "1px solid #374151",
                borderRadius: "4px",
                color: "#e5e7eb",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <JsonField label="Capabilities (JSON)" value={form.capabilities} onChange={(v) => updateField("capabilities", v)} />
            <JsonField label="Tools (JSON)" value={form.tools} onChange={(v) => updateField("tools", v)} />
            <JsonField label="Approval Policies (JSON)" value={form.approvalPolicies} onChange={(v) => updateField("approvalPolicies", v)} />
            <JsonField label="Retry Policy (JSON)" value={form.retryPolicy} onChange={(v) => updateField("retryPolicy", v)} />
          </div>

          <JsonField label="Heartbeat Config (JSON)" value={form.heartbeatConfig} onChange={(v) => updateField("heartbeatConfig", v)} />

          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              style={{
                padding: "0.5rem 1.5rem",
                backgroundColor: submitting || !form.name.trim() ? "#374151" : "#22c55e",
                color: "#000",
                border: "none",
                borderRadius: "4px",
                cursor: submitting || !form.name.trim() ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              {submitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* Definitions List */}
      {definitions.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>No definitions yet. Create one to get started.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #374151", textAlign: "left" }}>
              <th style={{ padding: "0.75rem" }}>Name</th>
              <th style={{ padding: "0.75rem" }}>Model</th>
              <th style={{ padding: "0.75rem" }}>Default Budget</th>
              <th style={{ padding: "0.75rem" }}>Created</th>
              <th style={{ padding: "0.75rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {definitions.map((def) => (
              <tr key={def.id} style={{ borderBottom: "1px solid #1f2937" }}>
                <td style={{ padding: "0.75rem", fontWeight: 500 }}>{def.name}</td>
                <td style={{ padding: "0.75rem", color: "#d1d5db", fontSize: "0.875rem" }}>
                  {def.modelProvider ? `${def.modelProvider}/${def.model ?? "-"}` : def.model ?? "-"}
                </td>
                <td style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.875rem" }}>
                  {def.defaultBudget != null ? `$${def.defaultBudget.toFixed(2)}` : "-"}
                </td>
                <td style={{ padding: "0.75rem", color: "#9ca3af", fontSize: "0.875rem" }}>
                  {def.createdAt ?? "-"}
                </td>
                <td style={{ padding: "0.75rem", display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => { /* TODO: Open edit form */ }}
                    style={{ padding: "0.25rem 0.75rem", backgroundColor: "#374151", color: "#e5e7eb", border: "none", borderRadius: "4px", cursor: "pointer" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(def.id)}
                    style={{ padding: "0.25rem 0.75rem", backgroundColor: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: "4px", cursor: "pointer" }}
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

function FormField({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.25rem" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "0.5rem",
          backgroundColor: "#111827",
          border: "1px solid #374151",
          borderRadius: "4px",
          color: "#e5e7eb",
        }}
      />
    </div>
  );
}

function JsonField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.25rem" }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{
          width: "100%",
          padding: "0.5rem",
          backgroundColor: "#111827",
          border: "1px solid #374151",
          borderRadius: "4px",
          color: "#e5e7eb",
          fontFamily: "monospace",
          fontSize: "0.8rem",
          resize: "vertical",
        }}
      />
    </div>
  );
}
