"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "ui/input";
import { Button } from "ui/button";
import { Card, CardContent } from "ui/card";

export default function StudioPage() {
  const [path, _setPath] = useState("index.html");
  const [content, setContent] = useState("<h1>Hello</h1>");
  const [tab, setTab] = useState<"editor" | "terminal" | "preview">("editor");
  const [prompt, setPrompt] = useState("");
  const [term, setTerm] = useState("");

  const save = async () => {
    await fetch("/api/studio/files", {
      method: "PUT",
      body: JSON.stringify({ path, content }),
    });
  };

  const run = async () => {
    const res = await fetch("/api/studio/run", {
      method: "POST",
      body: JSON.stringify({
        image: "node:20-alpine",
        cmd: "sh",
        args: ["-lc", "node -v"],
      }),
    });
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;
    setTerm("");
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      setTerm((t) => t + decoder.decode(value));
    }
  };

  useEffect(() => {
    save();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Describe what to build..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <Button onClick={save}>Save</Button>
        <Button variant="outline" onClick={run}>
          Run
        </Button>
        <div className="flex gap-2 ml-auto">
          <Button
            variant={tab === "editor" ? "default" : "outline"}
            onClick={() => setTab("editor")}
          >
            Editor
          </Button>
          <Button
            variant={tab === "terminal" ? "default" : "outline"}
            onClick={() => setTab("terminal")}
          >
            Terminal
          </Button>
          <Button
            variant={tab === "preview" ? "default" : "outline"}
            onClick={() => setTab("preview")}
          >
            Preview
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {tab === "editor" && (
            <textarea
              className="w-full h-[70vh] p-3 font-mono"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          )}
          {tab === "terminal" && (
            <pre className="w-full h-[70vh] p-3 bg-black text-green-500 overflow-auto">
              {term}
            </pre>
          )}
          {tab === "preview" && (
            <iframe className="w-full h-[70vh] bg-white" srcDoc={content} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
