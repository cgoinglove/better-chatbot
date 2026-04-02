"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ResearchAgentConfig } from "app-types/state-research";

const AGENT_TYPE_LABELS: Record<string, string> = {
  "company-deep-dive": "Company Deep Dive",
  "facility-compliance": "Facility Compliance",
  "state-permit-scan": "Permit Scan",
  "enforcement-scan": "Enforcement Scan",
  "emissions-analysis": "Emissions Analysis",
  "competitor-analysis": "Competitor Analysis",
  "market-opportunity": "Market Opportunity",
  "regulatory-change-scan": "Regulatory Changes",
  "contact-discovery": "Contact Discovery",
  "prospect-qualification": "Prospect Qualification",
};

const AGENT_TYPE_COLORS: Record<string, string> = {
  "company-deep-dive": "bg-blue-500/20 text-blue-400",
  "facility-compliance": "bg-pink-500/20 text-pink-400",
  "state-permit-scan": "bg-amber-500/20 text-amber-400",
  "enforcement-scan": "bg-red-500/20 text-red-400",
  "emissions-analysis": "bg-emerald-500/20 text-emerald-400",
  "competitor-analysis": "bg-purple-500/20 text-purple-400",
  "market-opportunity": "bg-teal-500/20 text-teal-400",
  "regulatory-change-scan": "bg-orange-500/20 text-orange-400",
  "contact-discovery": "bg-indigo-500/20 text-indigo-400",
  "prospect-qualification": "bg-cyan-500/20 text-cyan-400",
};

const ALL_STATES = ["TX", "CO", "WY", "NM", "CA", "UT", "KS"];

function AgentCard({
  config,
  onToggle,
  onRunNow,
  onEdit,
  onDelete,
}: {
  config: ResearchAgentConfig;
  onToggle: (id: string, enabled: boolean) => void;
  onRunNow: (config: ResearchAgentConfig) => void;
  onEdit: (config: ResearchAgentConfig) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                AGENT_TYPE_COLORS[config.agentType] ||
                "bg-zinc-500/20 text-zinc-400"
              }`}
            >
              {AGENT_TYPE_LABELS[config.agentType] || config.agentType}
            </span>
            {config.schedule && (
              <span className="text-xs text-zinc-500 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700">
                Scheduled: {config.schedule}
              </span>
            )}
          </div>
          <h3 className="text-base font-medium text-zinc-100">{config.name}</h3>
          {config.metadata?.description ? (
            <p className="text-sm text-zinc-400 mt-1">
              {String(config.metadata.description)}
            </p>
          ) : null}
        </div>
        <button
          onClick={() => onToggle(config.id, !config.enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
            config.enabled ? "bg-blue-600" : "bg-zinc-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Target States */}
      {config.targetStates.length > 0 && (
        <div className="mt-3">
          <span className="text-xs text-zinc-500 mr-2">Target States:</span>
          <div className="inline-flex flex-wrap gap-1">
            {config.targetStates.map((state) => (
              <span
                key={state}
                className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700"
              >
                {state}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      {config.searchKeywords.length > 0 && (
        <div className="mt-2">
          <span className="text-xs text-zinc-500 mr-2">Keywords:</span>
          <div className="inline-flex flex-wrap gap-1">
            {config.searchKeywords.slice(0, 6).map((kw) => (
              <span
                key={kw}
                className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700"
              >
                {kw}
              </span>
            ))}
            {config.searchKeywords.length > 6 && (
              <span className="text-xs text-zinc-500">
                +{config.searchKeywords.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Industries */}
      {config.targetIndustries.length > 0 && (
        <div className="mt-2">
          <span className="text-xs text-zinc-500 mr-2">Industries:</span>
          <span className="text-xs text-zinc-400">
            {config.targetIndustries.join(", ")}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-zinc-800 pt-3">
        <button
          onClick={() => onRunNow(config)}
          className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
        >
          Run Now
        </button>
        <button
          onClick={() => onEdit(config)}
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          Configure
        </button>
        <button
          onClick={() => onDelete(config.id)}
          className="text-xs px-3 py-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors ml-auto"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

type EditingAgent = {
  id: string;
  name: string;
  systemPrompt: string;
  targetStates: string[];
  searchKeywords: string;
  schedule: string;
  enabled: boolean;
};

export default function AgentsPage() {
  const [configs, setConfigs] = useState<ResearchAgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<EditingAgent | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/state-research/agents");
      const data = await res.json();
      setConfigs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch agent configs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  async function handleSeed() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/platform/state-research/agents/seed", {
        method: "POST",
      });
      const data = await res.json();
      setSeedResult(data.message);
      fetchConfigs();
    } catch (error) {
      console.error("Failed to seed agents:", error);
      setSeedResult("Failed to seed agents");
    } finally {
      setSeeding(false);
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    try {
      setConfigs((prev) =>
        prev.map((c) => (c.id === id ? { ...c, enabled } : c)),
      );

      await fetch(`/api/platform/state-research/agents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
    } catch (error) {
      console.error("Failed to toggle agent:", error);
      fetchConfigs();
    }
  }

  async function handleRunNow(config: ResearchAgentConfig) {
    try {
      const title = `Test: ${config.name}`;
      const res = await fetch("/api/platform/state-research/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: config.agentType,
          title,
          description: `Manual test run of ${config.name}`,
          targetState:
            config.targetStates.length > 0 ? config.targetStates[0] : undefined,
          priority: "medium",
          executeImmediately: true,
        }),
      });

      if (res.ok) {
        // Redirect to research hub to see the running task
        window.location.href = "/sales/research";
      }
    } catch (error) {
      console.error("Failed to run agent:", error);
    }
  }

  function handleEdit(config: ResearchAgentConfig) {
    setEditingAgent({
      id: config.id,
      name: config.name,
      systemPrompt: config.systemPrompt,
      targetStates: [...config.targetStates],
      searchKeywords: config.searchKeywords.join(", "),
      schedule: config.schedule || "",
      enabled: config.enabled,
    });
  }

  async function handleSaveEdit() {
    if (!editingAgent) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/platform/state-research/agents/${editingAgent.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editingAgent.name,
            systemPrompt: editingAgent.systemPrompt,
            targetStates: editingAgent.targetStates,
            searchKeywords: editingAgent.searchKeywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean),
            schedule: editingAgent.schedule || null,
            enabled: editingAgent.enabled,
          }),
        },
      );

      if (res.ok) {
        setEditingAgent(null);
        fetchConfigs();
      }
    } catch (error) {
      console.error("Failed to update agent:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Are you sure you want to delete this research agent configuration?",
      )
    )
      return;
    try {
      await fetch(`/api/platform/state-research/agents/${id}`, {
        method: "DELETE",
      });
      fetchConfigs();
    } catch (error) {
      console.error("Failed to delete agent:", error);
    }
  }

  function toggleState(state: string) {
    if (!editingAgent) return;
    const states = editingAgent.targetStates.includes(state)
      ? editingAgent.targetStates.filter((s) => s !== state)
      : [...editingAgent.targetStates, state];
    setEditingAgent({ ...editingAgent, targetStates: states });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/sales/research"
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Research Hub
            </Link>
            <span className="text-zinc-600">/</span>
            <h1 className="text-2xl font-bold text-zinc-100">
              Research Agents
            </h1>
          </div>
          <p className="text-sm text-zinc-400">
            Configure research agents that power automated regulatory
            intelligence. Each agent is customizable per tenant with specific
            prompts, target states, and keywords.
          </p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="text-sm px-4 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {seeding ? "Seeding..." : "Seed Default Agents"}
        </button>
      </div>

      {/* Seed Result */}
      {seedResult && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
          {seedResult}
        </div>
      )}

      {/* Configuration Panel (shown when editing) */}
      {editingAgent && (
        <div className="rounded-lg border border-blue-500/30 bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-100">
              Configure Agent
            </h3>
            <button
              onClick={() => setEditingAgent(null)}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Agent Name
              </label>
              <input
                type="text"
                value={editingAgent.name}
                onChange={(e) =>
                  setEditingAgent({
                    ...editingAgent,
                    name: e.target.value,
                  })
                }
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                System Prompt
              </label>
              <textarea
                rows={8}
                value={editingAgent.systemPrompt}
                onChange={(e) =>
                  setEditingAgent({
                    ...editingAgent,
                    systemPrompt: e.target.value,
                  })
                }
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Target States */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Target States
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_STATES.map((state) => (
                  <button
                    key={state}
                    onClick={() => toggleState(state)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      editingAgent.targetStates.includes(state)
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Search Keywords (comma separated)
              </label>
              <input
                type="text"
                value={editingAgent.searchKeywords}
                onChange={(e) =>
                  setEditingAgent({
                    ...editingAgent,
                    searchKeywords: e.target.value,
                  })
                }
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Schedule (cron expression, leave empty for on-demand)
              </label>
              <input
                type="text"
                value={editingAgent.schedule}
                onChange={(e) =>
                  setEditingAgent({
                    ...editingAgent,
                    schedule: e.target.value,
                  })
                }
                placeholder="e.g. 0 6 * * 1 (weekly on Monday at 6am)"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingAgent(null)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
              >
                {saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Cards */}
      {loading ? (
        <div className="text-center py-8 text-zinc-400">
          Loading agent configurations...
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 rounded-lg border border-zinc-800 bg-zinc-900">
          <p className="mb-3">No research agents configured yet.</p>
          <p className="text-sm">
            Click &quot;Seed Default Agents&quot; to load pre-configured
            research agents for oil &amp; gas compliance research.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {configs.map((config) => (
            <AgentCard
              key={config.id}
              config={config}
              onToggle={handleToggle}
              onRunNow={handleRunNow}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
