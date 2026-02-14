"use client";

import { useState, useEffect, useCallback } from "react";

const ACTION_OPTIONS = [
  "",
  "user.login",
  "user.logout",
  "agent.chat",
  "agent.create",
  "agent.update",
  "agent.delete",
  "connector.sync",
  "connector.create",
  "connector.update",
  "lead.create",
  "lead.update",
  "lead.score",
  "workflow.execute",
  "pipeline.run",
  "admin.user.update",
  "admin.tenant.update",
  "billing.subscription.create",
  "billing.subscription.update",
  "billing.payment.success",
  "billing.payment.failed",
] as const;

type Activity = {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [tenantId, setTenantId] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(
    async (page: number) => {
      if (!tenantId) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          tenantId,
          page: page.toString(),
          limit: "20",
        });
        if (action) params.set("action", action);

        const res = await fetch(`/api/admin/activity?${params}`);
        if (!res.ok) throw new Error("Failed to fetch activity logs");
        const data = await res.json();
        setActivities(data.activities);
        setPagination(data.pagination);
      } catch (err: any) {
        setError(err.message || "Failed to load activity logs");
      } finally {
        setLoading(false);
      }
    },
    [tenantId, action]
  );

  useEffect(() => {
    if (tenantId) {
      fetchActivities(1);
    }
  }, [fetchActivities, tenantId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-zinc-100">Activity Log</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Track user and system activity across the platform
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
            Action
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 w-56"
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.filter(Boolean).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!tenantId && (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-zinc-500">
            Enter a Tenant ID to view activity logs
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
          {error}
        </div>
      )}

      {tenantId && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : activities.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-sm text-zinc-500"
                    >
                      No activity logs found
                    </td>
                  </tr>
                ) : (
                  activities.map((activity) => (
                    <tr
                      key={activity.id}
                      className="hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-zinc-400 whitespace-nowrap">
                        {formatDate(activity.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-300 font-mono">
                        {activity.userId
                          ? activity.userId.substring(0, 8) + "..."
                          : "System"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300">
                          {activity.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">
                        {activity.resourceType}
                        {activity.resourceId && (
                          <span className="text-zinc-600 ml-1">
                            #{activity.resourceId.substring(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500 max-w-xs truncate">
                        {activity.ipAddress && (
                          <span className="font-mono text-xs">
                            {activity.ipAddress}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-400">
                Showing{" "}
                {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.total
                )}{" "}
                of {pagination.total} entries
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchActivities(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 text-sm rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-zinc-400">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchActivities(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 text-sm rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
