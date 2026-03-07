"use client";

import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────

interface SystemSettings {
  heartbeatIntervalMs: number;
  activeHoursStart: string;
  activeHoursEnd: string;
  activeHoursTimezone: string;
  revenueSplitOperator: number;
  revenueSplitReinvest: number;
  backupRetentionDays: number;
  discordWebhookUrl: string;
  discordBotToken: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  heartbeatIntervalMs: 1800000,
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

  function update<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
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
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">System Settings</h1>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Heartbeat */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Heartbeat</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Heartbeat Interval (ms)
              </label>
              <input
                type="number"
                value={settings.heartbeatIntervalMs}
                onChange={(e) => update("heartbeatIntervalMs", Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                Default: 1800000 (30 minutes)
              </p>
            </div>
          </div>

          {/* Active Hours */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Active Hours</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start</label>
                <input
                  type="time"
                  value={settings.activeHoursStart}
                  onChange={(e) => update("activeHoursStart", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End</label>
                <input
                  type="time"
                  value={settings.activeHoursEnd}
                  onChange={(e) => update("activeHoursEnd", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Timezone</label>
                <input
                  type="text"
                  value={settings.activeHoursTimezone}
                  onChange={(e) => update("activeHoursTimezone", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="UTC"
                />
              </div>
            </div>
          </div>

          {/* Revenue Split */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Revenue Split</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Operator (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.revenueSplitOperator}
                  onChange={(e) => update("revenueSplitOperator", Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reinvest (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.revenueSplitReinvest}
                  onChange={(e) => update("revenueSplitReinvest", Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Backup */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Backup</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Retention Days
              </label>
              <input
                type="number"
                min={1}
                value={settings.backupRetentionDays}
                onChange={(e) => update("backupRetentionDays", Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Discord */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Discord</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={settings.discordWebhookUrl}
                  onChange={(e) => update("discordWebhookUrl", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="https://discord.com/api/webhooks/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bot Token
                </label>
                <input
                  type="password"
                  value={settings.discordBotToken}
                  onChange={(e) => update("discordBotToken", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Bot token"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
            {saved && (
              <span className="text-sm text-green-600">Settings saved successfully.</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
