"use client";

import { useCallback, useEffect, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────

interface AlertRule {
  condition: { metric: string; operator: string; threshold: number };
  createdAt: string;
  enabled: boolean;
  id: string;
  name: string;
  notifyDiscord: boolean;
  severity: string;
}

interface AlertEvent {
  acknowledged: boolean;
  acknowledgedAt: string | null;
  agentId: string | null;
  createdAt: string;
  id: string;
  message: string;
  ruleId: string;
  severity: string;
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
      if (!res.ok) {
        return;
      }
      const json = await res.json();
      setRules(json.rules ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?view=events");
      if (!res.ok) {
        return;
      }
      const json = await res.json();
      setEvents(json.events ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "rules") {
      fetchRules();
    } else {
      fetchEvents();
    }
  }, [tab, fetchRules, fetchEvents]);

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!(formName && formMetric && formThreshold)) {
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
      if (!res.ok) {
        throw new Error("Failed to create rule");
      }
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
      <span
        className={`inline-flex rounded-full px-2 font-semibold text-xs leading-5 ${cls}`}
      >
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
        <h1 className="mb-6 font-bold text-2xl text-gray-900">Alerts</h1>

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-4 border-gray-200 border-b">
          <button
            className={`pb-2 font-medium text-sm ${
              tab === "rules"
                ? "border-blue-500 border-b-2 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab("rules")}
            type="button"
          >
            Rules
          </button>
          <button
            className={`pb-2 font-medium text-sm ${
              tab === "events"
                ? "border-blue-500 border-b-2 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab("events")}
            type="button"
          >
            Events
          </button>
        </div>

        {/* Rules Tab */}
        {tab === "rules" && (
          <>
            {/* Create Rule Form */}
            <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold text-gray-900 text-lg">
                Create Alert Rule
              </h2>
              {formError && (
                <p className="mb-4 text-red-600 text-sm">{formError}</p>
              )}
              <form
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                onSubmit={handleCreateRule}
              >
                <div>
                  <label
                    className="block font-medium text-gray-700 text-sm"
                    htmlFor="alert-name"
                  >
                    Name
                  </label>
                  <input
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                    id="alert-name"
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="High spend alert"
                    type="text"
                    value={formName}
                  />
                </div>
                <div>
                  <label
                    className="block font-medium text-gray-700 text-sm"
                    htmlFor="alert-metric"
                  >
                    Metric
                  </label>
                  <input
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                    id="alert-metric"
                    onChange={(e) => setFormMetric(e.target.value)}
                    placeholder="budget_spent_pct"
                    type="text"
                    value={formMetric}
                  />
                </div>
                <div>
                  <label
                    className="block font-medium text-gray-700 text-sm"
                    htmlFor="alert-operator"
                  >
                    Operator
                  </label>
                  <select
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                    id="alert-operator"
                    onChange={(e) => setFormOperator(e.target.value)}
                    value={formOperator}
                  >
                    {OPERATORS.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block font-medium text-gray-700 text-sm"
                    htmlFor="alert-threshold"
                  >
                    Threshold
                  </label>
                  <input
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                    id="alert-threshold"
                    onChange={(e) => setFormThreshold(e.target.value)}
                    placeholder="80"
                    type="number"
                    value={formThreshold}
                  />
                </div>
                <div>
                  <label
                    className="block font-medium text-gray-700 text-sm"
                    htmlFor="alert-severity"
                  >
                    Severity
                  </label>
                  <select
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                    id="alert-severity"
                    onChange={(e) => setFormSeverity(e.target.value)}
                    value={formSeverity}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-gray-700 text-sm">
                    <input
                      checked={formNotifyDiscord}
                      className="rounded border-gray-300"
                      onChange={(e) => setFormNotifyDiscord(e.target.checked)}
                      type="checkbox"
                    />
                    Notify Discord
                  </label>
                  <button
                    className="rounded-md bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700"
                    type="submit"
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
                    <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Condition
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Enabled
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Discord
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rules.map((rule) => (
                    <tr className="hover:bg-gray-50" key={rule.id}>
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 text-sm">
                        {rule.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {severityBadge(rule.severity)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                        {rule.condition.metric} {rule.condition.operator}{" "}
                        {rule.condition.threshold}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                        <span
                          className={
                            rule.enabled ? "text-green-600" : "text-gray-400"
                          }
                        >
                          {rule.enabled ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                        {rule.notifyDiscord ? "Yes" : "No"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <button
                          className="text-red-600 hover:text-red-800"
                          type="button"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rules.length === 0 && (
                    <tr>
                      <td
                        className="px-6 py-12 text-center text-gray-500 text-sm"
                        colSpan={6}
                      >
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
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {events.map((event) => (
                  <tr className="hover:bg-gray-50" key={event.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {severityBadge(event.severity)}
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-gray-900 text-sm">
                      {event.message}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                      {event.agentId ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {event.acknowledged ? (
                        <span className="text-green-600">Acknowledged</span>
                      ) : (
                        <span className="text-orange-600">Active</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                      {new Date(event.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {!event.acknowledged && (
                        <button
                          className="rounded bg-green-600 px-3 py-1 font-medium text-white text-xs hover:bg-green-700"
                          onClick={() => handleAcknowledge(event.id)}
                          type="button"
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td
                      className="px-6 py-12 text-center text-gray-500 text-sm"
                      colSpan={6}
                    >
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
