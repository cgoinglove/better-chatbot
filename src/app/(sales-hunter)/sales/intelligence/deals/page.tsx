"use client";

import { useState, useEffect } from "react";

interface DealAnalysis {
  id: string;
  leadId: string;
  outcome: string;
  dealValue: string;
  salesCycleLength: number;
  competitorInvolved: string | null;
  winLossReasons: string[];
  stageProgression: Array<{
    stage: string;
    enteredAt: string;
    durationDays: number;
  }>;
  keyFactors: Array<{
    factor: string;
    impact: string;
    weight: number;
    description: string;
  }>;
  lessonsLearned: string[];
  recommendations: string[];
  analyzedAt: string;
  createdAt: string;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<DealAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<DealAnalysis | null>(null);
  const [form, setForm] = useState({
    leadId: "",
    outcome: "won" as string,
    dealValue: "50000",
    salesCycleLength: "45",
    competitorInvolved: "",
    winLossReasons: "",
  });

  useEffect(() => {
    fetch("/api/sales-hunter/intelligence/deals")
      .then((r) => r.json())
      .then((d) => setDeals(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function analyzeDeal() {
    const reasons = form.winLossReasons
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    const res = await fetch("/api/sales-hunter/intelligence/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: form.leadId,
        outcome: form.outcome,
        dealValue: Number(form.dealValue),
        salesCycleLength: Number(form.salesCycleLength),
        competitorInvolved: form.competitorInvolved || null,
        winLossReasons: reasons,
      }),
    });
    const data = await res.json();
    if (data.data) {
      setDeals((prev) => [data.data, ...prev]);
      setSelected(data.data);
      setShowForm(false);
    }
  }

  const outcomeColors: Record<string, string> = {
    won: "bg-green-900 text-green-300",
    lost: "bg-red-900 text-red-300",
    "no-decision": "bg-zinc-700 text-zinc-300",
    disqualified: "bg-yellow-900 text-yellow-300",
  };

  const impactColors: Record<string, string> = {
    positive: "text-green-400",
    negative: "text-red-400",
    neutral: "text-zinc-400",
  };

  // Portfolio summary
  const wonDeals = deals.filter((d) => d.outcome === "won");
  const lostDeals = deals.filter((d) => d.outcome === "lost");
  const winRate =
    deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;
  const avgDealSize =
    wonDeals.length > 0
      ? Math.round(
          wonDeals.reduce((s, d) => s + Number(d.dealValue), 0) /
            wonDeals.length,
        )
      : 0;
  const avgCycle =
    deals.length > 0
      ? Math.round(
          deals.reduce((s, d) => s + d.salesCycleLength, 0) / deals.length,
        )
      : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Win/Loss Analysis
          </h1>
          <p className="text-zinc-400 mt-1">
            Analyze deal outcomes to improve win rates
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
        >
          Analyze Deal
        </button>
      </div>

      {/* Portfolio Summary */}
      {deals.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <p className="text-xs text-zinc-500">Win Rate</p>
            <p className="text-2xl font-bold text-zinc-100">{winRate}%</p>
            <p className="text-xs text-zinc-500">
              {wonDeals.length}W / {lostDeals.length}L / {deals.length}T
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <p className="text-xs text-zinc-500">Avg Deal Size</p>
            <p className="text-2xl font-bold text-zinc-100">
              ${avgDealSize.toLocaleString()}
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <p className="text-xs text-zinc-500">Avg Sales Cycle</p>
            <p className="text-2xl font-bold text-zinc-100">{avgCycle} days</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <p className="text-xs text-zinc-500">Total Deals</p>
            <p className="text-2xl font-bold text-zinc-100">{deals.length}</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">
            Analyze Deal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Lead ID
              </label>
              <input
                value={form.leadId}
                onChange={(e) => setForm({ ...form, leadId: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
                placeholder="UUID"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Outcome
              </label>
              <select
                value={form.outcome}
                onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
              >
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="no-decision">No Decision</option>
                <option value="disqualified">Disqualified</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Deal Value ($)
              </label>
              <input
                type="number"
                value={form.dealValue}
                onChange={(e) =>
                  setForm({ ...form, dealValue: e.target.value })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Sales Cycle (days)
              </label>
              <input
                type="number"
                value={form.salesCycleLength}
                onChange={(e) =>
                  setForm({ ...form, salesCycleLength: e.target.value })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Competitor
              </label>
              <input
                value={form.competitorInvolved}
                onChange={(e) =>
                  setForm({ ...form, competitorInvolved: e.target.value })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Win/Loss Reasons (comma-separated)
              </label>
              <input
                value={form.winLossReasons}
                onChange={(e) =>
                  setForm({ ...form, winLossReasons: e.target.value })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
                placeholder="Better pricing, Strong relationship"
              />
            </div>
          </div>
          <button
            onClick={analyzeDeal}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
          >
            Analyze
          </button>
        </div>
      )}

      {selected && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-zinc-100">
                Deal Analysis
              </h3>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${outcomeColors[selected.outcome] || ""}`}
              >
                {selected.outcome.toUpperCase()}
              </span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-zinc-500 hover:text-zinc-300 text-sm"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-zinc-500">Deal Value</p>
              <p className="text-lg font-bold text-zinc-100">
                ${Number(selected.dealValue).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Sales Cycle</p>
              <p className="text-lg font-bold text-zinc-100">
                {selected.salesCycleLength} days
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Competitor</p>
              <p className="text-lg font-bold text-zinc-100">
                {selected.competitorInvolved || "None"}
              </p>
            </div>
          </div>
          {selected.keyFactors.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-zinc-300 mb-2">
                Key Factors
              </h4>
              {selected.keyFactors.map((f, i) => (
                <div key={i} className="flex items-start gap-2 mb-2">
                  <span className={`text-sm ${impactColors[f.impact]}`}>
                    {f.impact === "positive"
                      ? "+"
                      : f.impact === "negative"
                        ? "-"
                        : "~"}
                  </span>
                  <div>
                    <span className="text-sm font-medium text-zinc-100">
                      {f.factor}
                    </span>
                    <span className="text-xs text-zinc-500 ml-2">
                      (weight: {f.weight})
                    </span>
                    <p className="text-xs text-zinc-400">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {selected.lessonsLearned.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-zinc-300 mb-2">
                Lessons Learned
              </h4>
              <ul className="space-y-1">
                {selected.lessonsLearned.map((l, i) => (
                  <li key={i} className="text-sm text-zinc-400">
                    - {l}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selected.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-2">
                Recommendations
              </h4>
              <ul className="space-y-1">
                {selected.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-blue-400">
                    - {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : deals.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          No deal analyses yet. Analyze a deal to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((d) => (
            <div
              key={d.id}
              onClick={() => setSelected(d)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${outcomeColors[d.outcome] || ""}`}
                  >
                    {d.outcome}
                  </span>
                  <span className="text-zinc-100 font-medium">
                    ${Number(d.dealValue).toLocaleString()}
                  </span>
                  <span className="text-zinc-500 text-sm">
                    {d.salesCycleLength} days
                  </span>
                  {d.competitorInvolved && (
                    <span className="text-zinc-500 text-sm">
                      vs {d.competitorInvolved}
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500">
                  {new Date(d.createdAt).toLocaleDateString()}
                </span>
              </div>
              {d.winLossReasons.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {d.winLossReasons.slice(0, 3).map((r, i) => (
                    <span
                      key={i}
                      className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
