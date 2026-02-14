"use client";

import { useState, useEffect, useCallback } from "react";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  deploymentMode: "single-tenant" | "multi-tenant";
  enabledVerticals: string[];
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formMode, setFormMode] = useState<"single-tenant" | "multi-tenant">(
    "single-tenant"
  );
  const [formVerticals, setFormVerticals] = useState("");

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tenants");
      if (!res.ok) throw new Error("Failed to fetch tenants");
      const data = await res.json();
      setTenants(data.tenants);
    } catch (err: any) {
      setError(err.message || "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError(null);

    try {
      const verticals = formVerticals
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          slug: formSlug,
          deploymentMode: formMode,
          enabledVerticals: verticals,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create tenant");
      }

      // Reset form and refresh
      setFormName("");
      setFormSlug("");
      setFormMode("single-tenant");
      setFormVerticals("");
      setShowForm(false);
      fetchTenants();
    } catch (err: any) {
      setFormError(err.message || "Failed to create tenant");
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100">Tenants</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Manage platform tenants and organizations
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors"
        >
          {showForm ? "Cancel" : "Add Tenant"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-zinc-100 mb-4">
            Create New Tenant
          </h3>

          {formError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="Acme Corp"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Slug
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  required
                  placeholder="acme-corp"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Deployment Mode
                </label>
                <select
                  value={formMode}
                  onChange={(e) =>
                    setFormMode(
                      e.target.value as "single-tenant" | "multi-tenant"
                    )
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
                >
                  <option value="single-tenant">Single Tenant</option>
                  <option value="multi-tenant">Multi Tenant</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Verticals (comma-separated)
                </label>
                <input
                  type="text"
                  value={formVerticals}
                  onChange={(e) => setFormVerticals(e.target.value)}
                  placeholder="sales-hunter, healthcare"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? "Creating..." : "Create Tenant"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tenants table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Slug
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Mode
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Verticals
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Created
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
              ) : tenants.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-zinc-500"
                  >
                    No tenants found
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-zinc-100">{tenant.name}</p>
                        <p className="text-xs text-zinc-500 font-mono">
                          {tenant.id.substring(0, 8)}...
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-300 font-mono">
                        {tenant.slug}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          tenant.deploymentMode === "multi-tenant"
                            ? "bg-purple-500/10 text-purple-400"
                            : "bg-zinc-500/10 text-zinc-300"
                        }`}
                      >
                        {tenant.deploymentMode}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {tenant.enabledVerticals.length === 0 ? (
                          <span className="text-xs text-zinc-600">None</span>
                        ) : (
                          tenant.enabledVerticals.map((v) => (
                            <span
                              key={v}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400"
                            >
                              {v}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {formatDate(tenant.createdAt)}
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
