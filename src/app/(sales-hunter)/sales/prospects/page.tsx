"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Prospect, ProspectStatus } from "app-types/prospecting";

const ALL_STATUSES: ProspectStatus[] = [
  "identified",
  "researching",
  "enriched",
  "qualified",
  "converted-to-lead",
  "disqualified",
  "stale",
];

const STATUS_COLORS: Record<ProspectStatus, string> = {
  identified: "bg-blue-500/20 text-blue-400",
  researching: "bg-cyan-500/20 text-cyan-400",
  enriched: "bg-emerald-500/20 text-emerald-400",
  qualified: "bg-green-500/20 text-green-400",
  "converted-to-lead": "bg-purple-500/20 text-purple-400",
  disqualified: "bg-red-500/20 text-red-400",
  stale: "bg-zinc-500/20 text-zinc-400",
};

const STATUS_LABELS: Record<ProspectStatus, string> = {
  identified: "Identified",
  researching: "Researching",
  enriched: "Enriched",
  qualified: "Qualified",
  "converted-to-lead": "Converted",
  disqualified: "Disqualified",
  stale: "Stale",
};

function ScoreBadge({ score, label }: { score: number | null; label: string }) {
  if (score === null) return <span className="text-zinc-500">--</span>;
  let colorClass = "bg-red-500/20 text-red-400";
  if (score >= 70) colorClass = "bg-emerald-500/20 text-emerald-400";
  else if (score >= 40) colorClass = "bg-amber-500/20 text-amber-400";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
      title={label}
    >
      {score}
    </span>
  );
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [industryFilter, setIndustryFilter] = useState<string>("");
  const [minFitScore, setMinFitScore] = useState<string>("");
  const [minIntentScore, setMinIntentScore] = useState<string>("");
  const [page, setPage] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const limit = 25;

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (industryFilter) params.set("industry", industryFilter);
      if (minFitScore) params.set("minFitScore", minFitScore);
      if (minIntentScore) params.set("minIntentScore", minIntentScore);
      params.set("limit", String(limit));
      params.set("offset", String((page - 1) * limit));

      const res = await fetch(
        `/api/sales-hunter/prospects?${params.toString()}`,
      );
      const data = await res.json();
      setProspects(Array.isArray(data) ? data : (data.data ?? []));
    } catch (error) {
      console.error("Failed to fetch prospects:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, industryFilter, minFitScore, minIntentScore, page]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/sales-hunter/prospects/counts");
      const data = await res.json();
      setStatusCounts(data ?? {});
    } catch {
      // counts endpoint may not exist yet
    }
  }, []);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  useEffect(() => {
    fetchStatusCounts();
  }, [fetchStatusCounts]);

  async function handleScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/sales-hunter/prospects/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setScanResult(
        data.message ||
          `Scan completed. Found ${data.count ?? 0} new prospects.`,
      );
      fetchProspects();
      fetchStatusCounts();
    } catch (error) {
      console.error("Failed to scan:", error);
      setScanResult("Scan failed. Please try again.");
    } finally {
      setScanning(false);
    }
  }

  async function handleUpdateStatus(id: string, status: ProspectStatus) {
    try {
      await fetch(`/api/sales-hunter/prospects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchProspects();
      fetchStatusCounts();
    } catch (error) {
      console.error("Failed to update prospect:", error);
    }
  }

  async function handleConvertToLead(id: string) {
    try {
      await fetch(`/api/sales-hunter/prospects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "converted-to-lead" as ProspectStatus }),
      });
      fetchProspects();
      fetchStatusCounts();
    } catch (error) {
      console.error("Failed to convert prospect:", error);
    }
  }

  const totalCount = Object.values(statusCounts).reduce(
    (sum, v) => sum + (v || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Prospects</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Identify, research, and qualify potential customers from public data
            sources.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sales/prospects/sources"
            className="text-sm px-4 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Manage Sources
          </Link>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            {scanning ? "Scanning..." : "Scan for Prospects"}
          </button>
        </div>
      </div>

      {/* Scan Result Banner */}
      {scanResult && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 flex items-center justify-between">
          <span>{scanResult}</span>
          <button
            onClick={() => setScanResult(null)}
            className="text-emerald-400 hover:text-emerald-300 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Status Counts Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-center">
          <p className="text-xs text-zinc-500">Total</p>
          <p className="text-xl font-bold text-zinc-100">{totalCount}</p>
        </div>
        {ALL_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(statusFilter === status ? "" : status);
              setPage(1);
            }}
            className={`rounded-lg border p-3 text-center transition-colors ${
              statusFilter === status
                ? "border-blue-500 bg-blue-500/10"
                : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
            }`}
          >
            <p className="text-xs text-zinc-500">{STATUS_LABELS[status]}</p>
            <p className="text-xl font-bold text-zinc-100">
              {statusCounts[status] || 0}
            </p>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Filter by industry..."
          value={industryFilter}
          onChange={(e) => {
            setIndustryFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
        />

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Min Fit</label>
          <input
            type="number"
            min="0"
            max="100"
            placeholder="0"
            value={minFitScore}
            onChange={(e) => {
              setMinFitScore(e.target.value);
              setPage(1);
            }}
            className="w-16 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Min Intent</label>
          <input
            type="number"
            min="0"
            max="100"
            placeholder="0"
            value={minIntentScore}
            onChange={(e) => {
              setMinIntentScore(e.target.value);
              setPage(1);
            }}
            className="w-16 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {(statusFilter || industryFilter || minFitScore || minIntentScore) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setIndustryFilter("");
              setMinFitScore("");
              setMinIntentScore("");
              setPage(1);
            }}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Prospects Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900">
        {loading ? (
          <div className="p-8 text-center text-zinc-400">
            Loading prospects...
          </div>
        ) : prospects.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <p className="mb-2">No prospects found.</p>
            <p className="text-sm">
              Try adjusting your filters or click &quot;Scan for Prospects&quot;
              to discover new opportunities.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="px-4 py-3 text-left font-medium">Company</th>
                  <th className="px-4 py-3 text-left font-medium">Industry</th>
                  <th className="px-4 py-3 text-center font-medium">
                    Fit Score
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    Intent Score
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Tags</th>
                  <th className="px-4 py-3 text-left font-medium">Source</th>
                  <th className="px-4 py-3 text-left font-medium">Added</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {prospects.map((prospect) => (
                  <tr
                    key={prospect.id}
                    className="text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-100">
                        {prospect.companyName}
                      </div>
                      {prospect.website && (
                        <a
                          href={prospect.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          {prospect.website}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      <div>{prospect.industry || "--"}</div>
                      {prospect.subIndustry && (
                        <div className="text-xs text-zinc-500">
                          {prospect.subIndustry}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ScoreBadge score={prospect.fitScore} label="Fit Score" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ScoreBadge
                        score={prospect.intentScore}
                        label="Intent Score"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[prospect.status]}`}
                      >
                        {STATUS_LABELS[prospect.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {prospect.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400 border border-zinc-700"
                          >
                            {tag}
                          </span>
                        ))}
                        {prospect.tags.length > 3 && (
                          <span className="text-xs text-zinc-500">
                            +{prospect.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {prospect.sourceType
                        ? prospect.sourceType.replace(/-/g, " ")
                        : "--"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {formatDate(prospect.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {prospect.status !== "qualified" &&
                          prospect.status !== "converted-to-lead" &&
                          prospect.status !== "disqualified" && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(prospect.id, "qualified")
                              }
                              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                            >
                              Qualify
                            </button>
                          )}
                        {prospect.status !== "disqualified" &&
                          prospect.status !== "converted-to-lead" && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(prospect.id, "disqualified")
                              }
                              className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                            >
                              Disqualify
                            </button>
                          )}
                        {(prospect.status === "qualified" ||
                          prospect.status === "enriched") && (
                          <button
                            onClick={() => handleConvertToLead(prospect.id)}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                          >
                            Convert
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && prospects.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-sm text-zinc-500">
              Page {page} &middot; {prospects.length} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-md border border-zinc-700 bg-zinc-800 text-sm text-zinc-300 disabled:opacity-50 hover:bg-zinc-700 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={prospects.length < limit}
                className="px-3 py-1 rounded-md border border-zinc-700 bg-zinc-800 text-sm text-zinc-300 disabled:opacity-50 hover:bg-zinc-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
