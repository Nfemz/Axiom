"use client";

import { useState, useCallback, useEffect } from "react";

// ─── Types ──────────────────────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  version: number;
  status: string;
  invocationCount: number;
  successCount: number;
  authoringAgentName: string | null;
}

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  validated: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  deprecated: "bg-red-100 text-red-800",
};

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

// ─── Component ──────────────────────────────────────────────────────

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/skills");
      if (!res.ok) throw new Error("Failed to fetch skills");
      const json = await res.json();
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

  const totalSkills = skills.length;
  const activeSkills = skills.filter((s) => s.status === "active").length;
  const deprecatedSkills = skills.filter((s) => s.status === "deprecated").length;
  const totalInvocations = skills.reduce((sum, s) => sum + s.invocationCount, 0);

  function successRate(skill: Skill): string {
    if (skill.invocationCount === 0) return "-";
    return `${((skill.successCount / skill.invocationCount) * 100).toFixed(1)}%`;
  }

  function statusBadge(status: string) {
    const cls = STATUS_CLASSES[status] ?? "bg-gray-100 text-gray-800";
    return (
      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${cls}`}>
        {status}
      </span>
    );
  }

  if (loading) {
    return <div className="p-8 text-gray-500">Loading skills...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">Skills</h1>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total Skills</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totalSkills}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Active</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{activeSkills}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Deprecated</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{deprecatedSkills}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total Invocations</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{totalInvocations}</p>
          </div>
        </div>

        {/* Skills Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Invocations</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Success Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Author</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {skills.map((skill) => (
                <tr key={skill.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{skill.name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">v{skill.version}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">{statusBadge(skill.status)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{skill.invocationCount}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{successRate(skill)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{skill.authoringAgentName ?? "-"}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <button className="text-blue-600 hover:text-blue-800">View</button>
                  </td>
                </tr>
              ))}
              {skills.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No skills registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
