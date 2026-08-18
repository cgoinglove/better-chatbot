import { appendTextPart, createId } from "./messages";
import type { MessagePart, UIMessage } from "./types";

type UIChunk = Record<string, any> & { type?: string };

function parseSseBuffer(buffer: string) {
  const events = buffer.split(/\n\n+/);
  const rest = events.pop() || "";

  return {
    events: events
      .map((event) => {
        const data = event
          .split(/\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.replace(/^data:\s?/, ""))
          .join("\n");

        return data || event.trim();
      })
      .filter(Boolean),
    rest,
  };
}

function updatePart(
  message: UIMessage,
  predicate: (part: MessagePart) => boolean,
  update: (part: MessagePart) => MessagePart,
) {
  let found = false;
  const parts = message.parts.map((part) => {
    if (!found && predicate(part)) {
      found = true;
      return update(part);
    }
    return part;
  });

  return found ? { ...message, parts } : message;
}

function appendOrUpdatePart(
  message: UIMessage,
  predicate: (part: MessagePart) => boolean,
  create: () => MessagePart,
  update: (part: MessagePart) => MessagePart,
) {
  const updated = updatePart(message, predicate, update);

  if (updated !== message) {
    return updated;
  }

  return { ...message, parts: [...message.parts, create()] };
}

function getToolPartType(chunk: UIChunk) {
  return chunk.dynamic ? "dynamic-tool" : `tool-${chunk.toolName}`;
}

function reduceChunk(message: UIMessage, chunk: UIChunk) {
  switch (chunk.type) {
    case "start":
      return {
        ...message,
        id: typeof chunk.messageId === "string" ? chunk.messageId : message.id,
        metadata: chunk.messageMetadata ?? message.metadata,
      };

    case "message-metadata":
      return { ...message, metadata: chunk.messageMetadata };

    case "finish":
      return {
        ...message,
        metadata: chunk.messageMetadata ?? message.metadata,
        parts: message.parts.map((part) =>
          "state" in part && part.state === "streaming"
            ? { ...part, state: "done" }
            : part,
        ),
      };

    case "text-start":
      return appendOrUpdatePart(
        message,
        (part) => part.type === "text" && (part as any).id === chunk.id,
        () => ({
          id: chunk.id,
          type: "text",
          text: "",
          state: "streaming",
        }),
        (part) => ({ ...part, state: "streaming" }),
      );

    case "text-delta":
      return appendOrUpdatePart(
        message,
        (part) =>
          part.type === "text" &&
          ((chunk.id && (part as any).id === chunk.id) ||
            (part as any).state === "streaming"),
        () => ({
          id: chunk.id || createId("text"),
          type: "text",
          text: chunk.delta || "",
          state: "streaming",
        }),
        (part) => ({
          ...part,
          text: `${(part as any).text || ""}${chunk.delta || ""}`,
          state: "streaming",
        }),
      );

    case "text-end":
      return updatePart(
        message,
        (part) => part.type === "text" && (part as any).id === chunk.id,
        (part) => ({ ...part, state: "done" }),
      );

    case "reasoning-start":
      return appendOrUpdatePart(
        message,
        (part) => part.type === "reasoning" && (part as any).id === chunk.id,
        () => ({
          id: chunk.id,
          type: "reasoning",
          text: "",
          state: "streaming",
        }),
        (part) => ({ ...part, state: "streaming" }),
      );

    case "reasoning-delta":
      return appendOrUpdatePart(
        message,
        (part) =>
          part.type === "reasoning" &&
          ((chunk.id && (part as any).id === chunk.id) ||
            (part as any).state === "streaming"),
        () => ({
          id: chunk.id || createId("reasoning"),
          type: "reasoning",
          text: chunk.delta || "",
          state: "streaming",
        }),
        (part) => ({
          ...part,
          text: `${(part as any).text || ""}${chunk.delta || ""}`,
          state: "streaming",
        }),
      );

    case "reasoning-end":
      return updatePart(
        message,
        (part) => part.type === "reasoning" && (part as any).id === chunk.id,
        (part) => ({ ...part, state: "done" }),
      );

    case "source-url":
      return {
        ...message,
        parts: [
          ...message.parts,
          {
            type: "source-url",
            sourceId: chunk.sourceId,
            url: chunk.url,
            title: chunk.title,
          },
        ],
      };

    case "source-document":
      return {
        ...message,
        parts: [
          ...message.parts,
          {
            type: "source-document",
            sourceId: chunk.sourceId,
            mediaType: chunk.mediaType,
            title: chunk.title,
            filename: chunk.filename,
          },
        ],
      };

    case "file":
      return {
        ...message,
        parts: [
          ...message.parts,
          {
            type: "file",
            url: chunk.url,
            mediaType: chunk.mediaType,
            filename: chunk.filename,
          },
        ],
      };

    case "tool-input-start":
      return appendOrUpdatePart(
        message,
        (part) => (part as any).toolCallId === chunk.toolCallId,
        () => ({
          type: getToolPartType(chunk),
          toolName: chunk.toolName,
          toolCallId: chunk.toolCallId,
          state: "input-streaming",
          input: "",
        }),
        (part) => ({
          ...part,
          state: "input-streaming",
          toolName: chunk.toolName,
        }),
      );

    case "tool-input-delta":
      return updatePart(
        message,
        (part) => (part as any).toolCallId === chunk.toolCallId,
        (part) => ({
          ...part,
          input: `${(part as any).input || ""}${chunk.inputTextDelta || ""}`,
          state: "input-streaming",
        }),
      );

    case "tool-input-available":
      return appendOrUpdatePart(
        message,
        (part) => (part as any).toolCallId === chunk.toolCallId,
        () => ({
          type: getToolPartType(chunk),
          toolName: chunk.toolName,
          toolCallId: chunk.toolCallId,
          state: "input-available",
          input: chunk.input,
        }),
        (part) => ({
          ...part,
          type: getToolPartType(chunk),
          toolName: chunk.toolName,
          state: "input-available",
          input: chunk.input,
        }),
      );

    case "tool-output-available":
      return updatePart(
        message,
        (part) => (part as any).toolCallId === chunk.toolCallId,
        (part) => ({
          ...part,
          state: "output-available",
          output: chunk.output,
        }),
      );

    case "tool-input-error":
    case "tool-output-error":
      return updatePart(
        message,
        (part) => (part as any).toolCallId === chunk.toolCallId,
        (part) => ({
          ...part,
          state: "output-error",
          errorText: chunk.errorText || "Tool failed",
        }),
      );

    case "start-step":
      return {
        ...message,
        parts: [...message.parts, { type: "step-start" }],
      };

    case "error":
      throw new Error(chunk.errorText || "Stream failed");

    case "abort":
      return message;

    default:
      if (chunk.type?.startsWith("data-")) {
        return {
          ...message,
          parts: [...message.parts, chunk as MessagePart],
        };
      }
      return message;
  }
}

function consumePayload(payload: string, message: UIMessage) {
  if (!payload || payload === "[DONE]") {
    return message;
  }

  try {
    return reduceChunk(message, JSON.parse(payload));
  } catch (error) {
    const legacy = payload.match(/^\d+:"(.*)"$/);
    if (legacy?.[1]) {
      return appendTextPart(message, JSON.parse(`"${legacy[1]}"`));
    }
    throw error;
  }
}

export async function readUiMessageStream(
  response: Response,
  seed: UIMessage,
  update: (message: UIMessage) => void,
) {
  if (!response.body) {
    const text = await response.text();
    update(appendTextPart(seed, text));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let message = seed;
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseBuffer(buffer);
    buffer = parsed.rest;

    for (const event of parsed.events) {
      message = consumePayload(event, message);
      update(message);
    }
  }

  if (buffer.trim()) {
    message = consumePayload(buffer.trim().replace(/^data:\s?/, ""), message);
    update(message);
  }
}
