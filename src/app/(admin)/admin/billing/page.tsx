"use client";

import { useState, useEffect } from "react";

type Subscription = {
  id: string;
  tenantId: string;
  tenantName: string;
  clerkSubscriptionId: string;
  plan: "starter" | "professional" | "enterprise";
  status: "active" | "past_due" | "canceled" | "trialing" | "incomplete";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  past_due: "bg-red-500/10 text-red-400",
  canceled: "bg-zinc-500/10 text-zinc-400",
  trialing: "bg-blue-500/10 text-blue-400",
  incomplete: "bg-yellow-500/10 text-yellow-400",
};

const PLAN_STYLES: Record<string, string> = {
  starter: "bg-zinc-500/10 text-zinc-300",
  professional: "bg-blue-500/10 text-blue-400",
  enterprise: "bg-purple-500/10 text-purple-400",
};

export default function AdminBillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBilling() {
      try {
        const res = await fetch("/api/admin/billing");
        if (!res.ok) throw new Error("Failed to fetch billing data");
        const data = await res.json();
        setSubscriptions(data.subscriptions);
      } catch (err: any) {
        setError(err.message || "Failed to load billing data");
      } finally {
        setLoading(false);
      }
    }
    fetchBilling();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Computed stats
  const activeSubs = subscriptions.filter((s) => s.status === "active").length;
  const pastDueSubs = subscriptions.filter(
    (s) => s.status === "past_due"
  ).length;
  const totalSubs = subscriptions.length;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-zinc-100">Billing</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Subscription and billing overview for all tenants
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <span className="text-sm font-medium text-zinc-400">
            Total Subscriptions
          </span>
          {loading ? (
            <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-3xl font-bold text-zinc-100 mt-2">
              {totalSubs}
            </p>
          )}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <span className="text-sm font-medium text-zinc-400">
            Active Subscriptions
          </span>
          {loading ? (
            <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-3xl font-bold text-green-400 mt-2">
              {activeSubs}
            </p>
          )}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <span className="text-sm font-medium text-zinc-400">Past Due</span>
          {loading ? (
            <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-3xl font-bold text-red-400 mt-2">
              {pastDueSubs}
            </p>
          )}
        </div>
      </div>

      {/* Subscriptions table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Plan
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Period
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-zinc-500"
                  >
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-zinc-100">
                          {sub.tenantName}
                        </p>
                        <p className="text-xs text-zinc-500 font-mono">
                          {sub.tenantId.substring(0, 8)}...
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${PLAN_STYLES[sub.plan] || ""}`}
                      >
                        {sub.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[sub.status] || ""}`}
                      >
                        {sub.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {formatDate(sub.currentPeriodStart)} -{" "}
                      {formatDate(sub.currentPeriodEnd)}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
