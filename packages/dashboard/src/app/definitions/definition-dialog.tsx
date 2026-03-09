"use client";

import { PlusIcon } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";

export interface CreateDefinitionForm {
  approvalPolicies: string;
  capabilities: string;
  defaultBudget: string;
  heartbeatConfig: string;
  mission: string;
  modelId: string;
  modelProvider: string;
  name: string;
  retryPolicy: string;
  tools: string;
}

export const EMPTY_FORM: CreateDefinitionForm = {
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

export function CreateDefinitionDialog({
  dialogOpen,
  onOpenChange,
  form,
  onUpdateField,
  onSubmit,
  submitting,
}: {
  dialogOpen: boolean;
  form: CreateDefinitionForm;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent) => void;
  onUpdateField: (field: keyof CreateDefinitionForm, value: string) => void;
  submitting: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={dialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon data-icon="inline-start" />
          Create Definition
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Definition</DialogTitle>
          <DialogDescription>
            Configure a new agent definition with model and policy settings.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <DefinitionFormFields form={form} onUpdateField={onUpdateField} />
          <DialogFooter>
            <Button disabled={submitting || !form.name.trim()} type="submit">
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DefinitionFormFields({
  form,
  onUpdateField,
}: {
  form: CreateDefinitionForm;
  onUpdateField: (field: keyof CreateDefinitionForm, value: string) => void;
}) {
  return (
    <FieldGroup>
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input
            onChange={(event) => onUpdateField("name", event.target.value)}
            required
            value={form.name}
          />
        </Field>
        <Field>
          <FieldLabel>Model ID</FieldLabel>
          <Input
            onChange={(event) => onUpdateField("modelId", event.target.value)}
            placeholder="e.g., claude-sonnet-4-20250514"
            value={form.modelId}
          />
        </Field>
        <Field>
          <FieldLabel>Model Provider</FieldLabel>
          <Select
            onValueChange={(value) => onUpdateField("modelProvider", value)}
            value={form.modelProvider}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {MODEL_PROVIDERS.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Default Budget ($)</FieldLabel>
          <Input
            onChange={(event) =>
              onUpdateField("defaultBudget", event.target.value)
            }
            type="number"
            value={form.defaultBudget}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel>Mission</FieldLabel>
        <Textarea
          onChange={(event) => onUpdateField("mission", event.target.value)}
          rows={3}
          value={form.mission}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Capabilities (JSON)</FieldLabel>
          <Textarea
            className="font-mono text-xs"
            onChange={(event) =>
              onUpdateField("capabilities", event.target.value)
            }
            rows={3}
            value={form.capabilities}
          />
        </Field>
        <Field>
          <FieldLabel>Tools (JSON)</FieldLabel>
          <Textarea
            className="font-mono text-xs"
            onChange={(event) => onUpdateField("tools", event.target.value)}
            rows={3}
            value={form.tools}
          />
        </Field>
        <Field>
          <FieldLabel>Approval Policies (JSON)</FieldLabel>
          <Textarea
            className="font-mono text-xs"
            onChange={(event) =>
              onUpdateField("approvalPolicies", event.target.value)
            }
            rows={3}
            value={form.approvalPolicies}
          />
        </Field>
        <Field>
          <FieldLabel>Retry Policy (JSON)</FieldLabel>
          <Textarea
            className="font-mono text-xs"
            onChange={(event) =>
              onUpdateField("retryPolicy", event.target.value)
            }
            rows={3}
            value={form.retryPolicy}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel>Heartbeat Config (JSON)</FieldLabel>
        <Textarea
          className="font-mono text-xs"
          onChange={(event) =>
            onUpdateField("heartbeatConfig", event.target.value)
          }
          rows={3}
          value={form.heartbeatConfig}
        />
      </Field>
    </FieldGroup>
  );
}
