"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type {
  ResearchTask,
  ResearchTaskType,
  ResearchTaskStatus,
  ResearchFinding,
  AgentLogEntry,
} from "app-types/state-research";

const STATES = ["TX", "CO", "WY", "NM", "CA", "UT", "KS"];

const STATUS_STYLES: Record<ResearchTaskStatus, string> = {
  pending: "bg-zinc-500/20 text-zinc-400",
  "in-progress": "bg-blue-500/20 text-blue-400 animate-pulse",
  completed: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
  canceled: "bg-zinc-500/20 text-zinc-500",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-zinc-500/20 text-zinc-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-orange-500/20 text-orange-400",
  urgent: "bg-red-500/20 text-red-400",
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  let barColor = "bg-red-500";
  if (confidence > 70) barColor = "bg-emerald-500";
  else if (confidence > 40) barColor = "bg-amber-500";

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400">{confidence}%</span>
    </div>
  );
}

function FindingCard({ finding }: { finding: ResearchFinding }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-zinc-700 rounded-lg p-4 bg-zinc-800/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
              {finding.type}
            </span>
            {finding.actionable && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                Actionable
              </span>
            )}
          </div>
          <h4 className="text-sm font-medium text-zinc-100 mb-1">
            {finding.title}
          </h4>
          <p className="text-sm text-zinc-400">{finding.summary}</p>
        </div>
        <ConfidenceBar confidence={finding.confidence} />
      </div>
      {finding.suggestedAction && (
        <div className="mt-3 p-2 rounded bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400">
            <span className="font-medium">Suggested Action: </span>
            {finding.suggestedAction}
          </p>
        </div>
      )}
      {finding.data && Object.keys(finding.data).length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {expanded ? "Hide details" : "Show details"}
        </button>
      )}
      {expanded && finding.data && (
        <pre className="mt-2 p-2 rounded bg-zinc-900 text-xs text-zinc-400 overflow-x-auto max-h-48">
          {JSON.stringify(finding.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

function AgentLogTimeline({ log }: { log: AgentLogEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const displayLog = expanded ? log : log.slice(0, 3);

  return (
    <div className="space-y-2">
      {displayLog.map((entry, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-zinc-500 mt-1.5" />
            {i < displayLog.length - 1 && (
              <div className="w-px h-full bg-zinc-700 min-h-[16px]" />
            )}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-300">
                {entry.agent}
              </span>
              <span className="text-xs text-zinc-500">{entry.action}</span>
              <span className="text-xs text-zinc-600 ml-auto">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{entry.message}</p>
          </div>
        </div>
      ))}
      {log.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-zinc-500 hover:text-zinc-300 ml-5 transition-colors"
        >
          {expanded ? "Show less" : `Show ${log.length - 3} more entries`}
        </button>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onRerun,
}: {
  task: ResearchTask;
  onRerun: (id: string) => void;
}) {
  const [showFindings, setShowFindings] = useState(false);
  const [showLog, setShowLog] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[task.status]}`}
            >
              {task.status}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}
            >
              {task.priority}
            </span>
            <span className="text-xs text-zinc-500 px-2 py-0.5 rounded-full bg-zinc-800">
              {task.taskType}
            </span>
          </div>
          <h3 className="text-base font-medium text-zinc-100">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-zinc-400 mt-1">{task.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
            {task.targetCompany && <span>Company: {task.targetCompany}</span>}
            {task.targetState && <span>State: {task.targetState}</span>}
            <span>Created: {formatDate(task.createdAt)}</span>
            {task.completedAt && (
              <span>Completed: {formatDate(task.completedAt)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(task.status === "completed" || task.status === "failed") && (
            <button
              onClick={() => onRerun(task.id)}
              className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Re-run
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      {task.results && (
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="p-2 rounded bg-zinc-800 text-center">
            <p className="text-lg font-semibold text-zinc-100">
              {(task.results as Record<string, number>).sourcesScanned ?? 0}
            </p>
            <p className="text-xs text-zinc-500">Sources Scanned</p>
          </div>
          <div className="p-2 rounded bg-zinc-800 text-center">
            <p className="text-lg font-semibold text-zinc-100">
              {(task.results as Record<string, number>).findingsCount ?? 0}
            </p>
            <p className="text-xs text-zinc-500">Findings</p>
          </div>
          <div className="p-2 rounded bg-zinc-800 text-center">
            <p className="text-lg font-semibold text-emerald-400">
              {(task.results as Record<string, number>).actionableFindings ?? 0}
            </p>
            <p className="text-xs text-zinc-500">Actionable</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {task.errorMessage && (
        <div className="mt-3 p-3 rounded bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{task.errorMessage}</p>
        </div>
      )}

      {/* Toggle buttons */}
      <div className="mt-3 flex items-center gap-3 border-t border-zinc-800 pt-3">
        {task.findings && task.findings.length > 0 && (
          <button
            onClick={() => setShowFindings(!showFindings)}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {showFindings
              ? "Hide Findings"
              : `View ${task.findings.length} Findings`}
          </button>
        )}
        {task.agentLog && task.agentLog.length > 0 && (
          <button
            onClick={() => setShowLog(!showLog)}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {showLog ? "Hide Agent Log" : "View Agent Log"}
          </button>
        )}
      </div>

      {/* Findings */}
      {showFindings && task.findings && task.findings.length > 0 && (
        <div className="mt-3 space-y-3">
          {task.findings.map((finding, i) => (
            <FindingCard key={i} finding={finding} />
          ))}
        </div>
      )}

      {/* Agent Log */}
      {showLog && task.agentLog && task.agentLog.length > 0 && (
        <div className="mt-3 p-3 rounded bg-zinc-800/50 border border-zinc-700">
          <h4 className="text-xs font-medium text-zinc-300 mb-3">
            Agent Activity Log
          </h4>
          <AgentLogTimeline log={task.agentLog} />
        </div>
      )}
    </div>
  );
}

type QuickActionModal =
  | null
  | "company"
  | "enforcement"
  | "permits"
  | "emissions";

export default function ResearchHubPage() {
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<QuickActionModal>(null);
  const [submitting, setSubmitting] = useState(false);

  // Quick action form state
  const [companyName, setCompanyName] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [taskTitle, setTaskTitle] = useState("");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/state-research/tasks?limit=50");
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch research tasks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Poll for in-progress tasks
  useEffect(() => {
    const hasInProgress = tasks.some((t) => t.status === "in-progress");
    if (!hasInProgress) return;

    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [tasks, fetchTasks]);

  async function createTask(
    taskType: ResearchTaskType,
    title: string,
    opts: {
      targetCompany?: string;
      targetState?: string;
      description?: string;
    } = {},
  ) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/platform/state-research/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          title,
          targetCompany: opts.targetCompany || undefined,
          targetState: opts.targetState || undefined,
          description: opts.description || undefined,
          priority: "medium",
          executeImmediately: true,
        }),
      });

      if (res.ok) {
        setActiveModal(null);
        setCompanyName("");
        setSelectedState("");
        setTaskTitle("");
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to create research task:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRerun(taskId: string) {
    try {
      await fetch(`/api/platform/state-research/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rerun" }),
      });
      fetchTasks();
    } catch (error) {
      console.error("Failed to re-run task:", error);
    }
  }

  const activeTasks = tasks.filter(
    (t) => t.status === "in-progress" || t.status === "pending",
  );
  const completedTasks = tasks.filter(
    (t) => t.status === "completed" || t.status === "failed",
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Research Hub</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Launch and monitor agentic research tasks across state regulatory
            databases. Deep research for oil &amp; gas compliance, enforcement
            monitoring, and methane emissions tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sales/research/sources"
            className="text-sm px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Manage Sources
          </Link>
          <Link
            href="/sales/research/agents"
            className="text-sm px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Configure Agents
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveModal("company")}
          className="p-4 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-left transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center mb-3 group-hover:bg-blue-600/30 transition-colors">
            <svg
              className="w-5 h-5 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"
              />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-zinc-100">
            Research Company
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Deep dive into a company&apos;s regulatory profile
          </p>
        </button>

        <button
          onClick={() => setActiveModal("enforcement")}
          className="p-4 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-left transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center mb-3 group-hover:bg-red-600/30 transition-colors">
            <svg
              className="w-5 h-5 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-zinc-100">
            Scan Enforcement Actions
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Find companies with violations &amp; penalties
          </p>
        </button>

        <button
          onClick={() => setActiveModal("permits")}
          className="p-4 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-left transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center mb-3 group-hover:bg-amber-600/30 transition-colors">
            <svg
              className="w-5 h-5 text-amber-400"
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
          <h3 className="text-sm font-medium text-zinc-100">
            Track New Permits
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Scan for new drilling &amp; air quality permits
          </p>
        </button>

        <button
          onClick={() => setActiveModal("emissions")}
          className="p-4 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-left transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center mb-3 group-hover:bg-emerald-600/30 transition-colors">
            <svg
              className="w-5 h-5 text-emerald-400"
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
          <h3 className="text-sm font-medium text-zinc-100">
            Analyze Emissions
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Identify high-emitting facilities for OGI/LDAR
          </p>
        </button>
      </div>

      {/* Quick Action Modals */}
      {activeModal === "company" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">
            Research Company
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTask(
                "company-deep-dive",
                taskTitle || `Company Research: ${companyName}`,
                {
                  targetCompany: companyName,
                  targetState: selectedState || undefined,
                  description: `Deep regulatory research on ${companyName}`,
                },
              );
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Devon Energy"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  State (optional)
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All States</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Auto-generated if blank"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
              >
                {submitting ? "Launching..." : "Launch Research"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeModal === "enforcement" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">
            Scan Enforcement Actions
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTask(
                "enforcement-scan",
                `Enforcement Scan: ${selectedState || "All States"}`,
                {
                  targetState: selectedState || undefined,
                  description: `Scan enforcement databases for violations and penalties in ${selectedState || "all states"}`,
                },
              );
            }}
          >
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Target State
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-64 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All States</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
              >
                {submitting ? "Launching..." : "Start Scan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeModal === "permits" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">
            Track New Permits
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTask(
                "state-permit-scan",
                `Permit Scan: ${selectedState || "All States"}`,
                {
                  targetState: selectedState || undefined,
                  description: `Scan permit registries for new drilling and air quality permits in ${selectedState || "all states"}`,
                },
              );
            }}
          >
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Target State
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-64 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All States</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
              >
                {submitting ? "Launching..." : "Start Scan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeModal === "emissions" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">
            Analyze Emissions
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTask(
                "emissions-analysis",
                `Emissions Analysis: ${selectedState || "All States"}`,
                {
                  targetState: selectedState || undefined,
                  description: `Analyze methane emissions data for high-emitting facilities in ${selectedState || "all states"}`,
                },
              );
            }}
          >
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Target State
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-64 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All States</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
              >
                {submitting ? "Launching..." : "Start Analysis"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Research Tasks */}
      {activeTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Active Research Tasks
          </h2>
          <div className="space-y-4">
            {activeTasks.map((task) => (
              <TaskCard key={task.id} task={task} onRerun={handleRerun} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Recent Completed Tasks
        </h2>
        {loading ? (
          <div className="text-center py-8 text-zinc-400">
            Loading research tasks...
          </div>
        ) : completedTasks.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 rounded-lg border border-zinc-800 bg-zinc-900">
            No completed research tasks yet. Use the quick actions above to
            launch your first research task.
          </div>
        ) : (
          <div className="space-y-4">
            {completedTasks.map((task) => (
              <TaskCard key={task.id} task={task} onRerun={handleRerun} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
