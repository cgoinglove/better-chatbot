export interface E2BExecutionImage {
  base64: string;
  format: string;
}

export interface E2BExecutionResult {
  stdout: string;
  stderr: string;
  images: E2BExecutionImage[];
  sessionId: string;
}

export type ArtifactContentType =
  | "python"
  | "html"
  | "react"
  | "svg"
  | "mermaid"
  | "markdown";

export function detectArtifactContentType(code: string): ArtifactContentType {
  const trimmed = code.trim();
  if (trimmed.startsWith("<svg") || trimmed.startsWith("<SVG")) return "svg";
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html"))
    return "html";
  if (
    /^(graph |sequenceDiagram|gantt|erDiagram|flowchart |pie |mindmap|timeline|classDiagram)/m.test(
      trimmed,
    )
  )
    return "mermaid";
  if (
    /import React|from ['"]react['"]|export default function [A-Z]/.test(
      trimmed,
    )
  )
    return "react";
  if (
    trimmed.length > 300 &&
    /^#{1,6} |\*\*[^*]+\*\*|^- [A-Z]|\|.+\|/m.test(trimmed) &&
    !/import |def |class |print\(/.test(trimmed)
  )
    return "markdown";
  return "python";
}

export interface ArtifactData {
  id: string;
  code: string;
  contentType: ArtifactContentType;
  stdout: string;
  stderr?: string;
  images: E2BExecutionImage[];
  title: string;
  sessionId: string;
  downloadUrl?: string;
  downloadFilename?: string;
}
