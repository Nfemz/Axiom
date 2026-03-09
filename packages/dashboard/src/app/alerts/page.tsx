"use client";

import { useCallback, useEffect, useState } from "react";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const OPERATORS = ["gt", "lt", "eq", "gte", "lte"] as const;

// ─── Helpers ────────────────────────────────────────────────────────

function severityBadge(severity: string) {
  switch (severity) {
    case "info":
      return <Badge variant="default">{severity}</Badge>;
    case "warning":
      return <Badge variant="outline">{severity}</Badge>;
    case "critical":
      return <Badge variant="destructive">{severity}</Badge>;
    default:
      return <Badge variant="secondary">{severity}</Badge>;
  }
}

// ─── Component ──────────────────────────────────────────────────────

export default function AlertsPage() {
  const [tab, setTab] = useState("rules");
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [formName, setFormName] = useState("");
  const [formMetric, setFormMetric] = useState("");
  const [formOperator, setFormOperator] = useState<string>("gt");
  const [formThreshold, setFormThreshold] = useState("");
  const [formSeverity, setFormSeverity] = useState("warning");
  const [formNotifyDiscord, setFormNotifyDiscord] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const response = await fetch("/api/alerts");
      if (!response.ok) {
        return;
      }
      const json = await response.json();
      setRules(json.rules ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/alerts?view=events");
      if (!response.ok) {
        return;
      }
      const json = await response.json();
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

  async function handleCreateRule(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!(formName && formMetric && formThreshold)) {
      setFormError("All fields are required.");
      return;
    }

    try {
      const response = await fetch("/api/alerts", {
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
      if (!response.ok) {
        throw new Error("Failed to create rule");
      }
      setFormName("");
      setFormMetric("");
      setFormThreshold("");
      await fetchRules();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unknown error");
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

  if (loading) {
    return <div className="text-muted-foreground">Loading alerts...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-bold text-2xl text-foreground">Alerts</h1>

      <Tabs onValueChange={setTab} value={tab}>
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <div className="flex flex-col gap-6">
            <CreateRuleForm
              formError={formError}
              formMetric={formMetric}
              formName={formName}
              formNotifyDiscord={formNotifyDiscord}
              formOperator={formOperator}
              formSeverity={formSeverity}
              formThreshold={formThreshold}
              onSubmit={handleCreateRule}
              setFormMetric={setFormMetric}
              setFormName={setFormName}
              setFormNotifyDiscord={setFormNotifyDiscord}
              setFormOperator={setFormOperator}
              setFormSeverity={setFormSeverity}
              setFormThreshold={setFormThreshold}
            />
            <RulesTable rules={rules} />
          </div>
        </TabsContent>

        <TabsContent value="events">
          <EventsTable events={events} onAcknowledge={handleAcknowledge} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Create Rule Form ───────────────────────────────────────────────

interface CreateRuleFormProps {
  formError: string | null;
  formMetric: string;
  formName: string;
  formNotifyDiscord: boolean;
  formOperator: string;
  formSeverity: string;
  formThreshold: string;
  onSubmit: (event: React.FormEvent) => void;
  setFormMetric: (value: string) => void;
  setFormName: (value: string) => void;
  setFormNotifyDiscord: (value: boolean) => void;
  setFormOperator: (value: string) => void;
  setFormSeverity: (value: string) => void;
  setFormThreshold: (value: string) => void;
}

function CreateRuleForm({
  formError,
  formMetric,
  formName,
  formNotifyDiscord,
  formOperator,
  formSeverity,
  formThreshold,
  onSubmit,
  setFormMetric,
  setFormName,
  setFormNotifyDiscord,
  setFormOperator,
  setFormSeverity,
  setFormThreshold,
}: CreateRuleFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Alert Rule</CardTitle>
        <CardDescription>Define conditions that trigger alerts</CardDescription>
      </CardHeader>
      <CardContent>
        {formError && (
          <p className="mb-4 text-destructive text-sm">{formError}</p>
        )}
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="alert-name">Name</FieldLabel>
                <Input
                  id="alert-name"
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="High spend alert"
                  value={formName}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="alert-metric">Metric</FieldLabel>
                <Input
                  id="alert-metric"
                  onChange={(event) => setFormMetric(event.target.value)}
                  placeholder="budget_spent_pct"
                  value={formMetric}
                />
              </Field>
              <Field>
                <FieldLabel>Operator</FieldLabel>
                <Select onValueChange={setFormOperator} value={formOperator}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {OPERATORS.map((operator) => (
                        <SelectItem key={operator} value={operator}>
                          {operator}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="alert-threshold">Threshold</FieldLabel>
                <Input
                  id="alert-threshold"
                  onChange={(event) => setFormThreshold(event.target.value)}
                  placeholder="80"
                  type="number"
                  value={formThreshold}
                />
              </Field>
              <Field>
                <FieldLabel>Severity</FieldLabel>
                <Select onValueChange={setFormSeverity} value={formSeverity}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="items-center" orientation="horizontal">
                <Switch
                  checked={formNotifyDiscord}
                  id="notify-discord"
                  onCheckedChange={setFormNotifyDiscord}
                />
                <FieldLabel htmlFor="notify-discord">Notify Discord</FieldLabel>
              </Field>
            </div>
            <div>
              <Button type="submit">Create Rule</Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Rules Table ────────────────────────────────────────────────────

function RulesTable({ rules }: { rules: AlertRule[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Rules</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Discord</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.name}</TableCell>
                <TableCell>{severityBadge(rule.severity)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {rule.condition.metric} {rule.condition.operator}{" "}
                  {rule.condition.threshold}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      rule.enabled ? "text-success" : "text-muted-foreground"
                    }
                  >
                    {rule.enabled ? "Yes" : "No"}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {rule.notifyDiscord ? "Yes" : "No"}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="destructive">
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rules.length === 0 && (
              <TableRow>
                <TableCell
                  className="py-12 text-center text-muted-foreground"
                  colSpan={6}
                >
                  No alert rules configured.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Events Table ───────────────────────────────────────────────────

function EventsTable({
  events,
  onAcknowledge,
}: {
  events: AlertEvent[];
  onAcknowledge: (eventId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Events</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>{severityBadge(event.severity)}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {event.message}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {event.agentId ?? "-"}
                </TableCell>
                <TableCell>
                  {event.acknowledged ? (
                    <Badge className="text-success" variant="outline">
                      Acknowledged
                    </Badge>
                  ) : (
                    <Badge className="text-warning" variant="outline">
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  {!event.acknowledged && (
                    <Button onClick={() => onAcknowledge(event.id)} size="sm">
                      Acknowledge
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {events.length === 0 && (
              <TableRow>
                <TableCell
                  className="py-12 text-center text-muted-foreground"
                  colSpan={6}
                >
                  No alert events recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
