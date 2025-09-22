"use client";

import { useState } from "react";
import { Input } from "ui/input";
import { Button } from "ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Label } from "ui/label";

export default function PRBotPage() {
  const [repo, setRepo] = useState("");
  const [base, setBase] = useState("main");
  const [head, setHead] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [token, setToken] = useState("");
  const [result, setResult] = useState<string>("");

  const createPR = async () => {
    const res = await fetch("/api/github/pr/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo, base, head, title, body, token }),
    });
    const json = await res.json();
    setResult(JSON.stringify(json, null, 2));
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">PR Bot</h1>
      <Card>
        <CardHeader>
          <CardTitle>Create Pull Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Repository (owner/repo)</Label>
              <Input value={repo} onChange={(e) => setRepo(e.target.value)} />
            </div>
            <div>
              <Label>Base Branch</Label>
              <Input value={base} onChange={(e) => setBase(e.target.value)} />
            </div>
            <div>
              <Label>Head Branch</Label>
              <Input value={head} onChange={(e) => setHead(e.target.value)} />
            </div>
            <div>
              <Label>GitHub Token</Label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Body</Label>
              <Input value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          </div>
          <Button
            onClick={createPR}
            disabled={!repo || !head || !title || !token}
          >
            Create PR
          </Button>
          {result && (
            <pre className="text-xs whitespace-pre-wrap border rounded p-2 mt-3">
              {result}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
