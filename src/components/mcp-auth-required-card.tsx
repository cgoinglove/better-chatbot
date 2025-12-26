"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { ShieldCheck, Loader, ExternalLink } from "lucide-react";
import { redirectUserMcpOauth } from "lib/ai/mcp/user-oauth-redirect";
import { toast } from "sonner";
import { mutate } from "swr";

interface McpAuthRequiredCardProps {
  mcpServerId: string;
  mcpServerName: string;
  authProvider?: string;
  onAuthSuccess?: () => void;
}

/**
 * Card component displayed inline in chat when a tool requires user authentication
 */
export function McpAuthRequiredCard({
  mcpServerId,
  mcpServerName,
  authProvider,
  onAuthSuccess,
}: McpAuthRequiredCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthorize = async () => {
    setIsLoading(true);
    try {
      const result = await redirectUserMcpOauth(mcpServerId);
      if (result.success) {
        toast.success(`Successfully connected to ${mcpServerName}`);
        mutate("/api/mcp/list");
        onAuthSuccess?.();
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-amber-500" />
          <CardTitle className="text-base">Authentication Required</CardTitle>
        </div>
        <CardDescription>
          To use tools from <strong>{mcpServerName}</strong>, you need to
          authenticate first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleAuthorize}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader className="size-4 animate-spin" />
            ) : (
              <ExternalLink className="size-4" />
            )}
            {isLoading
              ? "Authenticating..."
              : `Sign in with ${authProvider === "okta" ? "Okta" : "OAuth"}`}
          </Button>
          <span className="text-xs text-muted-foreground">
            Opens in a new window
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Inline auth prompt for use within tool results
 */
export function McpAuthRequiredInline({
  mcpServerId,
  mcpServerName,
  authProvider,
  onAuthSuccess,
}: McpAuthRequiredCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const providerLabel = authProvider === "okta" ? "Okta" : "OAuth";

  const handleAuthorize = async () => {
    setIsLoading(true);
    try {
      const result = await redirectUserMcpOauth(mcpServerId);
      if (result.success) {
        toast.success(`Connected to ${mcpServerName} via ${providerLabel}`);
        mutate("/api/mcp/list");
        onAuthSuccess?.();
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
      <ShieldCheck className="size-4 text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <strong>{mcpServerName}</strong> requires {providerLabel}{" "}
          authentication
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleAuthorize}
        disabled={isLoading}
        className="shrink-0 gap-1.5"
      >
        {isLoading ? (
          <Loader className="size-3 animate-spin" />
        ) : (
          <ExternalLink className="size-3" />
        )}
        Authorize
      </Button>
    </div>
  );
}
