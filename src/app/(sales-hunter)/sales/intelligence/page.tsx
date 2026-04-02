"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardCounts {
  activeAlerts: number;
  recentBriefs: {
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
  }[];
  activeWorkflows: number;
  buyingSignals: number;
  customerHealth: { healthy: number; atRisk: number; churning: number };
}

export default function IntelligenceHubPage() {
  const [data, setData] = useState<DashboardCounts>({
    activeAlerts: 0,
    recentBriefs: [],
    activeWorkflows: 0,
    buyingSignals: 0,
    customerHealth: { healthy: 0, atRisk: 0, churning: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [alertsRes, briefsRes, workflowsRes, signalsRes, healthRes] =
          await Promise.all([
            fetch(
              "/api/sales-hunter/intelligence/alerts?status=active&limit=1",
            ),
            fetch("/api/sales-hunter/intelligence/briefs?limit=5"),
            fetch("/api/sales-hunter/intelligence/workflows?status=active"),
            fetch("/api/sales-hunter/intelligence/signals?limit=1"),
            fetch("/api/sales-hunter/intelligence/health"),
          ]);

        const alertsData = alertsRes.ok ? await alertsRes.json() : { total: 0 };
        const briefsData = briefsRes.ok
          ? await briefsRes.json()
          : { briefs: [] };
        const workflowsData = workflowsRes.ok
          ? await workflowsRes.json()
          : { total: 0 };
        const signalsData = signalsRes.ok
          ? await signalsRes.json()
          : { total: 0 };
        const healthData = healthRes.ok
          ? await healthRes.json()
          : { summary: { healthy: 0, atRisk: 0, churning: 0 } };

        setData({
          activeAlerts: alertsData.total ?? alertsData.alerts?.length ?? 0,
          recentBriefs: briefsData.briefs ?? [],
          activeWorkflows:
            workflowsData.total ?? workflowsData.workflows?.length ?? 0,
          buyingSignals: signalsData.total ?? signalsData.signals?.length ?? 0,
          customerHealth: healthData.summary ?? {
            healthy: 0,
            atRisk: 0,
            churning: 0,
          },
        });
      } catch (error) {
        console.error("Failed to load intelligence dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  const quickActions = [
    {
      label: "Generate Brief",
      href: "/sales/intelligence/briefs",
      description: "Create a sales brief for a prospect",
    },
    {
      label: "Run Workflow",
      href: "/sales/intelligence/workflows",
      description: "Execute a research workflow",
    },
    {
      label: "Evaluate Alerts",
      href: "/sales/intelligence/alerts",
      description: "Review and triage active alerts",
    },
    {
      label: "Detect Signals",
      href: "/sales/intelligence/signals",
      description: "Scan for buying signals",
    },
    {
      label: "Compliance Calc",
      href: "/sales/intelligence/compliance",
      description: "Calculate compliance burden",
    },
    {
      label: "Generate Outreach",
      href: "/sales/intelligence/outreach",
      description: "Create outreach sequences",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Intelligence Hub</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Sales intelligence overview and quick actions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-1">
            Active Alerts
          </h3>
          <p className="text-3xl font-bold text-zinc-100">
            {data.activeAlerts}
          </p>
          <Link
            href="/sales/intelligence/alerts"
            className="text-sm text-blue-400 mt-2 inline-block hover:text-blue-300"
          >
            View all &rarr;
          </Link>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-1">
            Active Workflows
          </h3>
          <p className="text-3xl font-bold text-zinc-100">
            {data.activeWorkflows}
          </p>
          <Link
            href="/sales/intelligence/workflows"
            className="text-sm text-blue-400 mt-2 inline-block hover:text-blue-300"
          >
            View all &rarr;
          </Link>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-1">
            Buying Signals
          </h3>
          <p className="text-3xl font-bold text-zinc-100">
            {data.buyingSignals}
          </p>
          <Link
            href="/sales/intelligence/signals"
            className="text-sm text-blue-400 mt-2 inline-block hover:text-blue-300"
          >
            View all &rarr;
          </Link>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-1">
            Customer Health
          </h3>
          <div className="flex items-baseline gap-4 mt-2">
            <div>
              <span className="text-2xl font-bold text-green-400">
                {data.customerHealth.healthy}
              </span>
              <span className="text-xs text-zinc-500 ml-1">healthy</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-yellow-400">
                {data.customerHealth.atRisk}
              </span>
              <span className="text-xs text-zinc-500 ml-1">at risk</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-red-400">
                {data.customerHealth.churning}
              </span>
              <span className="text-xs text-zinc-500 ml-1">churning</span>
            </div>
          </div>
          <Link
            href="/sales/intelligence/health"
            className="text-sm text-blue-400 mt-2 inline-block hover:text-blue-300"
          >
            View all &rarr;
          </Link>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-1">Playbooks</h3>
          <p className="text-sm text-zinc-300 mt-2">
            Battle cards, objection handlers, and discovery guides
          </p>
          <Link
            href="/sales/intelligence/playbooks"
            className="text-sm text-blue-400 mt-2 inline-block hover:text-blue-300"
          >
            Browse &rarr;
          </Link>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-1">
            Win/Loss Analysis
          </h3>
          <p className="text-sm text-zinc-300 mt-2">
            Deal analysis, patterns, and recommendations
          </p>
          <Link
            href="/sales/intelligence/deals"
            className="text-sm text-blue-400 mt-2 inline-block hover:text-blue-300"
          >
            Analyze &rarr;
          </Link>
        </div>
      </div>

      {/* Recent Briefs */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Recent Briefs</h2>
          <Link
            href="/sales/intelligence/briefs"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            View all &rarr;
          </Link>
        </div>
        {data.recentBriefs.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No briefs yet. Generate your first brief to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-3 text-left font-medium">Title</th>
                  <th className="pb-3 text-left font-medium">Type</th>
                  <th className="pb-3 text-left font-medium">Status</th>
                  <th className="pb-3 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.recentBriefs.map((brief) => (
                  <tr key={brief.id} className="text-zinc-300">
                    <td className="py-3 font-medium text-zinc-100">
                      {brief.title}
                    </td>
                    <td className="py-3 text-zinc-400 capitalize">
                      {brief.type}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          brief.status === "completed"
                            ? "bg-green-500/20 text-green-400"
                            : brief.status === "generating"
                              ? "bg-blue-500/20 text-blue-400"
                              : brief.status === "failed"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {brief.status}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-500">
                      {new Date(brief.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-blue-600 transition-colors group"
            >
              <h3 className="text-sm font-medium text-zinc-100 group-hover:text-blue-400 transition-colors">
                {action.label}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
