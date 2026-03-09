"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Pipeline {
  budget: { limit: number; spent: number };
  currentStage: string;
  goal: string;
  id: string;
  name: string;
  status: "planned" | "active" | "paused" | "completed" | "failed";
}

const STATUS_VARIANT: Record<
  Pipeline["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  planned: "secondary",
  active: "default",
  paused: "outline",
  completed: "secondary",
  failed: "destructive",
};

const PLACEHOLDER_PIPELINES: Pipeline[] = [
  {
    id: "1",
    name: "Market Research",
    goal: "Analyze competitor landscape",
    currentStage: "Data Collection",
    status: "active",
    budget: { limit: 50, spent: 12.4 },
  },
  {
    id: "2",
    name: "Code Review Automation",
    goal: "Automate PR reviews for main repo",
    currentStage: "Setup",
    status: "planned",
    budget: { limit: 25, spent: 0 },
  },
  {
    id: "3",
    name: "Content Generation",
    goal: "Generate weekly blog posts",
    currentStage: "Publishing",
    status: "completed",
    budget: { limit: 30, spent: 28.75 },
  },
];

export default function PipelinesPage() {
  const [pipelines] = useState<Pipeline[]>(PLACEHOLDER_PIPELINES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formGoal, setFormGoal] = useState("");
  const [formStages, setFormStages] = useState("");
  const [formBudget, setFormBudget] = useState("");

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    // TODO: POST to /api/pipelines
    setDialogOpen(false);
    setFormName("");
    setFormGoal("");
    setFormStages("");
    setFormBudget("");
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Pipelines</CardTitle>
          <CardDescription>
            Manage multi-stage agent pipelines and track their progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex justify-end">
            <CreatePipelineDialog
              dialogOpen={dialogOpen}
              formBudget={formBudget}
              formGoal={formGoal}
              formName={formName}
              formStages={formStages}
              onBudgetChange={setFormBudget}
              onCreate={handleCreate}
              onGoalChange={setFormGoal}
              onNameChange={setFormName}
              onOpenChange={setDialogOpen}
              onStagesChange={setFormStages}
            />
          </div>

          <PipelinesTable pipelines={pipelines} />
        </CardContent>
      </Card>
    </div>
  );
}

function CreatePipelineDialog({
  dialogOpen,
  onOpenChange,
  formName,
  formGoal,
  formStages,
  formBudget,
  onNameChange,
  onGoalChange,
  onStagesChange,
  onBudgetChange,
  onCreate,
}: {
  dialogOpen: boolean;
  formBudget: string;
  formGoal: string;
  formName: string;
  formStages: string;
  onBudgetChange: (value: string) => void;
  onCreate: (event: React.FormEvent) => void;
  onGoalChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onStagesChange: (value: string) => void;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={dialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon data-icon="inline-start" />
          Create Pipeline
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Pipeline</DialogTitle>
          <DialogDescription>
            Define a new multi-stage pipeline for agent orchestration.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onCreate}>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input
                  onChange={(event) => onNameChange(event.target.value)}
                  placeholder="Pipeline name"
                  required
                  value={formName}
                />
              </Field>
              <Field>
                <FieldLabel>Budget (USD)</FieldLabel>
                <Input
                  min="0"
                  onChange={(event) => onBudgetChange(event.target.value)}
                  placeholder="50.00"
                  required
                  step="0.01"
                  type="number"
                  value={formBudget}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Goal</FieldLabel>
              <Input
                onChange={(event) => onGoalChange(event.target.value)}
                placeholder="What should this pipeline accomplish?"
                required
                value={formGoal}
              />
            </Field>
            <Field>
              <FieldLabel>Stages (comma-separated)</FieldLabel>
              <Input
                onChange={(event) => onStagesChange(event.target.value)}
                placeholder="Research, Analysis, Implementation"
                required
                value={formStages}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PipelinesTable({ pipelines }: { pipelines: Pipeline[] }) {
  if (pipelines.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No pipelines yet. Create one to get started.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Goal</TableHead>
          <TableHead>Current Stage</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Budget</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pipelines.map((pipeline) => (
          <PipelineRow key={pipeline.id} pipeline={pipeline} />
        ))}
      </TableBody>
    </Table>
  );
}

function PipelineRow({ pipeline }: { pipeline: Pipeline }) {
  const budgetRatio = pipeline.budget.spent / pipeline.budget.limit;

  return (
    <TableRow>
      <TableCell className="font-medium">{pipeline.name}</TableCell>
      <TableCell className="text-muted-foreground">{pipeline.goal}</TableCell>
      <TableCell className="text-muted-foreground">
        {pipeline.currentStage}
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[pipeline.status]}>
          {pipeline.status}
        </Badge>
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "text-sm",
            budgetRatio > 0.9 ? "text-destructive" : "text-muted-foreground"
          )}
        >
          ${pipeline.budget.spent.toFixed(2)} / $
          {pipeline.budget.limit.toFixed(2)}
        </span>
      </TableCell>
    </TableRow>
  );
}
