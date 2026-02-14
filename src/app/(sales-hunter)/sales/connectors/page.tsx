"use client";

import React, { useCallback, useEffect, useState } from "react";
import type {
  Connector,
  ConnectorType,
  ConnectorStatus,
} from "app-types/platform";

const CONNECTOR_TYPES: ConnectorType[] = [
  "salesforce",
  "hubspot",
  "csv-import",
  "api-generic",
];

const STATUS_BADGE_COLORS: Record<ConnectorStatus, string> = {
  connected: "bg-emerald-500/20 text-emerald-400",
  syncing: "bg-amber-500/20 text-amber-400",
  error: "bg-red-500/20 text-red-400",
  disconnected: "bg-zinc-500/20 text-zinc-400",
};

function formatDate(date: string | Date | null): string {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function connectorTypeLabel(type: ConnectorType): string {
  const labels: Record<ConnectorType, string> = {
    salesforce: "Salesforce",
    hubspot: "HubSpot",
    "csv-import": "CSV Import",
    "api-generic": "Generic API",
    "edi-837": "EDI 837",
    "edi-835": "EDI 835",
  };
  return labels[type] || type;
}

type NewConnectorForm = {
  name: string;
  type: ConnectorType;
};

const emptyConnectorForm: NewConnectorForm = {
  name: "",
  type: "salesforce",
};

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newConnector, setNewConnector] =
    useState<NewConnectorForm>(emptyConnectorForm);
  const [submitting, setSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await fetch("/api/platform/connectors");
      const data: Connector[] = await res.json();
      setConnectors(data);
    } catch (error) {
      console.error("Failed to fetch connectors:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  async function handleAddConnector(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/platform/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newConnector.name,
          type: newConnector.type,
        }),
      });

      if (res.ok) {
        setNewConnector(emptyConnectorForm);
        setShowAddForm(false);
        fetchConnectors();
      }
    } catch (error) {
      console.error("Failed to create connector:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSync(connectorId: string) {
    setSyncingId(connectorId);
    try {
      const res = await fetch(
        `/api/platform/connectors/${connectorId}/sync`,
        {
          method: "POST",
        },
      );
      if (res.ok) {
        // Update local state to reflect syncing status
        setConnectors((prev) =>
          prev.map((c) =>
            c.id === connectorId ? { ...c, status: "syncing" as const } : c,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to trigger sync:", error);
    } finally {
      setSyncingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-400">Loading connectors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          Manage data source connections and sync schedules.
        </p>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          {showAddForm ? "Cancel" : "Add Connector"}
        </button>
      </div>

      {/* Add Connector Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddConnector}
          className="rounded-lg border border-zinc-800 bg-zinc-900 p-6"
        >
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">
            New Connector
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Connector Name *
              </label>
              <input
                type="text"
                required
                value={newConnector.name}
                onChange={(e) =>
                  setNewConnector({ ...newConnector, name: e.target.value })
                }
                placeholder="e.g., Production Salesforce"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Type *
              </label>
              <select
                value={newConnector.type}
                onChange={(e) =>
                  setNewConnector({
                    ...newConnector,
                    type: e.target.value as ConnectorType,
                  })
                }
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CONNECTOR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {connectorTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              {submitting ? "Creating..." : "Create Connector"}
            </button>
          </div>
        </form>
      )}

      {/* Connectors List */}
      {connectors.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
              />
            </svg>
          </div>
          <p className="text-zinc-400 mb-1">No connectors configured.</p>
          <p className="text-zinc-500 text-sm">
            Add a connector to start syncing data from external sources.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {connectors.map((connector) => (
            <div
              key={connector.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Connector Icon */}
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-zinc-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                      />
                    </svg>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-zinc-100">
                        {connector.name}
                      </h3>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_COLORS[connector.status]}`}
                      >
                        {connector.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-zinc-500">
                        {connectorTypeLabel(connector.type)}
                      </span>
                      <span className="text-xs text-zinc-600">|</span>
                      <span className="text-xs text-zinc-500">
                        Last sync: {formatDate(connector.lastSyncAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleSync(connector.id)}
                    disabled={
                      syncingId === connector.id ||
                      connector.status === "syncing"
                    }
                    className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                  >
                    {syncingId === connector.id || connector.status === "syncing"
                      ? "Syncing..."
                      : "Sync"}
                  </button>
                  <button className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
                    Configure
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
