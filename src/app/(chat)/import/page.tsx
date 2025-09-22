"use client";

import { useMemo, useState } from "react";
import { Input } from "ui/input";
import { Button } from "ui/button";
import { Label } from "ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Separator } from "ui/separator";
import { Textarea } from "ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";

type TreeItem = {
  path: string;
  type: "blob" | "tree";
  size?: number;
};

export default function ImportGithubPage() {
  const [repo, setRepo] = useState(""); // owner/repo
  const [ref, setRef] = useState("main");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");

  const directories = useMemo(
    () => tree.filter((t) => t.type === "tree"),
    [tree],
  );
  const files = useMemo(() => tree.filter((t) => t.type === "blob"), [tree]);

  const fetchTree = async () => {
    setLoading(true);
    setError(null);
    setTree([]);
    setSelectedPath(null);
    setFileContent("");
    try {
      const res = await fetch("/api/github/tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, ref, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch tree");
      setTree(data.items as TreeItem[]);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchFile = async (path: string) => {
    setLoading(true);
    setError(null);
    setSelectedPath(path);
    setFileContent("");
    try {
      const res = await fetch("/api/github/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, ref, token, path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch file");
      setFileContent(data.content || "");
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Import GitHub Repository</h1>
      <Card>
        <CardHeader>
          <CardTitle>Repository Info</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Repository (owner/repo)</Label>
            <Input
              placeholder="owner/repo"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Branch/Ref</Label>
            <Input
              placeholder="main"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>GitHub Token (repo read)</Label>
            <Input
              type="password"
              placeholder="ghp_..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Button
              disabled={!repo || !ref || !token || loading}
              onClick={fetchTree}
            >
              {loading ? "Loading..." : "Load Repository"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-auto">
            {directories.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground">Folders</p>
                <ul className="text-sm">
                  {directories.map((d) => (
                    <li key={d.path} className="py-1 text-muted-foreground">
                      {d.path}
                    </li>
                  ))}
                </ul>
                <Separator />
              </>
            )}
            <p className="text-sm text-muted-foreground">Files</p>
            <ul className="text-sm">
              {files.map((f) => (
                <li key={f.path}>
                  <Button
                    variant={selectedPath === f.path ? "default" : "ghost"}
                    className="h-7 px-2"
                    onClick={() => fetchFile(f.path)}
                  >
                    {f.path}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Preview {selectedPath ? `- ${selectedPath}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              className="font-mono h-[60vh]"
              value={fileContent}
              readOnly
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
