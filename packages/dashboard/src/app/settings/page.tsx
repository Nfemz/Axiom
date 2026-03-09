"use client";

import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────

interface SystemSettings {
  activeHoursEnd: string;
  activeHoursStart: string;
  activeHoursTimezone: string;
  backupRetentionDays: number;
  discordBotToken: string;
  discordWebhookUrl: string;
  heartbeatIntervalMs: number;
  revenueSplitOperator: number;
  revenueSplitReinvest: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  heartbeatIntervalMs: 1_800_000,
  activeHoursStart: "06:00",
  activeHoursEnd: "22:00",
  activeHoursTimezone: "UTC",
  revenueSplitOperator: 20,
  revenueSplitReinvest: 80,
  backupRetentionDays: 90,
  discordWebhookUrl: "",
  discordBotToken: "",
};

// ─── Component ──────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/system/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 font-bold text-2xl text-gray-900">
          System Settings
        </h1>

        <form className="space-y-8" onSubmit={handleSave}>
          {/* Heartbeat */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900 text-lg">
              Heartbeat
            </h2>
            <div>
              <label
                className="block font-medium text-gray-700 text-sm"
                htmlFor="settings-heartbeat"
              >
                Heartbeat Interval (ms)
              </label>
              <input
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                id="settings-heartbeat"
                onChange={(e) =>
                  update("heartbeatIntervalMs", Number(e.target.value))
                }
                type="number"
                value={settings.heartbeatIntervalMs}
              />
              <p className="mt-1 text-gray-500 text-xs">
                Default: 1800000 (30 minutes)
              </p>
            </div>
          </div>

          {/* Active Hours */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900 text-lg">
              Active Hours
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  className="block font-medium text-gray-700 text-sm"
                  htmlFor="settings-hours-start"
                >
                  Start
                </label>
                <input
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  id="settings-hours-start"
                  onChange={(e) => update("activeHoursStart", e.target.value)}
                  type="time"
                  value={settings.activeHoursStart}
                />
              </div>
              <div>
                <label
                  className="block font-medium text-gray-700 text-sm"
                  htmlFor="settings-hours-end"
                >
                  End
                </label>
                <input
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  id="settings-hours-end"
                  onChange={(e) => update("activeHoursEnd", e.target.value)}
                  type="time"
                  value={settings.activeHoursEnd}
                />
              </div>
              <div>
                <label
                  className="block font-medium text-gray-700 text-sm"
                  htmlFor="settings-timezone"
                >
                  Timezone
                </label>
                <input
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  id="settings-timezone"
                  onChange={(e) =>
                    update("activeHoursTimezone", e.target.value)
                  }
                  placeholder="UTC"
                  type="text"
                  value={settings.activeHoursTimezone}
                />
              </div>
            </div>
          </div>

          {/* Revenue Split */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900 text-lg">
              Revenue Split
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="block font-medium text-gray-700 text-sm"
                  htmlFor="settings-split-operator"
                >
                  Operator (%)
                </label>
                <input
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  id="settings-split-operator"
                  max={100}
                  min={0}
                  onChange={(e) =>
                    update("revenueSplitOperator", Number(e.target.value))
                  }
                  type="number"
                  value={settings.revenueSplitOperator}
                />
              </div>
              <div>
                <label
                  className="block font-medium text-gray-700 text-sm"
                  htmlFor="settings-split-reinvest"
                >
                  Reinvest (%)
                </label>
                <input
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  id="settings-split-reinvest"
                  max={100}
                  min={0}
                  onChange={(e) =>
                    update("revenueSplitReinvest", Number(e.target.value))
                  }
                  type="number"
                  value={settings.revenueSplitReinvest}
                />
              </div>
            </div>
          </div>

          {/* Backup */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900 text-lg">Backup</h2>
            <div>
              <label
                className="block font-medium text-gray-700 text-sm"
                htmlFor="settings-retention"
              >
                Retention Days
              </label>
              <input
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                id="settings-retention"
                min={1}
                onChange={(e) =>
                  update("backupRetentionDays", Number(e.target.value))
                }
                type="number"
                value={settings.backupRetentionDays}
              />
            </div>
          </div>

          {/* Discord */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900 text-lg">
              Discord
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  className="block font-medium text-gray-700 text-sm"
                  htmlFor="settings-webhook-url"
                >
                  Webhook URL
                </label>
                <input
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  id="settings-webhook-url"
                  onChange={(e) => update("discordWebhookUrl", e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  type="url"
                  value={settings.discordWebhookUrl}
                />
              </div>
              <div>
                <label
                  className="block font-medium text-gray-700 text-sm"
                  htmlFor="settings-bot-token"
                >
                  Bot Token
                </label>
                <input
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  id="settings-bot-token"
                  onChange={(e) => update("discordBotToken", e.target.value)}
                  placeholder="Bot token"
                  type="password"
                  value={settings.discordBotToken}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              className="rounded-md bg-blue-600 px-6 py-2 font-medium text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
              type="submit"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
            {saved && (
              <span className="text-green-600 text-sm">
                Settings saved successfully.
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
