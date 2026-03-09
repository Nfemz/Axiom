"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
    setSettings((previous) => ({ ...previous, [key]: value }));
    setSaved(false);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/system/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-bold text-2xl text-foreground">System Settings</h1>

      <form className="flex flex-col gap-8" onSubmit={handleSave}>
        <HeartbeatCard settings={settings} update={update} />
        <ActiveHoursCard settings={settings} update={update} />
        <RevenueSplitCard settings={settings} update={update} />
        <BackupCard settings={settings} update={update} />
        <DiscordCard settings={settings} update={update} />

        <CardFooter className="gap-4 rounded-xl">
          <Button disabled={saving} type="submit">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          {saved && (
            <span className="text-sm text-success">
              Settings saved successfully.
            </span>
          )}
        </CardFooter>
      </form>
    </div>
  );
}

// ─── Section Cards ──────────────────────────────────────────────────

interface SectionProps {
  settings: SystemSettings;
  update: <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => void;
}

function HeartbeatCard({ settings, update }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Heartbeat</CardTitle>
        <CardDescription>
          Configure the agent heartbeat check interval.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="settings-heartbeat">
              Heartbeat Interval (ms)
            </FieldLabel>
            <Input
              id="settings-heartbeat"
              onChange={(event) =>
                update("heartbeatIntervalMs", Number(event.target.value))
              }
              type="number"
              value={settings.heartbeatIntervalMs}
            />
            <p className="text-muted-foreground text-xs">
              Default: 1800000 (30 minutes)
            </p>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function ActiveHoursCard({ settings, update }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Hours</CardTitle>
        <CardDescription>
          Define the window when agents are allowed to operate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="settings-hours-start">Start</FieldLabel>
              <Input
                id="settings-hours-start"
                onChange={(event) =>
                  update("activeHoursStart", event.target.value)
                }
                type="time"
                value={settings.activeHoursStart}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-hours-end">End</FieldLabel>
              <Input
                id="settings-hours-end"
                onChange={(event) =>
                  update("activeHoursEnd", event.target.value)
                }
                type="time"
                value={settings.activeHoursEnd}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-timezone">Timezone</FieldLabel>
              <Input
                id="settings-timezone"
                onChange={(event) =>
                  update("activeHoursTimezone", event.target.value)
                }
                placeholder="UTC"
                type="text"
                value={settings.activeHoursTimezone}
              />
            </Field>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function RevenueSplitCard({ settings, update }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Split</CardTitle>
        <CardDescription>
          Set how revenue is divided between operator and reinvestment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="settings-split-operator">
                Operator (%)
              </FieldLabel>
              <Input
                id="settings-split-operator"
                max={100}
                min={0}
                onChange={(event) =>
                  update("revenueSplitOperator", Number(event.target.value))
                }
                type="number"
                value={settings.revenueSplitOperator}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-split-reinvest">
                Reinvest (%)
              </FieldLabel>
              <Input
                id="settings-split-reinvest"
                max={100}
                min={0}
                onChange={(event) =>
                  update("revenueSplitReinvest", Number(event.target.value))
                }
                type="number"
                value={settings.revenueSplitReinvest}
              />
            </Field>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function BackupCard({ settings, update }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup</CardTitle>
        <CardDescription>
          Configure how long backups are retained.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="settings-retention">Retention Days</FieldLabel>
            <Input
              id="settings-retention"
              min={1}
              onChange={(event) =>
                update("backupRetentionDays", Number(event.target.value))
              }
              type="number"
              value={settings.backupRetentionDays}
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function DiscordCard({ settings, update }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Discord</CardTitle>
        <CardDescription>
          Connect Discord for notifications and bot commands.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="settings-webhook-url">Webhook URL</FieldLabel>
            <Input
              id="settings-webhook-url"
              onChange={(event) =>
                update("discordWebhookUrl", event.target.value)
              }
              placeholder="https://discord.com/api/webhooks/..."
              type="url"
              value={settings.discordWebhookUrl}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-bot-token">Bot Token</FieldLabel>
            <Input
              id="settings-bot-token"
              onChange={(event) =>
                update("discordBotToken", event.target.value)
              }
              placeholder="Bot token"
              type="password"
              value={settings.discordBotToken}
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
