"use client";

import useSWR from "swr";
import { fetcher } from "lib/utils";
import { useObjectState } from "@/hooks/use-object-state";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Button } from "ui/button";
import { toast } from "sonner";

export function SettingsConnections() {
  const { data, mutate } = useSWR<Record<string, string>>(
    "/api/user/connections",
    fetcher,
  );
  const [state, setState] = useObjectState({
    DATABASE_URL: "",
    REDIS_URL: "",
    VPS_HOST: "",
    VPS_USER: "",
    VPS_SSH_KEY: "",
    VERCEL_TOKEN: "",
    NETLIFY_AUTH_TOKEN: "",
    GITHUB_TOKEN: "",
    otp: "",
  });

  const issueOtp = async () => {
    const res = await fetch("/api/user/connections", { method: "POST" });
    const json = await res.json();
    if (res.ok) toast.message(`OTP: ${json.otp}`);
    else toast.error("Failed to issue OTP");
  };

  const save = async () => {
    const res = await fetch("/api/user/connections", {
      method: "PUT",
      body: JSON.stringify(state),
    });
    if (res.ok) {
      toast.success("Saved");
      mutate();
    } else toast.error("Failed");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connections</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3">
        <div>
          <Label>DATABASE_URL</Label>
          <Input
            placeholder={data?.DATABASE_URL || "postgres://..."}
            onChange={(e) => setState({ DATABASE_URL: e.target.value })}
          />
        </div>
        <div>
          <Label>REDIS_URL</Label>
          <Input
            placeholder={data?.REDIS_URL || "redis://..."}
            onChange={(e) => setState({ REDIS_URL: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>VPS_HOST</Label>
            <Input
              placeholder={data?.VPS_HOST || "example.com"}
              onChange={(e) => setState({ VPS_HOST: e.target.value })}
            />
          </div>
          <div>
            <Label>VPS_USER</Label>
            <Input
              placeholder={data?.VPS_USER || "root"}
              onChange={(e) => setState({ VPS_USER: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>VPS_SSH_KEY</Label>
          <Input
            type="password"
            placeholder={data?.VPS_SSH_KEY || "ssh-rsa..."}
            onChange={(e) => setState({ VPS_SSH_KEY: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>VERCEL_TOKEN</Label>
            <Input
              placeholder="vercel_..."
              onChange={(e) => setState({ VERCEL_TOKEN: e.target.value })}
            />
          </div>
          <div>
            <Label>NETLIFY_AUTH_TOKEN</Label>
            <Input
              placeholder="netlify_..."
              onChange={(e) => setState({ NETLIFY_AUTH_TOKEN: e.target.value })}
            />
          </div>
          <div>
            <Label>GITHUB_TOKEN</Label>
            <Input
              placeholder="ghp_..."
              onChange={(e) => setState({ GITHUB_TOKEN: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <div>
            <Label>OTP (2FA)</Label>
            <Input
              placeholder="6-digit"
              onChange={(e) => setState({ otp: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={issueOtp}>
              Get OTP
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
