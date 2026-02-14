"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { Lead, LeadStatus, LeadSource } from "app-types/platform";

type LeadsResponse = {
  leads: Lead[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
};

const ALL_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
  "disqualified",
];

const ALL_SOURCES: LeadSource[] = [
  "salesforce",
  "hubspot",
  "manual",
  "csv-import",
  "ai-prospected",
  "web-form",
  "referral",
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-500/20 text-blue-400",
  contacted: "bg-cyan-500/20 text-cyan-400",
  qualified: "bg-emerald-500/20 text-emerald-400",
  proposal: "bg-amber-500/20 text-amber-400",
  negotiation: "bg-orange-500/20 text-orange-400",
  won: "bg-green-500/20 text-green-400",
  lost: "bg-red-500/20 text-red-400",
  disqualified: "bg-zinc-500/20 text-zinc-400",
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-500">--</span>;
  let colorClass = "bg-red-500/20 text-red-400";
  if (score >= 70) colorClass = "bg-emerald-500/20 text-emerald-400";
  else if (score >= 30) colorClass = "bg-amber-500/20 text-amber-400";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {score}
    </span>
  );
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type NewLeadForm = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  source: LeadSource;
  estimatedValue: string;
};

const emptyLeadForm: NewLeadForm = {
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  source: "manual",
  estimatedValue: "",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLead, setNewLead] = useState<NewLeadForm>(emptyLeadForm);
  const [submitting, setSubmitting] = useState(false);
  const limit = 25;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (sourceFilter) params.set("source", sourceFilter);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/sales-hunter/leads?${params.toString()}`);
      const data: LeadsResponse = await res.json();
      setLeads(data.leads);
      setHasMore(data.pagination.hasMore);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, search, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        firstName: newLead.firstName,
        lastName: newLead.lastName,
        source: newLead.source,
      };
      if (newLead.email) body.email = newLead.email;
      if (newLead.company) body.company = newLead.company;
      if (newLead.estimatedValue)
        body.estimatedValue = Number(newLead.estimatedValue);

      const res = await fetch("/api/sales-hunter/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setNewLead(emptyLeadForm);
        setShowAddForm(false);
        fetchLeads();
      }
    } catch (error) {
      console.error("Failed to create lead:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      await fetch(`/api/sales-hunter/leads/${id}`, { method: "DELETE" });
      fetchLeads();
    } catch (error) {
      console.error("Failed to delete lead:", error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Sources</option>
          {ALL_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ")}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search leads..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />

        <div className="flex-1" />

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          {showAddForm ? "Cancel" : "Add Lead"}
        </button>
      </div>

      {/* Add Lead Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddLead}
          className="rounded-lg border border-zinc-800 bg-zinc-900 p-6"
        >
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">
            New Lead
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={newLead.firstName}
                onChange={(e) =>
                  setNewLead({ ...newLead, firstName: e.target.value })
                }
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={newLead.lastName}
                onChange={(e) =>
                  setNewLead({ ...newLead, lastName: e.target.value })
                }
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Email</label>
              <input
                type="email"
                value={newLead.email}
                onChange={(e) =>
                  setNewLead({ ...newLead, email: e.target.value })
                }
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Company
              </label>
              <input
                type="text"
                value={newLead.company}
                onChange={(e) =>
                  setNewLead({ ...newLead, company: e.target.value })
                }
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Source *
              </label>
              <select
                value={newLead.source}
                onChange={(e) =>
                  setNewLead({
                    ...newLead,
                    source: e.target.value as LeadSource,
                  })
                }
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ALL_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s
                      .split("-")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Estimated Value ($)
              </label>
              <input
                type="number"
                min="0"
                value={newLead.estimatedValue}
                onChange={(e) =>
                  setNewLead({ ...newLead, estimatedValue: e.target.value })
                }
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              {submitting ? "Creating..." : "Create Lead"}
            </button>
          </div>
        </form>
      )}

      {/* Leads Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900">
        {loading ? (
          <div className="p-8 text-center text-zinc-400">
            Loading leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            No leads found. Try adjusting your filters or add a new lead.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Company</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Score</th>
                  <th className="px-4 py-3 text-right font-medium">Value</th>
                  <th className="px-4 py-3 text-left font-medium">Source</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-100">
                      {lead.firstName} {lead.lastName}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {lead.company || "--"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {lead.email || "--"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[lead.status]}`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={lead.score} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {lead.estimatedValue
                        ? formatCurrency(lead.estimatedValue)
                        : "--"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 capitalize">
                      {lead.source.replace(/-/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && leads.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-sm text-zinc-500">Page {page}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-md border border-zinc-700 bg-zinc-800 text-sm text-zinc-300 disabled:opacity-50 hover:bg-zinc-700 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="px-3 py-1 rounded-md border border-zinc-700 bg-zinc-800 text-sm text-zinc-300 disabled:opacity-50 hover:bg-zinc-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
