import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { FlashList } from "@shopify/flash-list";
import { Copy, RotateCcw, Trash2 } from "lucide-react-native";
import Markdown from "react-native-markdown-display";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { getMessageText } from "@/lib/messages";
import type { UIMessage } from "@/lib/types";
import { colors, radii, spacing, typography } from "@/theme";
import { IconButton } from "./ui";

function PartView({ part }: { part: Record<string, any> }) {
  if (part.type === "text") {
    return (
      <Markdown
        style={{
          body: styles.markdownBody,
          paragraph: styles.markdownParagraph,
          code_inline: styles.inlineCode,
          code_block: styles.codeBlock,
          fence: styles.codeBlock,
          bullet_list: styles.markdownList,
          ordered_list: styles.markdownList,
        }}
      >
        {part.text || ""}
      </Markdown>
    );
  }

  if (part.type === "reasoning") {
    return (
      <View style={styles.reasoning}>
        <Text style={styles.partLabel}>Thinking</Text>
        <Text style={styles.partText}>{part.text || part.reasoning || ""}</Text>
      </View>
    );
  }

  if (part.type === "file" || part.type === "source-url") {
    return (
      <View style={styles.fileChip}>
        <Text numberOfLines={1} style={styles.fileText}>
          {part.filename || part.title || part.url}
        </Text>
      </View>
    );
  }

  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    return (
      <View style={styles.toolCard}>
        <Text style={styles.partLabel}>{part.type.replace("tool-", "")}</Text>
        <Text numberOfLines={5} style={styles.partText}>
          {JSON.stringify(part.output || part.input || part, null, 2)}
        </Text>
      </View>
    );
  }

  return null;
}

function MessageItem({
  message,
  onDelete,
  onRetry,
}: {
  message: UIMessage;
  onDelete?: (message: UIMessage) => void;
  onRetry?: (message: UIMessage) => void;
}) {
  const isUser = message.role === "user";
  const text = getMessageText(message);

  return (
    <Pressable
      onLongPress={() => {
        Alert.alert("Message", undefined, [
          {
            text: "Copy",
            onPress: async () => {
              await Clipboard.setStringAsync(text);
              await Haptics.selectionAsync();
            },
          },
          ...(onRetry && message.role === "assistant"
            ? [{ text: "Retry", onPress: () => onRetry(message) }]
            : []),
          ...(onDelete
            ? [
                {
                  text: "Delete",
                  style: "destructive" as const,
                  onPress: () => onDelete(message),
                },
              ]
            : []),
          { text: "Cancel", style: "cancel" },
        ]);
      }}
      style={[styles.message, isUser && styles.userMessage]}
    >
      <View style={[styles.bubble, isUser && styles.userBubble]}>
        {message.parts.map((part, index) => (
          <PartView key={`${message.id}-${index}`} part={part as any} />
        ))}
      </View>
      {!isUser ? (
        <View style={styles.actions}>
          <IconButton
            icon={Copy}
            label="Copy message"
            onPress={async () => Clipboard.setStringAsync(text)}
          />
          {onRetry ? (
            <IconButton
              icon={RotateCcw}
              label="Regenerate message"
              onPress={() => onRetry(message)}
            />
          ) : null}
          {onDelete ? (
            <IconButton
              destructive
              icon={Trash2}
              label="Delete message"
              onPress={() => onDelete(message)}
            />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export function MessageList({
  messages,
  onDelete,
  onRetry,
}: {
  messages: UIMessage[];
  onDelete?: (message: UIMessage) => void;
  onRetry?: (message: UIMessage) => void;
}) {
  return (
    <FlashList
      contentContainerStyle={styles.content}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MessageItem message={item} onDelete={onDelete} onRetry={onRetry} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.pageX,
    paddingTop: 12,
    paddingBottom: 24,
    maxWidth: spacing.maxContent,
    width: "100%",
    alignSelf: "center",
  },
  message: {
    marginBottom: 20,
    alignItems: "flex-start",
    gap: 8,
  },
  userMessage: {
    alignItems: "flex-end",
  },
  bubble: {
    maxWidth: "100%",
    gap: 8,
  },
  userBubble: {
    maxWidth: "88%",
    borderRadius: radii["2xl"],
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  markdownBody: {
    color: colors.foreground,
    ...typography.body,
  },
  markdownParagraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  markdownList: {
    marginBottom: 8,
  },
  inlineCode: {
    backgroundColor: colors.muted,
    color: colors.foreground,
    borderRadius: radii.sm,
  },
  codeBlock: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    color: colors.foreground,
    padding: 12,
    ...typography.bodySm,
  },
  actions: {
    flexDirection: "row",
    gap: 2,
    opacity: 0.72,
  },
  reasoning: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: 12,
    gap: 4,
  },
  toolCard: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
    gap: 6,
  },
  partLabel: {
    color: colors.mutedForeground,
    ...typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  partText: {
    color: colors.foreground,
    ...typography.bodySm,
  },
  fileChip: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.muted,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  fileText: {
    color: colors.foreground,
    ...typography.caption,
  },
});
