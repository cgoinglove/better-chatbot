"use client";

import { useCallback, useEffect, useState } from "react";

interface Alert {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "active" | "acknowledged" | "dismissed" | "resolved";
  createdAt: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-500/20 text-blue-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-red-500/20 text-red-400",
};

const SEVERITY_BORDER: Record<string, string> = {
  low: "border-l-blue-500",
  medium: "border-l-yellow-500",
  high: "border-l-orange-500",
  critical: "border-l-red-500",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  acknowledged: "bg-blue-500/20 text-blue-400",
  dismissed: "bg-zinc-500/20 text-zinc-400",
  resolved: "bg-emerald-500/20 text-emerald-400",
};

type FilterTab = "all" | "active" | "high-critical" | "acknowledged";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [evaluating, setEvaluating] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "active") params.set("status", "active");
      if (filter === "acknowledged") params.set("status", "acknowledged");
      if (filter === "high-critical") params.set("severity", "high,critical");

      const res = await fetch(
        `/api/sales-hunter/intelligence/alerts?${params.toString()}`,
      );
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  async function handleAction(
    alertId: string,
    action: "acknowledge" | "dismiss",
  ) {
    try {
      await fetch(`/api/sales-hunter/intelligence/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action === "acknowledge" ? "acknowledged" : "dismissed",
        }),
      });
      fetchAlerts();
    } catch (error) {
      console.error(`Failed to ${action} alert:`, error);
    }
  }

  async function handleEvaluateRules() {
    setEvaluating(true);
    try {
      await fetch("/api/sales-hunter/intelligence/alerts/evaluate", {
        method: "POST",
      });
      fetchAlerts();
    } catch (error) {
      console.error("Failed to evaluate rules:", error);
    } finally {
      setEvaluating(false);
    }
  }

  // Count by category
  const categoryCounts: Record<string, number> = {};
  for (const alert of alerts) {
    categoryCounts[alert.category] = (categoryCounts[alert.category] ?? 0) + 1;
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "high-critical", label: "High / Critical" },
    { key: "acknowledged", label: "Acknowledged" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Alerts</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Monitor and manage intelligence alerts
          </p>
        </div>
        <button
          onClick={handleEvaluateRules}
          disabled={evaluating}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          {evaluating ? "Evaluating..." : "Evaluate Rules"}
        </button>
      </div>

      {/* Category summary */}
      {Object.keys(categoryCounts).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(categoryCounts).map(([category, count]) => (
            <div
              key={category}
              className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2"
            >
              <span className="text-xs text-zinc-400 capitalize">
                {category.replace(/_/g, " ")}
              </span>
              <span className="text-sm font-semibold text-zinc-100 ml-2">
                {count}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === tab.key
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert Cards */}
      {loading ? (
        <div className="text-center text-zinc-400 py-8">Loading...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center text-zinc-500 py-8">
          No alerts match the current filter.
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-zinc-900 border border-zinc-800 rounded-lg p-5 border-l-4 ${SEVERITY_BORDER[alert.severity] ?? "border-l-zinc-500"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {alert.title}
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${SEVERITY_COLORS[alert.severity] ?? ""}`}
                    >
                      {alert.severity}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[alert.status] ?? ""}`}
                    >
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 capitalize">
                    {alert.category.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm text-zinc-400 mt-2">
                    {alert.description}
                  </p>
                  <p className="text-xs text-zinc-600 mt-2">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {alert.status === "active" && (
                    <>
                      <button
                        onClick={() => handleAction(alert.id, "acknowledge")}
                        className="px-3 py-1 rounded-md border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleAction(alert.id, "dismiss")}
                        className="px-3 py-1 rounded-md border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
