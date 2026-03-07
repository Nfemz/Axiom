"use client";

import { useState, useCallback, useEffect } from "react";

// ─── Types ──────────────────────────────────────────────────────────

interface AlertRule {
  id: string;
  name: string;
  condition: { metric: string; operator: string; threshold: number };
  severity: string;
  enabled: boolean;
  notifyDiscord: boolean;
  createdAt: string;
}

interface AlertEvent {
  id: string;
  ruleId: string;
  agentId: string | null;
  severity: string;
  message: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  createdAt: string;
}

type Tab = "rules" | "events";

const SEVERITY_CLASSES: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  critical: "bg-red-100 text-red-800",
};

const OPERATORS = ["gt", "lt", "eq", "gte", "lte"] as const;

// ─── Component ──────────────────────────────────────────────────────

export default function AlertsPage() {
  const [tab, setTab] = useState<Tab>("rules");
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formName, setFormName] = useState("");
  const [formMetric, setFormMetric] = useState("");
  const [formOperator, setFormOperator] = useState<string>("gt");
  const [formThreshold, setFormThreshold] = useState("");
  const [formSeverity, setFormSeverity] = useState("warning");
  const [formNotifyDiscord, setFormNotifyDiscord] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      if (!res.ok) return;
      const json = await res.json();
      setRules(json.rules ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?view=events");
      if (!res.ok) return;
      const json = await res.json();
      setEvents(json.events ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "rules") fetchRules();
    else fetchEvents();
  }, [tab, fetchRules, fetchEvents]);

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!formName || !formMetric || !formThreshold) {
      setFormError("All fields are required.");
      return;
    }

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          condition: {
            metric: formMetric,
            operator: formOperator,
            threshold: Number(formThreshold),
          },
          severity: formSeverity,
          notifyDiscord: formNotifyDiscord,
        }),
      });
      if (!res.ok) throw new Error("Failed to create rule");
      setFormName("");
      setFormMetric("");
      setFormThreshold("");
      await fetchRules();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleAcknowledge(eventId: string) {
    try {
      await fetch(`/api/alerts?action=acknowledge&id=${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge", id: eventId }),
      });
      await fetchEvents();
    } catch {
      // TODO: toast
    }
  }

  function severityBadge(severity: string) {
    const cls = SEVERITY_CLASSES[severity] ?? "bg-gray-100 text-gray-800";
    return (
      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${cls}`}>
        {severity}
      </span>
    );
  }

  if (loading) {
    return <div className="p-8 text-gray-500">Loading alerts...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Alerts</h1>

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setTab("rules")}
            className={`pb-2 text-sm font-medium ${
              tab === "rules"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Rules
          </button>
          <button
            onClick={() => setTab("events")}
            className={`pb-2 text-sm font-medium ${
              tab === "events"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Events
          </button>
        </div>

        {/* Rules Tab */}
        {tab === "rules" && (
          <>
            {/* Create Rule Form */}
            <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Alert Rule</h2>
              {formError && (
                <p className="mb-4 text-sm text-red-600">{formError}</p>
              )}
              <form onSubmit={handleCreateRule} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                    placeholder="High spend alert"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Metric</label>
                  <input
                    type="text"
                    value={formMetric}
                    onChange={(e) => setFormMetric(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                    placeholder="budget_spent_pct"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Operator</label>
                  <select
                    value={formOperator}
                    onChange={(e) => setFormOperator(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  >
                    {OPERATORS.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Threshold</label>
                  <input
                    type="number"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                    placeholder="80"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Severity</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formNotifyDiscord}
                      onChange={(e) => setFormNotifyDiscord(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Notify Discord
                  </label>
                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Create Rule
                  </button>
                </div>
              </form>
            </div>

            {/* Rules Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Condition</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Enabled</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Discord</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{rule.name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">{severityBadge(rule.severity)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {rule.condition.metric} {rule.condition.operator} {rule.condition.threshold}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        <span className={rule.enabled ? "text-green-600" : "text-gray-400"}>
                          {rule.enabled ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {rule.notifyDiscord ? "Yes" : "No"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <button className="text-red-600 hover:text-red-800">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {rules.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                        No alert rules configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Events Tab */}
        {tab === "events" && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm">{severityBadge(event.severity)}</td>
                    <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-900">{event.message}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{event.agentId ?? "-"}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {event.acknowledged ? (
                        <span className="text-green-600">Acknowledged</span>
                      ) : (
                        <span className="text-orange-600">Active</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(event.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {!event.acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(event.id)}
                          className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                      No alert events recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
