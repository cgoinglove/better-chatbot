"use client";

import { useState } from "react";
import { Input } from "ui/input";
import { Button } from "ui/button";
import { Label } from "ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Separator } from "ui/separator";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";

export default function DeployCenterPage() {
  const [provider, setProvider] = useState<"vercel" | "netlify" | "github">(
    "vercel",
  );

  const [vercelHookUrl, setVercelHookUrl] = useState("");
  const [netlifyHookUrl, setNetlifyHookUrl] = useState("");
  const [ghRepo, setGhRepo] = useState("");
  const [ghWorkflow, setGhWorkflow] = useState("deploy.yml");
  const [ghRef, setGhRef] = useState("main");
  const [ghToken, setGhToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerHook = async (hookUrl: string) => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/deploy/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: hookUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to trigger hook");
      setResult(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const dispatchGh = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/deploy/github/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: ghRepo,
          workflow: ghWorkflow,
          ref: ghRef,
          token: ghToken,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Failed to dispatch workflow");
      setResult(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Deploy Center</h1>

      <Card>
        <CardHeader>
          <CardTitle>Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant={provider === "vercel" ? "default" : "outline"}
              onClick={() => setProvider("vercel")}
            >
              Vercel
            </Button>
            <Button
              variant={provider === "netlify" ? "default" : "outline"}
              onClick={() => setProvider("netlify")}
            >
              Netlify
            </Button>
            <Button
              variant={provider === "github" ? "default" : "outline"}
              onClick={() => setProvider("github")}
            >
              GitHub Pages
            </Button>
          </div>
          <Separator />

          {provider === "vercel" && (
            <div className="space-y-2">
              <Label>Vercel Deploy Hook URL</Label>
              <Input
                placeholder="https://api.vercel.com/v1/integrations/deploy/..."
                value={vercelHookUrl}
                onChange={(e) => setVercelHookUrl(e.target.value)}
              />
              <Button
                disabled={!vercelHookUrl || loading}
                onClick={() => triggerHook(vercelHookUrl)}
              >
                {loading ? "Triggering..." : "Trigger Deploy"}
              </Button>
            </div>
          )}

          {provider === "netlify" && (
            <div className="space-y-2">
              <Label>Netlify Build Hook URL</Label>
              <Input
                placeholder="https://api.netlify.com/build_hooks/..."
                value={netlifyHookUrl}
                onChange={(e) => setNetlifyHookUrl(e.target.value)}
              />
              <Button
                disabled={!netlifyHookUrl || loading}
                onClick={() => triggerHook(netlifyHookUrl)}
              >
                {loading ? "Triggering..." : "Trigger Deploy"}
              </Button>
            </div>
          )}

          {provider === "github" && (
            <div className="space-y-2">
              <Label>Repository (owner/repo)</Label>
              <Input
                placeholder="owner/repo"
                value={ghRepo}
                onChange={(e) => setGhRepo(e.target.value)}
              />
              <Label>Workflow file name</Label>
              <Input
                placeholder="deploy.yml"
                value={ghWorkflow}
                onChange={(e) => setGhWorkflow(e.target.value)}
              />
              <Label>Ref (branch)</Label>
              <Input
                placeholder="main"
                value={ghRef}
                onChange={(e) => setGhRef(e.target.value)}
              />
              <Label>GitHub Token (repo scope)</Label>
              <Input
                type="password"
                placeholder="ghp_..."
                value={ghToken}
                onChange={(e) => setGhToken(e.target.value)}
              />
              <Button
                disabled={
                  !ghRepo || !ghWorkflow || !ghRef || !ghToken || loading
                }
                onClick={dispatchGh}
              >
                {loading ? "Dispatching..." : "Dispatch Workflow"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap break-all">
              {result}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
