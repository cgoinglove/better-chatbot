"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { ConfigurableAgent, AgentToolConfig } from "app-types/platform";

const MODEL_OPTIONS = [
  "gpt-4o",
  "gpt-4o-mini",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "claude-3-opus-20240229",
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<ConfigurableAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Edit state per agent
  const [editState, setEditState] = useState<
    Record<
      string,
      {
        systemPrompt: string;
        temperature: number;
        model: string;
        enabled: boolean;
      }
    >
  >({});

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/sales-hunter/agents");
      const data: ConfigurableAgent[] = await res.json();
      setAgents(data);

      // Initialize edit state for each agent
      const state: typeof editState = {};
      for (const agent of data) {
        state[agent.id] = {
          systemPrompt: agent.systemPrompt,
          temperature: agent.temperature ?? 0.7,
          model: agent.model ?? "gpt-4o",
          enabled: agent.enabled,
        };
      }
      setEditState(state);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  function updateEditField(
    agentId: string,
    field: string,
    value: string | number | boolean,
  ) {
    setEditState((prev) => ({
      ...prev,
      [agentId]: { ...prev[agentId], [field]: value },
    }));
  }

  async function handleToggleEnabled(agentId: string, enabled: boolean) {
    updateEditField(agentId, "enabled", enabled);
    try {
      await fetch("/api/sales-hunter/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agentId, enabled }),
      });
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, enabled } : a)),
      );
    } catch (error) {
      console.error("Failed to toggle agent:", error);
      updateEditField(agentId, "enabled", !enabled);
    }
  }

  async function handleSave(agentId: string) {
    const edit = editState[agentId];
    if (!edit) return;

    setSaving(agentId);
    try {
      const res = await fetch("/api/sales-hunter/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: agentId,
          systemPrompt: edit.systemPrompt,
          temperature: edit.temperature,
          model: edit.model,
          enabled: edit.enabled,
        }),
      });

      if (res.ok) {
        const updated: ConfigurableAgent = await res.json();
        setAgents((prev) =>
          prev.map((a) => (a.id === agentId ? updated : a)),
        );
      }
    } catch (error) {
      console.error("Failed to save agent:", error);
    } finally {
      setSaving(null);
    }
  }

  function formatToolType(tool: AgentToolConfig): string {
    return tool.type
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-400">Loading agents...</div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-zinc-400 mb-2">No agents configured yet.</p>
          <p className="text-zinc-500 text-sm">
            Agents will appear here when configured for the Sales Hunter
            vertical.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {agents.map((agent) => {
          const edit = editState[agent.id];
          const isExpanded = expandedId === agent.id;
          const isSaving = saving === agent.id;

          return (
            <div
              key={agent.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden"
            >
              {/* Agent Card Header */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-zinc-100">
                        {agent.name}
                      </h3>
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-800 text-zinc-400 capitalize">
                        {agent.agentType.replace(/-/g, " ")}
                      </span>
                    </div>
                    {agent.description && (
                      <p className="mt-1 text-sm text-zinc-400 line-clamp-2">
                        {agent.description}
                      </p>
                    )}
                  </div>

                  {/* Enabled Toggle */}
                  <button
                    onClick={() =>
                      handleToggleEnabled(agent.id, !edit?.enabled)
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4 ${
                      edit?.enabled ? "bg-blue-600" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        edit?.enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Tools Preview */}
                {agent.tools.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {agent.tools.slice(0, 4).map((tool, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                      >
                        {tool.name}
                      </span>
                    ))}
                    {agent.tools.length > 4 && (
                      <span className="inline-flex items-center rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                        +{agent.tools.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Configure Button */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : agent.id)
                  }
                  className="mt-4 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  {isExpanded ? "Close Configuration" : "Configure"}
                </button>
              </div>

              {/* Expanded Configuration */}
              {isExpanded && edit && (
                <div className="border-t border-zinc-800 p-6 space-y-5 bg-zinc-950/50">
                  {/* System Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                      System Prompt
                    </label>
                    <textarea
                      value={edit.systemPrompt}
                      onChange={(e) =>
                        updateEditField(
                          agent.id,
                          "systemPrompt",
                          e.target.value,
                        )
                      }
                      rows={6}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                    />
                  </div>

                  {/* Temperature Slider */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                      Temperature:{" "}
                      <span className="text-zinc-400">
                        {edit.temperature.toFixed(2)}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={edit.temperature}
                      onChange={(e) =>
                        updateEditField(
                          agent.id,
                          "temperature",
                          parseFloat(e.target.value),
                        )
                      }
                      className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-zinc-500 mt-1">
                      <span>Precise (0)</span>
                      <span>Creative (2)</span>
                    </div>
                  </div>

                  {/* Model Selector */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                      Model
                    </label>
                    <select
                      value={edit.model}
                      onChange={(e) =>
                        updateEditField(agent.id, "model", e.target.value)
                      }
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {MODEL_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tools List */}
                  {agent.tools.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                        Tools ({agent.tools.length})
                      </label>
                      <div className="space-y-2">
                        {agent.tools.map((tool, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm text-zinc-200">
                                {tool.name}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {formatToolType(tool)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleSave(agent.id)}
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
