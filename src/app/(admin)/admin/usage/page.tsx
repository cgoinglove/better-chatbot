"use client";

import { useState, useEffect, useCallback } from "react";

type UsageSummary = {
  resourceType: string;
  totalQuantity: number;
};

const RESOURCE_LABELS: Record<string, { label: string; unit: string }> = {
  "ai-tokens": { label: "AI Tokens", unit: "tokens" },
  "ai-requests": { label: "AI Requests", unit: "requests" },
  "connector-sync": { label: "Connector Syncs", unit: "syncs" },
  "storage-bytes": { label: "Storage", unit: "bytes" },
  "workflow-execution": { label: "Workflow Executions", unit: "executions" },
  "api-call": { label: "API Calls", unit: "calls" },
};

function formatQuantity(type: string, qty: number): string {
  if (type === "storage-bytes") {
    if (qty >= 1024 * 1024 * 1024)
      return (qty / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    if (qty >= 1024 * 1024) return (qty / (1024 * 1024)).toFixed(1) + " MB";
    if (qty >= 1024) return (qty / 1024).toFixed(0) + " KB";
    return qty + " B";
  }
  return qty.toLocaleString();
}

export default function AdminUsagePage() {
  const [usage, setUsage] = useState<UsageSummary[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  });
  const [periodEnd, setPeriodEnd] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        tenantId,
        periodStart,
        periodEnd,
      });

      const res = await fetch(`/api/admin/usage?${params}`);
      if (!res.ok) throw new Error("Failed to fetch usage data");
      const data = await res.json();
      setUsage(data.usage);
    } catch (err: any) {
      setError(err.message || "Failed to load usage data");
    } finally {
      setLoading(false);
    }
  }, [tenantId, periodStart, periodEnd]);

  useEffect(() => {
    if (tenantId) {
      fetchUsage();
    }
  }, [fetchUsage, tenantId]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-zinc-100">
          Usage Analytics
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Monitor resource consumption across the platform
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Tenant ID
          </label>
          <input
            type="text"
            placeholder="Enter tenant ID..."
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 w-72"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Period Start
          </label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Period End
          </label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
          />
        </div>
        <button
          onClick={fetchUsage}
          disabled={!tenantId || loading}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {!tenantId && (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-zinc-500">
            Enter a Tenant ID to view usage analytics
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
          {error}
        </div>
      )}

      {tenantId && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(RESOURCE_LABELS).map(([type, meta]) => {
            const record = usage.find((u) => u.resourceType === type);
            const quantity = record?.totalQuantity ?? 0;

            return (
              <div
                key={type}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-zinc-400">
                    {meta.label}
                  </span>
                  <span className="text-xs text-zinc-600">{meta.unit}</span>
                </div>
                <p className="text-3xl font-bold text-zinc-100">
                  {formatQuantity(type, quantity)}
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                  {periodStart} to {periodEnd}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {tenantId && loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
            >
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-4" />
              <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
