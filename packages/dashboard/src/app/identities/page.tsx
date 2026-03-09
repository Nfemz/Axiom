"use client";

import { useCallback, useEffect, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────

interface Identity {
  agentId: string;
  createdAt: string;
  id: string;
  identifier: string;
  identityType: string;
  provider: string;
  revokedAt: string | null;
  status: string;
}

type TypeFilter = "all" | "email" | "phone" | "voice" | "service_account";
type StatusFilter = "all" | "active" | "revoked";

const TYPE_BADGE_CLASSES: Record<string, string> = {
  email: "bg-blue-100 text-blue-800",
  phone: "bg-purple-100 text-purple-800",
  voice: "bg-orange-100 text-orange-800",
  service_account: "bg-gray-100 text-gray-800",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  revoked: "bg-red-100 text-red-800",
};

const TYPE_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  voice: "Voice",
  service_account: "Service Account",
};

// ─── Component ──────────────────────────────────────────────────────

export default function IdentitiesPage() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchIdentities = useCallback(async () => {
    try {
      const res = await fetch("/api/identities");
      if (!res.ok) {
        return;
      }
      const json = await res.json();
      setIdentities(json.identities ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIdentities();
  }, [fetchIdentities]);

  async function handleRevoke(identityId: string) {
    try {
      const res = await fetch(`/api/identities/${identityId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        return;
      }
      await fetchIdentities();
    } catch {
      // TODO: toast notification
    }
  }

  function typeBadge(type: string) {
    const cls = TYPE_BADGE_CLASSES[type] ?? "bg-gray-100 text-gray-800";
    const label = TYPE_LABELS[type] ?? type;
    return (
      <span
        className={`inline-flex rounded-full px-2 font-semibold text-xs leading-5 ${cls}`}
      >
        {label}
      </span>
    );
  }

  function statusBadge(status: string) {
    const cls = STATUS_BADGE_CLASSES[status] ?? "bg-gray-100 text-gray-800";
    return (
      <span
        className={`inline-flex rounded-full px-2 font-semibold text-xs leading-5 ${cls}`}
      >
        {status}
      </span>
    );
  }

  const filtered = identities.filter((identity) => {
    if (typeFilter !== "all" && identity.identityType !== typeFilter) {
      return false;
    }
    if (statusFilter !== "all" && identity.status !== statusFilter) {
      return false;
    }
    return true;
  });

  if (loading) {
    return <div className="p-8 text-gray-500">Loading identities...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 font-bold text-2xl text-gray-900">
          Identity Registry
        </h1>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <div>
            <label
              className="block font-medium text-gray-700 text-sm"
              htmlFor="identity-type-filter"
            >
              Type
            </label>
            <select
              className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              id="identity-type-filter"
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              value={typeFilter}
            >
              <option value="all">All Types</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="voice">Voice</option>
              <option value="service_account">Service Account</option>
            </select>
          </div>
          <div>
            <label
              className="block font-medium text-gray-700 text-sm"
              htmlFor="identity-status-filter"
            >
              Status
            </label>
            <select
              className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              id="identity-status-filter"
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              value={statusFilter}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>

        {/* Identities Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Identifier
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filtered.map((identity) => (
                <tr className="hover:bg-gray-50" key={identity.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {typeBadge(identity.identityType)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-900 text-sm">
                    {identity.provider}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-900 text-sm">
                    {identity.identifier}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-gray-500 text-sm">
                    {identity.agentId.slice(0, 8)}...
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {statusBadge(identity.status)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                    {new Date(identity.createdAt).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {identity.status === "active" && (
                      <button
                        className="rounded bg-red-600 px-3 py-1 font-medium text-white text-xs hover:bg-red-700"
                        onClick={() => handleRevoke(identity.id)}
                        type="button"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    className="px-6 py-12 text-center text-gray-500 text-sm"
                    colSpan={7}
                  >
                    No identities found.
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
