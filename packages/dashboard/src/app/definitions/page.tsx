"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  CreateDefinitionDialog,
  type CreateDefinitionForm,
  EMPTY_FORM,
} from "./definition-dialog";
import { DefinitionsTable } from "./definitions-table";

interface Definition {
  createdAt?: string;
  defaultBudget?: number;
  id: string;
  mission?: string;
  model?: string;
  modelProvider?: string;
  name: string;
}

export default function DefinitionsPage() {
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateDefinitionForm>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const fetchDefinitions = useCallback(async () => {
    try {
      const response = await fetch("/api/definitions");
      if (!response.ok) {
        throw new Error(`Failed to fetch definitions: ${response.status}`);
      }
      const json = await response.json();
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
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const body = {
        name: form.name,
        mission: form.mission,
        modelProvider: form.modelProvider,
        modelId: form.modelId,
        defaultBudget: Number.parseFloat(form.defaultBudget),
        capabilities: JSON.parse(form.capabilities),
        tools: JSON.parse(form.tools),
        approvalPolicies: JSON.parse(form.approvalPolicies),
        retryPolicy: JSON.parse(form.retryPolicy),
        heartbeatConfig: JSON.parse(form.heartbeatConfig),
      };

      const response = await fetch("/api/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to create definition: ${response.status}`);
      }

      setForm({ ...EMPTY_FORM });
      setDialogOpen(false);
      await fetchDefinitions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create definition"
      );
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

  if (loading) {
    return (
      <div>
        <p className="text-muted-foreground text-sm">Loading definitions...</p>
      </div>
    );
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Agent Definitions</CardTitle>
          <CardDescription>
            Manage agent definitions and their configurations.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <CreateDefinitionDialog
              dialogOpen={dialogOpen}
              form={form}
              onOpenChange={setDialogOpen}
              onSubmit={handleSubmit}
              onUpdateField={updateField}
              submitting={submitting}
            />
          </div>

          <DefinitionsTable definitions={definitions} onDelete={handleDelete} />
        </CardContent>
      </Card>
    </div>
  );
}
