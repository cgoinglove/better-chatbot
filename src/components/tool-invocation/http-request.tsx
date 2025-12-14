"use client";

import { ToolUIPart } from "ai";
import equal from "lib/equal";
import { toAny } from "lib/utils";
import { AlertTriangleIcon, Globe } from "lucide-react";
import { memo, useMemo } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "ui/hover-card";
import JsonView from "ui/json-view";
import { Separator } from "ui/separator";
import { TextShimmer } from "ui/text-shimmer";
import { Badge } from "ui/badge";
import { WikipediaResult } from "./http-renderers/wikipedia";

interface HttpRequestToolInvocationProps {
  part: ToolUIPart;
}

// HTTP response type from the fetch tool
interface HttpFetchResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  ok: boolean;
  url: string;
  isError?: boolean;
  error?: string;
}

// Domain-based renderer registry
// Supports wildcards: "*.example.com" matches any subdomain
// Renderers should return null if they can't handle the response
type DomainRenderer = React.FC<{
  input: any;
  output: HttpFetchResponse;
}>;

const DOMAIN_RENDERERS: Record<string, DomainRenderer> = {
  "*.wikipedia.org": WikipediaResult,
};

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Convert wildcard pattern to regex
 * e.g., "*.wikipedia.org" -> /^.+\.wikipedia\.org$/
 */
function wildcardToRegex(pattern: string): RegExp {
  // First replace * with a placeholder that won't be escaped
  const placeholder = "\x00WILDCARD\x00";
  const withPlaceholder = pattern.replace(/\*/g, placeholder);
  // Escape special regex chars
  const escaped = withPlaceholder.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  // Replace placeholder with .+
  const final = escaped.replace(new RegExp(placeholder, "g"), ".+");
  return new RegExp(`^${final}$`);
}

/**
 * Get the appropriate renderer for a URL
 */
function getRendererForUrl(url: string): DomainRenderer | null {
  const domain = extractDomain(url);
  if (!domain) return null;

  // Check for exact match first
  if (DOMAIN_RENDERERS[domain]) {
    return DOMAIN_RENDERERS[domain];
  }

  // Check wildcard patterns
  for (const [pattern, renderer] of Object.entries(DOMAIN_RENDERERS)) {
    if (pattern.includes("*")) {
      const regex = wildcardToRegex(pattern);
      if (regex.test(domain)) {
        return renderer;
      }
    }
  }

  return null;
}

function PureHttpRequestToolInvocation({
  part,
}: HttpRequestToolInvocationProps) {
  const result = useMemo(() => {
    if (!part.state.startsWith("output")) return null;
    return part.output as HttpFetchResponse;
  }, [part.state, part.output]);

  const input = part.input as {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  };

  const options = useMemo(() => {
    return (
      <HoverCard openDelay={200} closeDelay={0}>
        <HoverCardTrigger asChild>
          <span className="hover:text-primary transition-colors text-xs text-muted-foreground cursor-pointer">
            Request details
          </span>
        </HoverCardTrigger>
        <HoverCardContent className="max-w-xs md:max-w-md! w-full! overflow-auto flex flex-col">
          <p className="text-xs text-muted-foreground px-2 mb-2">
            HTTP request configuration
          </p>
          <div className="p-2">
            <JsonView data={input} />
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }, [input]);

  // Check if there's a custom renderer for this URL
  const CustomRenderer = useMemo(() => {
    if (!input?.url || !result) return null;
    return getRendererForUrl(input.url);
  }, [input?.url, result]);

  // Try custom renderer, it may return null if it can't handle the response
  const customResult = useMemo(() => {
    if (!CustomRenderer || !result) return null;
    return <CustomRenderer input={input} output={result} />;
  }, [CustomRenderer, input, result]);

  // Loading state
  if (!part.state.startsWith("output")) {
    const loadingText = `${input?.method || "GET"} ${input?.url ? truncateUrl(input.url) : "..."}`;
    return (
      <div className="flex items-center gap-2 text-sm">
        <Globe className="size-5 wiggle text-muted-foreground" />
        <TextShimmer>{loadingText}</TextShimmer>
      </div>
    );
  }

  // Error state
  if (result?.isError) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Globe className="size-5 text-destructive" />
          <span className="text-sm font-semibold">HTTP Request Failed</span>
          {options}
        </div>
        <div className="flex gap-2">
          <div className="px-2.5">
            <Separator
              orientation="vertical"
              className="bg-gradient-to-b from-border to-transparent from-80%"
            />
          </div>
          <div className="flex flex-col gap-2 pb-2">
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangleIcon className="size-3.5" />
              {result.error || "Request failed"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If we have a custom renderer result, use it
  if (customResult) {
    return customResult;
  }

  // Default rendering
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Globe className="size-5 text-muted-foreground" />
        <span className="text-sm font-semibold">HTTP Request</span>
        <Badge
          variant={result?.ok ? "secondary" : "destructive"}
          className="text-xs"
        >
          {result?.status} {result?.statusText}
        </Badge>
        {options}
      </div>
      <div className="flex gap-2">
        <div className="px-2.5">
          <Separator
            orientation="vertical"
            className="bg-gradient-to-b from-border to-transparent from-80%"
          />
        </div>
        <div className="flex flex-col gap-2 pb-2 w-full">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">{input?.method || "GET"}</span>{" "}
            <span className="truncate">{input?.url}</span>
          </div>
          {result?.body && (
            <div className="max-h-[300px] overflow-auto rounded-lg bg-card p-3 border text-xs">
              {typeof result.body === "object" ? (
                <JsonView data={result.body} />
              ) : (
                <pre className="whitespace-pre-wrap break-words">
                  {String(result.body)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function truncateUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) return url;
  try {
    const urlObj = new URL(url);
    const path =
      urlObj.pathname.length > 20
        ? urlObj.pathname.slice(0, 20) + "..."
        : urlObj.pathname;
    return `${urlObj.hostname}${path}`;
  } catch {
    return url.slice(0, maxLength) + "...";
  }
}

function areEqual(
  { part: prevPart }: HttpRequestToolInvocationProps,
  { part: nextPart }: HttpRequestToolInvocationProps,
) {
  if (prevPart.state !== nextPart.state) return false;
  if (!equal(prevPart.input, nextPart.input)) return false;
  if (
    prevPart.state.startsWith("output") &&
    !equal(prevPart.output, toAny(nextPart).output)
  )
    return false;
  return true;
}

export const HttpRequestToolInvocation = memo(
  PureHttpRequestToolInvocation,
  areEqual,
);
