"use client";

import { useState } from "react";

interface Pipeline {
  budget: { limit: number; spent: number };
  currentStage: string;
  goal: string;
  id: string;
  name: string;
  status: "planned" | "active" | "paused" | "completed" | "failed";
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
          <h1 className="font-bold text-2xl text-gray-900">Pipelines</h1>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700"
            onClick={() => setShowCreateForm(!showCreateForm)}
            type="button"
          >
            {showCreateForm ? "Cancel" : "Create Pipeline"}
          </button>
        </div>

        {showCreateForm && (
          <form
            className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            onSubmit={handleCreate}
          >
            <h2 className="mb-4 font-semibold text-gray-900 text-lg">
              New Pipeline
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  className="mb-1 block font-medium text-gray-700 text-sm"
                  htmlFor="pipeline-name"
                >
                  Name
                </label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  id="pipeline-name"
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Pipeline name"
                  required
                  type="text"
                  value={formName}
                />
              </div>
              <div>
                <label
                  className="mb-1 block font-medium text-gray-700 text-sm"
                  htmlFor="pipeline-budget"
                >
                  Budget (USD)
                </label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  id="pipeline-budget"
                  min="0"
                  onChange={(e) => setFormBudget(e.target.value)}
                  placeholder="50.00"
                  required
                  step="0.01"
                  type="number"
                  value={formBudget}
                />
              </div>
              <div className="md:col-span-2">
                <label
                  className="mb-1 block font-medium text-gray-700 text-sm"
                  htmlFor="pipeline-goal"
                >
                  Goal
                </label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  id="pipeline-goal"
                  onChange={(e) => setFormGoal(e.target.value)}
                  placeholder="What should this pipeline accomplish?"
                  required
                  type="text"
                  value={formGoal}
                />
              </div>
              <div className="md:col-span-2">
                <label
                  className="mb-1 block font-medium text-gray-700 text-sm"
                  htmlFor="pipeline-stages"
                >
                  Stages (comma-separated)
                </label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  id="pipeline-stages"
                  onChange={(e) => setFormStages(e.target.value)}
                  placeholder="Research, Analysis, Implementation"
                  required
                  type="text"
                  value={formStages}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700"
                type="submit"
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
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Goal
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Current Stage
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Budget
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {pipelines.map((pipeline) => (
                <tr className="hover:bg-gray-50" key={pipeline.id}>
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 text-sm">
                    {pipeline.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {pipeline.goal}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                    {pipeline.currentStage}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 font-semibold text-xs leading-5 ${STATUS_BADGE_CLASSES[pipeline.status]}`}
                    >
                      {pipeline.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                    ${pipeline.budget.spent.toFixed(2)} / $
                    {pipeline.budget.limit.toFixed(2)}
                  </td>
                </tr>
              ))}
              {pipelines.length === 0 && (
                <tr>
                  <td
                    className="px-6 py-12 text-center text-gray-500 text-sm"
                    colSpan={5}
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
