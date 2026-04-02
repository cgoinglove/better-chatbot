"use client";

import { useState, useEffect } from "react";

interface OutreachSequence {
  id: string;
  name: string;
  status: string;
  steps: Array<{
    stepNumber: number;
    type: string;
    subject: string | null;
    content: string;
    delayDays: number;
    status: string;
  }>;
  prospectId: string | null;
  contactId: string | null;
  createdAt: string;
}

export default function OutreachPage() {
  const [sequences, setSequences] = useState<OutreachSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    prospectName: "",
    contactName: "",
    contactTitle: "",
    industry: "",
    name: "",
  });
  const [preview, setPreview] = useState<OutreachSequence | null>(null);

  useEffect(() => {
    fetch("/api/sales-hunter/intelligence/outreach")
      .then((r) => r.json())
      .then((d) => setSequences(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function generateSequence() {
    const res = await fetch("/api/sales-hunter/intelligence/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.data) {
      setSequences((prev) => [data.data, ...prev]);
      setPreview(data.data);
      setShowForm(false);
    }
  }

  const statusColors: Record<string, string> = {
    draft: "bg-zinc-700 text-zinc-300",
    active: "bg-blue-900 text-blue-300",
    paused: "bg-yellow-900 text-yellow-300",
    completed: "bg-green-900 text-green-300",
    archived: "bg-zinc-800 text-zinc-500",
  };

  const stepIcons: Record<string, string> = {
    email:
      "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
    "phone-call":
      "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z",
    "linkedin-connect":
      "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
    "linkedin-message":
      "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Outreach Sequences
          </h1>
          <p className="text-zinc-400 mt-1">
            AI-generated personalized outreach campaigns
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
        >
          Generate Sequence
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">
            Generate Outreach Sequence
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Prospect Company
              </label>
              <input
                value={form.prospectName}
                onChange={(e) =>
                  setForm({ ...form, prospectName: e.target.value })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Contact Name
              </label>
              <input
                value={form.contactName}
                onChange={(e) =>
                  setForm({ ...form, contactName: e.target.value })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Contact Title
              </label>
              <input
                value={form.contactTitle}
                onChange={(e) =>
                  setForm({ ...form, contactTitle: e.target.value })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
                placeholder="VP of Operations"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Industry
              </label>
              <input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
                placeholder="Chemical Distribution"
              />
            </div>
          </div>
          <button
            onClick={generateSequence}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
          >
            Generate
          </button>
        </div>
      )}

      {preview && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-100">
              {preview.name}
            </h3>
            <button
              onClick={() => setPreview(null)}
              className="text-zinc-500 hover:text-zinc-300 text-sm"
            >
              Close Preview
            </button>
          </div>
          <div className="space-y-4">
            {preview.steps.map((step) => (
              <div key={step.stepNumber} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={stepIcons[step.type] || stepIcons.email}
                      />
                    </svg>
                  </div>
                  {step.stepNumber < preview.steps.length && (
                    <div className="w-px h-full bg-zinc-800 mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-zinc-100">
                      Step {step.stepNumber}: {step.type}
                    </span>
                    <span className="text-xs text-zinc-500">
                      +{step.delayDays}d
                    </span>
                  </div>
                  {step.subject && (
                    <p className="text-sm text-blue-400 mb-1">
                      Subject: {step.subject}
                    </p>
                  )}
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap line-clamp-3">
                    {step.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : sequences.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          No outreach sequences yet. Generate one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => (
            <div
              key={seq.id}
              onClick={() => setPreview(seq)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-zinc-100">{seq.name}</h4>
                  <p className="text-sm text-zinc-400">
                    {seq.steps.length} steps
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${statusColors[seq.status] || statusColors.draft}`}
                >
                  {seq.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
