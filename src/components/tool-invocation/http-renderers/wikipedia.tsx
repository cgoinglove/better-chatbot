"use client";

import { useMemo } from "react";
import { cn } from "lib/utils";
import { Badge } from "ui/badge";
import { Separator } from "ui/separator";
import { BookOpen, ExternalLink, Calendar } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "ui/hover-card";

// Types for Wikipedia API responses

// Summary API response (rest_v1/page/summary)
interface WikipediaSummaryResponse {
  title: string;
  displaytitle?: string;
  extract: string;
  extract_html?: string;
  description?: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  originalimage?: {
    source: string;
    width: number;
    height: number;
  };
  content_urls?: {
    desktop?: { page: string };
    mobile?: { page: string };
  };
  timestamp?: string;
  lang?: string;
}

// Search API response (w/api.php?action=query&list=search)
interface WikipediaSearchResult {
  ns: number;
  title: string;
  pageid: number;
  size: number;
  wordcount: number;
  snippet: string;
  timestamp: string;
}

interface WikipediaSearchResponse {
  batchcomplete?: string;
  query?: {
    searchinfo?: { totalhits: number };
    search?: WikipediaSearchResult[];
  };
}

// OpenSearch API response
type WikipediaOpenSearchResponse = [
  string, // query
  string[], // titles
  string[], // descriptions
  string[], // urls
];

interface WikipediaRendererProps {
  input: {
    url: string;
    method?: string;
  };
  output: {
    status: number;
    body:
      | WikipediaSummaryResponse
      | WikipediaSearchResponse
      | WikipediaOpenSearchResponse;
    ok: boolean;
  };
}

// Detect response type
function detectResponseType(
  body: any,
): "summary" | "search" | "opensearch" | "unknown" {
  if (Array.isArray(body) && body.length === 4) {
    return "opensearch";
  }
  if (body?.query?.search) {
    return "search";
  }
  if (body?.extract || body?.title) {
    return "summary";
  }
  return "unknown";
}

// Strip HTML tags
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

// Get Wikipedia language from URL
function getWikiLang(url: string): string {
  const match = url.match(/(?:https?:\/\/)?(\w+)\.wikipedia\.org/);
  return match?.[1] || "en";
}

// Summary view component
function SummaryView({
  data,
  lang,
}: { data: WikipediaSummaryResponse; lang: string }) {
  const pageUrl =
    data.content_urls?.desktop?.page ||
    `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(data.title)}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-primary" />
        <span className="text-sm font-semibold">Wikipedia</span>
        <Badge variant="outline" className="text-xs uppercase">
          {lang}
        </Badge>
      </div>

      <div className="flex gap-2">
        <div className="px-2.5">
          <Separator
            orientation="vertical"
            className="bg-gradient-to-b from-border to-transparent from-80%"
          />
        </div>
        <div className="flex flex-col gap-3 pb-2 max-w-2xl">
          {/* Article card */}
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
          >
            {data.thumbnail && (
              <img
                src={data.thumbnail.source}
                alt={data.title}
                className="size-16 rounded-md object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm group-hover:text-primary transition-colors">
                {data.displaytitle || data.title}
              </h4>
              {data.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                {data.extract}
              </p>
            </div>
            <ExternalLink className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </div>
    </div>
  );
}

// Search results view component
function SearchView({
  data,
  lang,
  query,
}: {
  data: WikipediaSearchResponse;
  lang: string;
  query: string;
}) {
  const results = data.query?.search || [];
  const totalHits = data.query?.searchinfo?.totalhits || results.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-primary" />
        <span className="text-sm font-semibold">Wikipedia</span>
        <span className="text-xs text-muted-foreground">«{query}»</span>
      </div>

      <div className="flex gap-2">
        <div className="px-2.5">
          <Separator
            orientation="vertical"
            className="bg-gradient-to-b from-border to-transparent from-80%"
          />
        </div>
        <div className="flex flex-col gap-2 pb-2">
          {/* Compact pill results */}
          <div className="flex flex-wrap gap-1.5">
            {results.map((result) => {
              const pageUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(result.title)}`;

              return (
                <HoverCard key={result.pageid} openDelay={200} closeDelay={0}>
                  <HoverCardTrigger asChild>
                    <a
                      href={pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "group rounded-full bg-secondary pl-1.5 pr-2.5 py-1 text-xs",
                        "flex items-center gap-1.5",
                        "hover:bg-input hover:ring hover:ring-blue-500/50 transition-all cursor-pointer",
                      )}
                    >
                      <div className="p-1 rounded-full bg-blue-500/10">
                        <BookOpen className="size-2.5 text-blue-500" />
                      </div>
                      <span className="truncate max-w-40">{result.title}</span>
                    </a>
                  </HoverCardTrigger>

                  <HoverCardContent className="w-80 p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <div className="p-1.5 rounded-md bg-blue-500/10 shrink-0">
                        <BookOpen className="size-4 text-blue-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm">{result.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{result.wordcount.toLocaleString()} words</span>
                          <span>·</span>
                          <span>{(result.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    </div>

                    {result.snippet && (
                      <div className="relative mb-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {stripHtml(result.snippet)}...
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <Calendar className="size-3" />
                      <span>
                        {new Date(result.timestamp).toLocaleDateString()}
                      </span>
                      <ExternalLink className="size-3 ml-auto" />
                      <span>{lang}.wikipedia.org</span>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            {totalHits.toLocaleString()} results found
          </p>
        </div>
      </div>
    </div>
  );
}

// OpenSearch results view component
function OpenSearchView({
  data,
  lang,
}: {
  data: WikipediaOpenSearchResponse;
  lang: string;
}) {
  const [query, titles, descriptions, urls] = data;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-primary" />
        <span className="text-sm font-semibold">Wikipedia</span>
        <span className="text-xs text-muted-foreground">
          «{query}» ({lang}.wikipedia.org)
        </span>
      </div>

      <div className="flex gap-2">
        <div className="px-2.5">
          <Separator
            orientation="vertical"
            className="bg-gradient-to-b from-border to-transparent from-80%"
          />
        </div>
        <div className="flex flex-col gap-2 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {titles.map((title, i) => (
              <HoverCard key={title} openDelay={200} closeDelay={0}>
                <HoverCardTrigger asChild>
                  <a
                    href={urls[i]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "group rounded-full bg-secondary pl-1.5 pr-2.5 py-1 text-xs",
                      "flex items-center gap-1.5",
                      "hover:bg-input hover:ring hover:ring-blue-500/50 transition-all cursor-pointer",
                    )}
                  >
                    <div className="p-1 rounded-full bg-blue-500/10">
                      <BookOpen className="size-2.5 text-blue-500" />
                    </div>
                    <span className="truncate max-w-40">{title}</span>
                  </a>
                </HoverCardTrigger>

                <HoverCardContent className="w-72 p-4">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded-md bg-blue-500/10 shrink-0">
                      <BookOpen className="size-4 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm">{title}</h4>
                      {descriptions[i] && (
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          {descriptions[i]}
                        </p>
                      )}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {titles.length} results found
          </p>
        </div>
      </div>
    </div>
  );
}

export function WikipediaResult({ input, output }: WikipediaRendererProps) {
  const lang = useMemo(() => getWikiLang(input.url), [input.url]);

  const query = useMemo(() => {
    try {
      const url = new URL(input.url);
      return (
        url.searchParams.get("srsearch") ||
        url.searchParams.get("search") ||
        url.searchParams.get("titles") ||
        ""
      );
    } catch {
      return "";
    }
  }, [input.url]);

  const responseType = useMemo(
    () => detectResponseType(output.body),
    [output.body],
  );

  if (responseType === "summary") {
    return (
      <SummaryView data={output.body as WikipediaSummaryResponse} lang={lang} />
    );
  }

  if (responseType === "search") {
    return (
      <SearchView
        data={output.body as WikipediaSearchResponse}
        lang={lang}
        query={query}
      />
    );
  }

  if (responseType === "opensearch") {
    return (
      <OpenSearchView
        data={output.body as WikipediaOpenSearchResponse}
        lang={lang}
      />
    );
  }

  // Unknown response type - return null to fall back to default rendering
  return null;
}
