import type { ChatAttachment } from "app-types/chat";
import type { RouteSignals, RoutingTaskKey } from "./types";

// Ordered list \u2014 first match wins, so specificity decides placement:
// document/table work before web_search ("extrahiere ... suche"), website
// building before generic coding keywords, business writing before the
// generic writing bucket, and web_search before tool_calling so research
// phrasing beats tool nouns like "CRM" or "Tools".
const TASK_PATTERNS: Array<{ taskKey: RoutingTaskKey; pattern: RegExp }> = [
  {
    taskKey: "document_extraction",
    pattern:
      /\b(extract\w*|extrahier\w*|auslesen|invoice|contract|vertrag|vertr\u00e4ge|pdf|spreadsheet|tabellenkalkulation|csv|xlsx?|excel|tabellen?|tables?|document|dokument\w*)\b/i,
  },
  {
    taskKey: "web_development",
    pattern:
      /\b(websites?|webseiten?|homepage|landing\s?pages?|landingpages?|web\s?apps?|webshop|onlineshop|html|css|tailwind|frontend)\b/i,
  },
  {
    taskKey: "coding",
    pattern:
      /\b(code|coding|programmier\w*|typescript|javascript|python|bugs?|debug\w*|fehlermeldung\w*|refactor\w*|tests?|apis?|sql|skript\w*|scripts?|funktion\w*|functions?)\b/i,
  },
  {
    taskKey: "web_search",
    pattern:
      /\b(websuche|web\s?search|search|such\w*|recherch\w*|google|im\s+internet|aktuelle?[nrs]?\s+(nachrichten|news|infos)|news)\b/i,
  },
  {
    taskKey: "tool_calling",
    pattern:
      /\b(connect|verbinde\w*|calendar|kalender|termin\w*|meetings?|besprechung\w*|appointments?|agenda|schedul\w*|availabilit\w*|verf(?:ü|ue)gbar\w*|inbox|posteingang|gmail|crm|hubspot|notion|slack|todoist|tools?|mcp|integration\w*|connector\w*|workflow\w*)\b/i,
  },
  {
    taskKey: "german_business_writing",
    pattern:
      /\b(deutsch\w*|german|gesch\u00e4ft\w*|geschaeft\w*|angebot\w*|rechnung\w*|kund(?:e|en|in|innen)|anschreiben)\b/i,
  },
  {
    taskKey: "writing",
    pattern:
      /\b(schreib\w*|verfass\w*|formulier\w*|umschreib\w*|texte?\w*|artikel|blog\w*|linkedin|posts?|newsletter|e-?mail|entwurf|zusammenfass\w*|write|draft|rewrite|essay|summar\w*|\u00fcbersetz\w*)\b/i,
  },
  {
    taskKey: "reasoning",
    pattern:
      /\b(analy[sz]\w*|reason\w*|compare|vergleich\w*|strateg\w*|plan\w*|decision|entscheid\w*|bewert\w*|schlussfolger\w*|durchdenk\w*)\b/i,
  },
];

export function extractRouteSignals(input: {
  text: string;
  attachments?: ChatAttachment[];
  toolCount: number;
  minimumContextTokens?: number;
  requiredRegion?: string;
  requiredRetention?: "zero" | "standard";
}): RouteSignals {
  const hasVisionAttachment = input.attachments?.some((attachment) =>
    attachment.mediaType?.startsWith("image/"),
  );

  if (hasVisionAttachment) {
    return {
      taskKey: "vision",
      requiresTools: input.toolCount > 0,
      requiresVision: true,
      minimumContextTokens: input.minimumContextTokens ?? 0,
      requiredRegion: input.requiredRegion,
      requiredRetention: input.requiredRetention,
    };
  }

  const matched = TASK_PATTERNS.find(({ pattern }) => pattern.test(input.text));

  return {
    taskKey: matched?.taskKey ?? "general_chat",
    requiresTools: input.toolCount > 0,
    requiresVision: false,
    minimumContextTokens: input.minimumContextTokens ?? 0,
    requiredRegion: input.requiredRegion,
    requiredRetention: input.requiredRetention,
  };
}
