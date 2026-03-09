"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ──────────────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────

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
      const response = await fetch("/api/secrets");
      if (!response.ok) {
        throw new Error(`Failed to fetch secrets: ${response.status}`);
      }
      const json = await response.json();
      setSecrets(json.secrets ?? []);
      setFetchError(null);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          secretType,
          value,
          allowedAgents: allowedAgents
            .split(",")
            .map((segment) => segment.trim())
            .filter(Boolean),
          allowedDomains: allowedDomains
            .split(",")
            .map((segment) => segment.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create secret: ${response.status}`);
      }

      setName("");
      setSecretType(SECRET_TYPES[0]);
      setValue("");
      setAllowedAgents("");
      setAllowedDomains("");
      await fetchSecrets();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(secretId: string) {
    try {
      await fetch(`/api/secrets/${secretId}`, { method: "DELETE" });
      await fetchSecrets();
    } catch {
      // TODO: Show error toast
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading secrets...</div>;
  }

  if (fetchError) {
    return <div className="text-destructive">Error: {fetchError}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-bold text-2xl text-foreground">Secrets Vault</h1>

      <div className="flex flex-col gap-6">
        <CreateSecretForm
          allowedAgents={allowedAgents}
          allowedDomains={allowedDomains}
          formError={formError}
          name={name}
          onSubmit={handleCreate}
          secretType={secretType}
          setAllowedAgents={setAllowedAgents}
          setAllowedDomains={setAllowedDomains}
          setName={setName}
          setSecretType={setSecretType}
          setValue={setValue}
          submitting={submitting}
          value={value}
        />
        <SecretsTable onDelete={handleDelete} secrets={secrets} />
      </div>
    </div>
  );
}

// ─── Create Secret Form ─────────────────────────────────────────────

interface CreateSecretFormProps {
  allowedAgents: string;
  allowedDomains: string;
  formError: string | null;
  name: string;
  onSubmit: (event: FormEvent) => void;
  secretType: string;
  setAllowedAgents: (value: string) => void;
  setAllowedDomains: (value: string) => void;
  setName: (value: string) => void;
  setSecretType: (value: string) => void;
  setValue: (value: string) => void;
  submitting: boolean;
  value: string;
}

function CreateSecretForm({
  allowedAgents,
  allowedDomains,
  formError,
  name,
  onSubmit,
  secretType,
  setAllowedAgents,
  setAllowedDomains,
  setName,
  setSecretType,
  setValue,
  submitting,
  value,
}: CreateSecretFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Secret</CardTitle>
        <CardDescription>
          Store encrypted secrets for agent access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="create-secret-form" onSubmit={onSubmit}>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="secret-name">Name</FieldLabel>
                <Input
                  id="secret-name"
                  onChange={(event) => setName(event.target.value)}
                  required
                  value={name}
                />
              </Field>
              <Field>
                <FieldLabel>Type</FieldLabel>
                <Select onValueChange={setSecretType} value={secretType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {SECRET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="secret-value">Value</FieldLabel>
              <Input
                id="secret-value"
                onChange={(event) => setValue(event.target.value)}
                required
                type="password"
                value={value}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="allowed-agents">
                  Allowed Agents (comma-separated UUIDs)
                </FieldLabel>
                <Textarea
                  id="allowed-agents"
                  onChange={(event) => setAllowedAgents(event.target.value)}
                  rows={2}
                  value={allowedAgents}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="allowed-domains">
                  Allowed Domains (comma-separated)
                </FieldLabel>
                <Textarea
                  id="allowed-domains"
                  onChange={(event) => setAllowedDomains(event.target.value)}
                  rows={2}
                  value={allowedDomains}
                />
              </Field>
            </div>
            {formError && (
              <p className="text-destructive text-sm">{formError}</p>
            )}
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Button disabled={submitting} form="create-secret-form" type="submit">
          {submitting ? "Creating..." : "Create Secret"}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Secrets Table ──────────────────────────────────────────────────

function SecretsTable({
  secrets,
  onDelete,
}: {
  secrets: Secret[];
  onDelete: (secretId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stored Secrets</CardTitle>
        <CardDescription>
          {secrets.length === 0
            ? "No secrets stored yet."
            : `${secrets.length} secret${secrets.length === 1 ? "" : "s"} stored`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Allowed Agents</TableHead>
              <TableHead>Allowed Domains</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {secrets.map((secret) => (
              <TableRow key={secret.id}>
                <TableCell className="font-medium">{secret.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{secret.secretType}</Badge>
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {secret.allowedAgents?.length ?? 0}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {secret.allowedDomains?.join(", ") || "-"}
                </TableCell>
                <TableCell>
                  <DeleteSecretDialog
                    onConfirm={() => onDelete(secret.id)}
                    secretName={secret.name}
                  />
                </TableCell>
              </TableRow>
            ))}
            {secrets.length === 0 && (
              <TableRow>
                <TableCell
                  className="py-12 text-center text-muted-foreground"
                  colSpan={5}
                >
                  No secrets stored yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Delete Secret Dialog ───────────────────────────────────────────

function DeleteSecretDialog({
  secretName,
  onConfirm,
}: {
  secretName: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="destructive">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Secret</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{secretName}</span>?
            This action cannot be undone and may break agents that depend on
            this secret.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant="destructive">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
