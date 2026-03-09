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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────

interface Skill {
  authoringAgentName: string | null;
  id: string;
  invocationCount: number;
  name: string;
  status: string;
  successCount: number;
  version: number;
}

const PLACEHOLDER_SKILLS: Skill[] = [
  {
    id: "1",
    name: "web-scrape-article",
    version: 3,
    status: "active",
    invocationCount: 142,
    successCount: 138,
    authoringAgentName: "research-agent-01",
  },
  {
    id: "2",
    name: "generate-summary",
    version: 2,
    status: "active",
    invocationCount: 89,
    successCount: 85,
    authoringAgentName: "content-agent-03",
  },
  {
    id: "3",
    name: "deploy-static-site",
    version: 1,
    status: "validated",
    invocationCount: 12,
    successCount: 11,
    authoringAgentName: "code-agent-02",
  },
  {
    id: "4",
    name: "legacy-csv-parser",
    version: 1,
    status: "deprecated",
    invocationCount: 340,
    successCount: 298,
    authoringAgentName: "research-agent-01",
  },
  {
    id: "5",
    name: "image-resize-batch",
    version: 1,
    status: "draft",
    invocationCount: 0,
    successCount: 0,
    authoringAgentName: null,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

function successRate(skill: Skill): string {
  if (skill.invocationCount === 0) {
    return "-";
  }
  return `${((skill.successCount / skill.invocationCount) * 100).toFixed(1)}%`;
}

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">{status}</Badge>;
    case "validated":
      return <Badge variant="default">{status}</Badge>;
    case "active":
      return (
        <Badge className="text-success" variant="outline">
          {status}
        </Badge>
      );
    case "deprecated":
      return <Badge variant="destructive">{status}</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ─── Summary Card ───────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  className,
}: {
  title: string;
  value: number;
  className?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className={cn("text-2xl", className)}>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

// ─── Component ──────────────────────────────────────────────────────

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSkills = useCallback(async () => {
    try {
      const response = await fetch("/api/skills");
      if (!response.ok) {
        throw new Error("Failed to fetch skills");
      }
      const json = await response.json();
      const fetched = json.skills as Skill[] | undefined;
      setSkills(fetched && fetched.length > 0 ? fetched : PLACEHOLDER_SKILLS);
    } catch {
      setSkills(PLACEHOLDER_SKILLS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  if (loading) {
    return <div className="text-muted-foreground">Loading skills...</div>;
  }

  const totalSkills = skills.length;
  const activeSkills = skills.filter((s) => s.status === "active").length;
  const deprecatedSkills = skills.filter(
    (s) => s.status === "deprecated"
  ).length;
  const totalInvocations = skills.reduce(
    (sum, s) => sum + s.invocationCount,
    0
  );

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-bold text-2xl text-foreground">Skills</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Skills" value={totalSkills} />
        <MetricCard
          className="text-success"
          title="Active"
          value={activeSkills}
        />
        <MetricCard
          className="text-destructive"
          title="Deprecated"
          value={deprecatedSkills}
        />
        <MetricCard
          className="text-primary"
          title="Total Invocations"
          value={totalInvocations}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Skills</CardTitle>
          <CardDescription>
            Registered skills and their performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SkillsTable skills={skills} />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Skills Table ───────────────────────────────────────────────────

function SkillsTable({ skills }: { skills: Skill[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Invocations</TableHead>
          <TableHead>Success Rate</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {skills.map((skill) => (
          <TableRow key={skill.id}>
            <TableCell className="font-medium">{skill.name}</TableCell>
            <TableCell className="text-muted-foreground">
              v{skill.version}
            </TableCell>
            <TableCell>{statusBadge(skill.status)}</TableCell>
            <TableCell className="text-muted-foreground">
              {skill.invocationCount}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {successRate(skill)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {skill.authoringAgentName ?? "-"}
            </TableCell>
            <TableCell>
              <Button size="sm" variant="link">
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {skills.length === 0 && (
          <TableRow>
            <TableCell
              className="py-12 text-center text-muted-foreground"
              colSpan={7}
            >
              No skills registered.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
