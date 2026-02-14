"use client";

import { useState, useEffect } from "react";

type Stats = {
  totalUsers: number;
  activeSessions: number;
  totalLeads: number;
  pipelineValue: number;
  aiRequestsThisMonth: number;
  totalConnectors: number;
};

const statCards: {
  key: keyof Stats;
  label: string;
  format?: (v: number) => string;
  icon: string;
}[] = [
  {
    key: "totalUsers",
    label: "Total Users",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    key: "activeSessions",
    label: "Active Sessions",
    icon: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    key: "totalLeads",
    label: "Total Leads",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    key: "pipelineValue",
    label: "Pipeline Value",
    format: (v) =>
      "$" + v.toLocaleString(undefined, { minimumFractionDigits: 0 }),
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    key: "aiRequestsThisMonth",
    label: "AI Requests (Month)",
    format: (v) => v.toLocaleString(),
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    key: "totalConnectors",
    label: "Total Connectors",
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setStats(data.stats);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard stats");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-blue-400 hover:text-blue-300"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-zinc-100">Overview</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Platform-wide statistics and metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <div
            key={card.key}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-zinc-400">
                {card.label}
              </span>
              <svg
                className="w-5 h-5 text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={card.icon}
                />
              </svg>
            </div>
            {loading || !stats ? (
              <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-zinc-100">
                {card.format
                  ? card.format(stats[card.key])
                  : stats[card.key].toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
