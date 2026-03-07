"use client";

import { useState } from "react";

interface Pipeline {
  id: string;
  name: string;
  goal: string;
  currentStage: string;
  status: "planned" | "active" | "paused" | "completed" | "failed";
  budget: { limit: number; spent: number };
}

const STATUS_BADGE_CLASSES: Record<Pipeline["status"], string> = {
  planned: "bg-gray-100 text-gray-800",
  active: "bg-blue-100 text-blue-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formGoal, setFormGoal] = useState("");
  const [formStages, setFormStages] = useState("");
  const [formBudget, setFormBudget] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    // TODO: POST to /api/pipelines
    setShowCreateForm(false);
    setFormName("");
    setFormGoal("");
    setFormStages("");
    setFormBudget("");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Pipelines</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showCreateForm ? "Cancel" : "Create Pipeline"}
          </button>
        </div>

        {showCreateForm && (
          <form
            onSubmit={handleCreate}
            className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              New Pipeline
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Pipeline name"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Budget (USD)
                </label>
                <input
                  type="number"
                  value={formBudget}
                  onChange={(e) => setFormBudget(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="50.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Goal
                </label>
                <input
                  type="text"
                  value={formGoal}
                  onChange={(e) => setFormGoal(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="What should this pipeline accomplish?"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Stages (comma-separated)
                </label>
                <input
                  type="text"
                  value={formStages}
                  onChange={(e) => setFormStages(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Research, Analysis, Implementation"
                  required
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </form>
        )}

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Goal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Current Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Budget
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {pipelines.map((pipeline) => (
                <tr key={pipeline.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {pipeline.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {pipeline.goal}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {pipeline.currentStage}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${STATUS_BADGE_CLASSES[pipeline.status]}`}
                    >
                      {pipeline.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    ${pipeline.budget.spent.toFixed(2)} / $
                    {pipeline.budget.limit.toFixed(2)}
                  </td>
                </tr>
              ))}
              {pipelines.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    No pipelines yet. Create one to get started.
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
