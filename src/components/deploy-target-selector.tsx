"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "ui/select";
import { Label } from "ui/label";

type DeployTarget = "vercel" | "netlify" | "github-pages";

const STORAGE_KEY = "deploy_target_preference";

export function DeployTargetSelector() {
  const [target, setTarget] = useState<DeployTarget>("vercel");

  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (saved === "vercel" || saved === "netlify" || saved === "github-pages") {
        setTarget(saved);
      }
    } catch {}
  }, []);

  const update = (value: string) => {
    const next = (value as DeployTarget) || "vercel";
    setTarget(next);
    try {
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm">Deploy:</Label>
      <Select value={target} onValueChange={update}>
        <SelectTrigger className="h-8 w-44">
          <SelectValue placeholder="Select target" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="vercel">Vercel</SelectItem>
          <SelectItem value="netlify">Netlify</SelectItem>
          <SelectItem value="github-pages">GitHub Pages</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

