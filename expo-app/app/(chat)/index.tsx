import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Globe2,
  Image,
  LogOut,
  Menu,
  MessageSquarePlus,
  ShieldQuestion,
  Sparkles,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Composer } from "@/components/Composer";
import { ModelPicker } from "@/components/ModelPicker";
import { ThreadDrawer } from "@/components/ThreadDrawer";
import { ErrorBanner, IconButton, Screen } from "@/components/ui";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getModels } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { createThreadId, getGreeting } from "@/lib/messages";
import { useChatStore } from "@/store/chat-store";
import { colors, radii, spacing, typography } from "@/theme";

const SUGGESTIONS = [
  {
    icon: Sparkles,
    label: "Help me write",
    prompt: "Help me write a concise update for my team.",
  },
  {
    icon: Image,
    label: "Create an image",
    prompt: "Create an image of a calm futuristic workspace.",
  },
  {
    icon: Globe2,
    label: "Look something up",
    prompt: "Look up the latest practical guidance on Expo app releases.",
  },
];

export default function NewChatScreen() {
  const queryClient = useQueryClient();
  const session = useAuthSession();
  const models = useQuery({ queryKey: ["models"], queryFn: getModels });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const {
    selectedModel,
    setSelectedModel,
    setPendingFirstMessage,
    draftAttachments,
    addDraftAttachment,
    removeDraftAttachment,
  } = useChatStore();

  useEffect(() => {
    if (!selectedModel && models.data?.length) {
      setSelectedModel(
        models.data.find((model) => model.hasAPIKey !== false) ||
          models.data[0],
      );
    }
  }, [models.data, selectedModel, setSelectedModel]);

  const greeting = useMemo(
    () => getGreeting(session.user?.name),
    [session.user?.name],
  );

  function sendFirstMessage(text: string) {
    const threadId = createThreadId();
    setPendingFirstMessage(text);
    router.push({ pathname: "/chat/[threadId]", params: { threadId } });
  }

  return (
    <Screen inset={false}>
      <ThreadDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrap}
      >
        <View style={styles.header}>
          <IconButton
            icon={Menu}
            label="Open chats"
            onPress={() => setDrawerOpen(true)}
          />
          <ModelPicker
            selectedModel={selectedModel}
            onSelect={setSelectedModel}
          />
          <View style={styles.headerActions}>
            <IconButton
              icon={ShieldQuestion}
              label="Temporary chat"
              onPress={() => router.push("/temporary")}
            />
            <IconButton
              icon={LogOut}
              label="Sign out"
              onPress={async () => {
                await authClient.signOut();
                await queryClient.clear();
                router.replace("/sign-in");
              }}
            />
          </View>
        </View>
        <View style={styles.body}>
          <View style={styles.greetingWrap}>
            <MessageSquarePlus color={colors.mutedForeground} size={28} />
            <Text style={styles.greeting}>{greeting}</Text>
          </View>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
              <Pressable
                accessibilityRole="button"
                key={label}
                onPress={() => sendFirstMessage(prompt)}
                style={({ pressed }) => [
                  styles.suggestion,
                  pressed && styles.pressed,
                ]}
              >
                <Icon color={colors.mutedForeground} size={22} />
                <Text style={styles.suggestionText}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <ErrorBanner
            message={models.error ? "Could not load models" : null}
          />
        </View>
        <Composer
          attachments={draftAttachments}
          onAddAttachment={addDraftAttachment}
          onRemoveAttachment={removeDraftAttachment}
          onSend={sendFirstMessage}
          onStop={() => undefined}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: spacing.screenX,
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  body: {
    flex: 1,
    justifyContent: "flex-end",
    width: "100%",
    maxWidth: spacing.maxContent,
    alignSelf: "center",
    paddingHorizontal: spacing.pageX,
    paddingBottom: 26,
    gap: 22,
  },
  greetingWrap: {
    alignItems: "center",
    gap: 10,
  },
  greeting: {
    color: colors.foreground,
    textAlign: "center",
    ...typography.title,
  },
  suggestions: {
    gap: 4,
  },
  suggestion: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: radii.md,
    paddingHorizontal: 2,
  },
  suggestionText: {
    color: colors.mutedForeground,
    ...typography.body,
  },
  pressed: {
    opacity: 0.64,
  },
});
