"use client";

import React, { useEffect, useState } from "react";
import type { Lead, LeadStatus } from "app-types/platform";

type LeadsResponse = {
  leads: Lead[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
};

const PIPELINE_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
];

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  disqualified: "Disqualified",
};

const STATUS_HEADER_COLORS: Record<string, string> = {
  new: "border-t-blue-500",
  contacted: "border-t-cyan-500",
  qualified: "border-t-emerald-500",
  proposal: "border-t-amber-500",
  negotiation: "border-t-orange-500",
  won: "border-t-green-500",
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-500 text-xs">--</span>;
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

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await fetch("/api/sales-hunter/leads?limit=100");
        const data: LeadsResponse = await res.json();
        setLeads(data.leads);
      } catch (error) {
        console.error("Failed to fetch pipeline leads:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, []);

  // Group leads by status
  const groupedLeads: Record<string, Lead[]> = {};
  for (const status of PIPELINE_STATUSES) {
    groupedLeads[status] = [];
  }
  for (const lead of leads) {
    if (groupedLeads[lead.status]) {
      groupedLeads[lead.status].push(lead);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-400">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-x-auto">
        <div className="inline-flex gap-4 min-w-full pb-4" style={{ minHeight: "calc(100vh - 200px)" }}>
          {PIPELINE_STATUSES.map((status) => {
            const columnLeads = groupedLeads[status] || [];
            const totalValue = columnLeads.reduce(
              (sum, l) => sum + (l.estimatedValue ?? 0),
              0,
            );

            return (
              <div
                key={status}
                className={`w-72 flex-shrink-0 flex flex-col rounded-lg border border-zinc-800 bg-zinc-900 border-t-2 ${STATUS_HEADER_COLORS[status] || "border-t-zinc-500"}`}
              >
                {/* Column Header */}
                <div className="px-4 py-3 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {STATUS_LABELS[status]}
                    </h3>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-xs font-medium text-zinc-300">
                      {columnLeads.length}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {formatCurrency(totalValue)}
                  </p>
                </div>

                {/* Column Cards */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {columnLeads.length === 0 ? (
                    <div className="flex items-center justify-center h-24 text-zinc-600 text-xs">
                      No leads
                    </div>
                  ) : (
                    columnLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="rounded-md border border-zinc-800 bg-zinc-950 p-3 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-100 truncate">
                              {lead.firstName} {lead.lastName}
                            </p>
                            {lead.company && (
                              <p className="text-xs text-zinc-500 mt-0.5 truncate">
                                {lead.company}
                              </p>
                            )}
                          </div>
                          <ScoreBadge score={lead.score} />
                        </div>
                        {lead.estimatedValue != null && (
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-zinc-400">
                              {formatCurrency(lead.estimatedValue)}
                            </span>
                            {lead.email && (
                              <span className="text-xs text-zinc-600 truncate max-w-[120px]">
                                {lead.email}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
