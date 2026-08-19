import { describe, expect, it } from "vitest";
import { extractRouteSignals } from "./signals";

const signals = (text: string) =>
  extractRouteSignals({ text, toolCount: 1 }).taskKey;

describe("extractRouteSignals", () => {
  it("routes website building before generic coding keywords", () => {
    expect(signals("Erstelle eine Webseite mit HTML, CSS und JavaScript")).toBe(
      "web_development",
    );
    expect(signals("Build a landing page for my shop")).toBe("web_development");
  });

  it("routes coding requests, including German phrasing before writing", () => {
    expect(signals("Fix this TypeScript bug")).toBe("coding");
    expect(signals("Schreibe ein Python Skript")).toBe("coding");
  });

  it("routes research phrasing to web_search before tool nouns", () => {
    expect(
      signals("Suche im Internet nach aktuellen Nachrichten zum Bahnstreik"),
    ).toBe("web_search");
    expect(signals("Websuche: beste CRM Tools")).toBe("web_search");
  });

  it("routes connected-tool requests to tool_calling", () => {
    expect(signals("Verbinde meinen Kalender")).toBe("tool_calling");
    expect(signals("Trage einen Termin für Montag ein")).toBe("tool_calling");
  });

  it("routes meeting and availability phrasing to tool_calling", () => {
    expect(signals("any process audit meeting next week?")).toBe(
      "tool_calling",
    );
    expect(signals("Wann ist die nächste Besprechung?")).toBe("tool_calling");
    expect(signals("schedule a call with Hagen")).toBe("tool_calling");
    expect(signals("wann bin ich nächste Woche verfügbar?")).toBe(
      "tool_calling",
    );
    expect(signals("check my inbox")).toBe("tool_calling");
  });

  it("routes table and document work to document_extraction", () => {
    expect(signals("Extrahiere die Tabelle aus der PDF")).toBe(
      "document_extraction",
    );
    expect(signals("Erstelle eine Excel Tabelle mit den Quartalszahlen")).toBe(
      "document_extraction",
    );
  });

  it("routes writing, with business writing taking precedence", () => {
    expect(signals("Schreibe einen LinkedIn Post über KI")).toBe("writing");
    expect(signals("Schreibe ein Angebot für einen Kunden")).toBe(
      "german_business_writing",
    );
  });

  it("routes analytical requests to reasoning", () => {
    expect(signals("Analysiere und vergleiche die beiden Strategien")).toBe(
      "reasoning",
    );
  });

  it("falls back to general_chat", () => {
    expect(signals("Hallo, wie geht es dir?")).toBe("general_chat");
  });

  it("short-circuits to vision for image attachments", () => {
    const result = extractRouteSignals({
      text: "Erstelle eine Webseite",
      attachments: [{ mediaType: "image/png", url: "u" } as never],
      toolCount: 0,
    });
    expect(result.taskKey).toBe("vision");
    expect(result.requiresVision).toBe(true);
  });

  it("mirrors tool availability into requiresTools", () => {
    expect(
      extractRouteSignals({ text: "Hi", toolCount: 0 }).requiresTools,
    ).toBe(false);
    expect(
      extractRouteSignals({ text: "Hi", toolCount: 3 }).requiresTools,
    ).toBe(true);
  });
});
