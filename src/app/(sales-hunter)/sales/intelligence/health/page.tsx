"use client";

import { useState, useEffect } from "react";

interface CustomerHealthRecord {
  id: string;
  leadId: string;
  healthScore: number;
  healthStatus: string;
  engagementScore: number;
  adoptionScore: number;
  sentimentScore: number;
  expansionProbability: string;
  churnRisk: string;
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    trend: string;
    detail: string;
  }>;
  expansionOpportunities: Array<{
    type: string;
    description: string;
    estimatedValue: number;
    probability: number;
    suggestedAction: string;
  }>;
  createdAt: string;
}

export default function CustomerHealthPage() {
  const [records, setRecords] = useState<CustomerHealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<CustomerHealthRecord | null>(null);
  const [form, setForm] = useState({
    leadId: "",
    lastContactDays: "7",
    meetingsLast90Days: "3",
    emailResponseRate: "0.6",
    supportTickets: "2",
    featureAdoption: "65",
    monthsRemaining: "8",
    contractValue: "50000",
    expansionDiscussed: false,
    competitorMentioned: false,
    activeUsers: "10",
    totalUsers: "15",
    usageTrend: "stable" as string,
    keyFeatureUsage: "55",
  });

  useEffect(() => {
    fetch("/api/sales-hunter/intelligence/health")
      .then((r) => r.json())
      .then((d) => setRecords(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function assessHealth() {
    const res = await fetch("/api/sales-hunter/intelligence/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: form.leadId,
        engagement: {
          lastContactDays: Number(form.lastContactDays),
          meetingsLast90Days: Number(form.meetingsLast90Days),
          emailResponseRate: Number(form.emailResponseRate),
          supportTickets: Number(form.supportTickets),
          featureAdoption: Number(form.featureAdoption),
        },
        contract: {
          monthsRemaining: Number(form.monthsRemaining),
          contractValue: Number(form.contractValue),
          expansionDiscussed: form.expansionDiscussed,
          competitorMentioned: form.competitorMentioned,
        },
        usage: {
          activeUsers: Number(form.activeUsers),
          totalUsers: Number(form.totalUsers),
          usageTrend: form.usageTrend,
          keyFeatureUsage: Number(form.keyFeatureUsage),
        },
      }),
    });
    const data = await res.json();
    if (data.data) {
      setRecords((prev) => [data.data, ...prev]);
      setSelected(data.data);
      setShowForm(false);
    }
  }

  const statusColors: Record<string, string> = {
    healthy: "bg-green-900 text-green-300 border-green-700",
    expanding: "bg-blue-900 text-blue-300 border-blue-700",
    "at-risk": "bg-yellow-900 text-yellow-300 border-yellow-700",
    churning: "bg-red-900 text-red-300 border-red-700",
  };

  const trendIcons: Record<string, string> = {
    improving: "\u2191",
    stable: "\u2192",
    declining: "\u2193",
  };
  const trendColors: Record<string, string> = {
    improving: "text-green-400",
    stable: "text-zinc-400",
    declining: "text-red-400",
  };

  function scoreColor(score: number): string {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Customer Health</h1>
          <p className="text-zinc-400 mt-1">
            Monitor customer health and identify expansion opportunities
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
        >
          Assess Health
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">
            Customer Health Assessment
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Lead ID
              </label>
              <input
                value={form.leadId}
                onChange={(e) => setForm({ ...form, leadId: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
                placeholder="UUID of the lead/customer"
              />
            </div>
            <h4 className="text-sm font-semibold text-zinc-300 mt-4">
              Engagement
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Last Contact (days)
                </label>
                <input
                  type="number"
                  value={form.lastContactDays}
                  onChange={(e) =>
                    setForm({ ...form, lastContactDays: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Meetings (90d)
                </label>
                <input
                  type="number"
                  value={form.meetingsLast90Days}
                  onChange={(e) =>
                    setForm({ ...form, meetingsLast90Days: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Email Response Rate
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.emailResponseRate}
                  onChange={(e) =>
                    setForm({ ...form, emailResponseRate: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Support Tickets
                </label>
                <input
                  type="number"
                  value={form.supportTickets}
                  onChange={(e) =>
                    setForm({ ...form, supportTickets: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Feature Adoption %
                </label>
                <input
                  type="number"
                  value={form.featureAdoption}
                  onChange={(e) =>
                    setForm({ ...form, featureAdoption: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-100 text-sm"
                />
              </div>
            </div>
            <h4 className="text-sm font-semibold text-zinc-300 mt-4">
              Contract
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Months Remaining
                </label>
                <input
                  type="number"
                  value={form.monthsRemaining}
                  onChange={(e) =>
                    setForm({ ...form, monthsRemaining: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Contract Value ($)
                </label>
                <input
                  type="number"
                  value={form.contractValue}
                  onChange={(e) =>
                    setForm({ ...form, contractValue: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-100 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.expansionDiscussed}
                  onChange={(e) =>
                    setForm({ ...form, expansionDiscussed: e.target.checked })
                  }
                  className="rounded bg-zinc-800 border-zinc-600"
                />
                Expansion Discussed
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.competitorMentioned}
                  onChange={(e) =>
                    setForm({ ...form, competitorMentioned: e.target.checked })
                  }
                  className="rounded bg-zinc-800 border-zinc-600"
                />
                Competitor Mentioned
              </label>
            </div>
            <h4 className="text-sm font-semibold text-zinc-300 mt-4">Usage</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Active Users
                </label>
                <input
                  type="number"
                  value={form.activeUsers}
                  onChange={(e) =>
                    setForm({ ...form, activeUsers: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Total Users
                </label>
                <input
                  type="number"
                  value={form.totalUsers}
                  onChange={(e) =>
                    setForm({ ...form, totalUsers: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Usage Trend
                </label>
                <select
                  value={form.usageTrend}
                  onChange={(e) =>
                    setForm({ ...form, usageTrend: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-100 text-sm"
                >
                  <option value="increasing">Increasing</option>
                  <option value="stable">Stable</option>
                  <option value="decreasing">Decreasing</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Key Feature Usage %
                </label>
                <input
                  type="number"
                  value={form.keyFeatureUsage}
                  onChange={(e) =>
                    setForm({ ...form, keyFeatureUsage: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-100 text-sm"
                />
              </div>
            </div>
          </div>
          <button
            onClick={assessHealth}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
          >
            Run Assessment
          </button>
        </div>
      )}

      {selected && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-100">
              Health Assessment Details
            </h3>
            <button
              onClick={() => setSelected(null)}
              className="text-zinc-500 hover:text-zinc-300 text-sm"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center">
              <p className="text-xs text-zinc-500">Health Score</p>
              <p
                className={`text-2xl font-bold ${scoreColor(selected.healthScore)}`}
              >
                {selected.healthScore}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500">Engagement</p>
              <p
                className={`text-2xl font-bold ${scoreColor(selected.engagementScore)}`}
              >
                {selected.engagementScore}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500">Adoption</p>
              <p
                className={`text-2xl font-bold ${scoreColor(selected.adoptionScore)}`}
              >
                {selected.adoptionScore}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500">Churn Risk</p>
              <p className="text-2xl font-bold text-zinc-100">
                {Number(selected.churnRisk).toFixed(0)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500">Expansion Prob</p>
              <p className="text-2xl font-bold text-zinc-100">
                {Number(selected.expansionProbability).toFixed(0)}%
              </p>
            </div>
          </div>
          {selected.factors.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-zinc-300 mb-2">
                Health Factors
              </h4>
              <div className="space-y-2">
                {selected.factors.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className={`text-lg ${trendColors[f.trend] || "text-zinc-400"}`}
                    >
                      {trendIcons[f.trend] || "-"}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-100">{f.name}</span>
                        <span
                          className={`text-sm font-medium ${scoreColor(f.score)}`}
                        >
                          {f.score}/100
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${f.score}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{f.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selected.expansionOpportunities.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-2">
                Expansion Opportunities
              </h4>
              {selected.expansionOpportunities.map((o, i) => (
                <div key={i} className="bg-zinc-800 rounded p-3 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-zinc-100">
                      {o.type}
                    </span>
                    <span className="text-sm text-green-400">
                      ${o.estimatedValue.toLocaleString()} ({o.probability}%)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">{o.description}</p>
                  <p className="text-xs text-blue-400 mt-1">
                    {o.suggestedAction}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          No health assessments yet. Run an assessment to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              className={`border rounded-lg p-4 cursor-pointer hover:border-zinc-600 ${statusColors[r.healthStatus] || "bg-zinc-900 border-zinc-800"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-3xl font-bold ${scoreColor(r.healthScore)}`}
                >
                  {r.healthScore}
                </span>
                <span className="text-xs font-medium uppercase">
                  {r.healthStatus}
                </span>
              </div>
              <p className="text-xs opacity-70">
                Lead: {r.leadId.slice(0, 8)}...
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
