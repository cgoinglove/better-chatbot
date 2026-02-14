"use client";

import React, { useEffect, useState } from "react";
import type { Lead, LeadStatus } from "app-types/platform";

type PipelineData = {
  totalValue: number;
  byStatus: Record<LeadStatus, number>;
  leadCounts: Record<LeadStatus, number>;
};

type LeadsResponse = {
  leads: Lead[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-500",
  contacted: "bg-cyan-500",
  qualified: "bg-emerald-500",
  proposal: "bg-amber-500",
  negotiation: "bg-orange-500",
  won: "bg-green-500",
  lost: "bg-red-500",
  disqualified: "bg-zinc-500",
};

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

function StatusBadge({ status }: { status: LeadStatus }) {
  const colorMap: Record<LeadStatus, string> = {
    new: "bg-blue-500/20 text-blue-400",
    contacted: "bg-cyan-500/20 text-cyan-400",
    qualified: "bg-emerald-500/20 text-emerald-400",
    proposal: "bg-amber-500/20 text-amber-400",
    negotiation: "bg-orange-500/20 text-orange-400",
    won: "bg-green-500/20 text-green-400",
    lost: "bg-red-500/20 text-red-400",
    disqualified: "bg-zinc-500/20 text-zinc-400",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colorMap[status]}`}
    >
      {status}
    </span>
  );
}

export default function SalesDashboardPage() {
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pipelineRes, leadsRes] = await Promise.all([
          fetch("/api/sales-hunter/pipeline"),
          fetch("/api/sales-hunter/leads?limit=10"),
        ]);
        const pipelineData: PipelineData = await pipelineRes.json();
        const leadsData: LeadsResponse = await leadsRes.json();
        setPipeline(pipelineData);
        setLeads(leadsData.leads);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  const totalLeads = pipeline
    ? (Object.values(pipeline.leadCounts) as number[]).reduce((sum: number, c: number) => sum + c, 0)
    : 0;
  const wonCount = pipeline?.leadCounts.won ?? 0;
  const lostCount = pipeline?.leadCounts.lost ?? 0;
  const closedCount = wonCount + lostCount;
  const conversionRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0;
  const activeStatuses: LeadStatus[] = [
    "new",
    "contacted",
    "qualified",
    "proposal",
    "negotiation",
  ];
  const activeLeads = pipeline
    ? activeStatuses.reduce(
        (sum, s) => sum + (pipeline.leadCounts[s] ?? 0),
        0,
      )
    : 0;
  const winRate =
    activeLeads + closedCount > 0
      ? (wonCount / (activeLeads + closedCount)) * 100
      : 0;

  // Pipeline funnel data
  const funnelStatuses: LeadStatus[] = [
    "new",
    "contacted",
    "qualified",
    "proposal",
    "negotiation",
    "won",
  ];
  const maxCount = pipeline
    ? Math.max(
        ...funnelStatuses.map((s) => pipeline.leadCounts[s] ?? 0),
        1,
      )
    : 1;

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Pipeline Value</p>
          <p className="mt-2 text-3xl font-bold text-zinc-100">
            {formatCurrency(pipeline?.totalValue ?? 0)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Active deals</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Total Leads</p>
          <p className="mt-2 text-3xl font-bold text-zinc-100">{totalLeads}</p>
          <p className="mt-1 text-xs text-zinc-500">All time</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Conversion Rate</p>
          <p className="mt-2 text-3xl font-bold text-zinc-100">
            {conversionRate.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-zinc-500">Won / Closed</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Win Rate</p>
          <p className="mt-2 text-3xl font-bold text-zinc-100">
            {winRate.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-zinc-500">Won / All leads</p>
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-6">
          Pipeline Funnel
        </h2>
        <div className="space-y-3">
          {funnelStatuses.map((status) => {
            const count = pipeline?.leadCounts[status] ?? 0;
            const value = pipeline?.byStatus[status] ?? 0;
            const widthPercent = Math.max((count / maxCount) * 100, 4);
            return (
              <div key={status} className="flex items-center gap-4">
                <div className="w-28 text-sm text-zinc-400 text-right capitalize">
                  {STATUS_LABELS[status]}
                </div>
                <div className="flex-1">
                  <div className="relative h-8 bg-zinc-800 rounded">
                    <div
                      className={`absolute inset-y-0 left-0 rounded ${STATUS_COLORS[status]} opacity-80`}
                      style={{ width: `${widthPercent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-3 justify-between">
                      <span className="text-sm font-medium text-zinc-100 relative z-10">
                        {count} leads
                      </span>
                      <span className="text-xs text-zinc-300 relative z-10">
                        {formatCurrency(value)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads */}
        <div className="lg:col-span-2 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Recent Leads
          </h2>
          {leads.length === 0 ? (
            <p className="text-zinc-500 text-sm">No leads found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="pb-3 text-left font-medium">Name</th>
                    <th className="pb-3 text-left font-medium">Company</th>
                    <th className="pb-3 text-left font-medium">Status</th>
                    <th className="pb-3 text-left font-medium">Score</th>
                    <th className="pb-3 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="text-zinc-300">
                      <td className="py-3">
                        {lead.firstName} {lead.lastName}
                      </td>
                      <td className="py-3 text-zinc-400">
                        {lead.company || "--"}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="py-3">
                        <ScoreBadge score={lead.score} />
                      </td>
                      <td className="py-3 text-right">
                        {lead.estimatedValue
                          ? formatCurrency(lead.estimatedValue)
                          : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI Actions Summary */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            AI Actions
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-200">Lead Scoring</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  AI scores leads based on engagement signals and fit criteria
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-200">Email Outreach</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Generates personalized outreach emails for new leads
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-200">Pipeline Insights</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  AI analyzes pipeline health and recommends next actions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-200">Proposal Generation</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Creates draft proposals from lead data and past wins
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
