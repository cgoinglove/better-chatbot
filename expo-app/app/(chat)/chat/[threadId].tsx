import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, router } from "expo-router";
import { Menu, MessageSquarePlus, MoreVertical } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Composer } from "@/components/Composer";
import { MessageList } from "@/components/MessageList";
import { ModelPicker } from "@/components/ModelPicker";
import { ThreadDrawer } from "@/components/ThreadDrawer";
import {
  ErrorBanner,
  IconButton,
  LoadingScreen,
  Screen,
} from "@/components/ui";
import { deleteThread, getModels } from "@/lib/api";
import { useChatController } from "@/hooks/useChatController";
import { useChatStore } from "@/store/chat-store";
import { spacing } from "@/theme";

export default function ChatThreadScreen() {
  const params = useLocalSearchParams<{
    threadId: string;
  }>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const models = useQuery({ queryKey: ["models"], queryFn: getModels });
  const {
    selectedModel,
    setSelectedModel,
    toolChoice,
    pendingFirstMessage,
    setPendingFirstMessage,
    draftAttachments,
    addDraftAttachment,
    removeDraftAttachment,
  } = useChatStore();
  const chat = useChatController({
    threadId: params.threadId,
    chatModel: selectedModel,
    toolChoice,
  });

  useEffect(() => {
    if (!selectedModel && models.data?.length) {
      setSelectedModel(
        models.data.find((model) => model.hasAPIKey !== false) ||
          models.data[0],
      );
    }
  }, [models.data, selectedModel, setSelectedModel]);

  useEffect(() => {
    if (pendingFirstMessage) {
      setPendingFirstMessage(undefined);
      chat.send(pendingFirstMessage);
    }
  }, [chat.send, pendingFirstMessage, setPendingFirstMessage]);

  if (chat.loading && !pendingFirstMessage) {
    return <LoadingScreen label="Loading chat" />;
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
              icon={MessageSquarePlus}
              label="New chat"
              onPress={() => router.replace("/")}
            />
            <IconButton
              icon={MoreVertical}
              label="Thread actions"
              onPress={() => {
                Alert.alert("Thread", undefined, [
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      await deleteThread(params.threadId);
                      router.replace("/");
                    },
                  },
                  { text: "Cancel", style: "cancel" },
                ]);
              }}
            />
          </View>
        </View>
        <ErrorBanner message={chat.error} />
        <MessageList
          messages={chat.messages}
          onDelete={chat.removeMessage}
          onRetry={chat.retryFrom}
        />
        <Composer
          attachments={draftAttachments}
          onAddAttachment={addDraftAttachment}
          onRemoveAttachment={removeDraftAttachment}
          onSend={chat.send}
          onStop={chat.stop}
          streaming={chat.streaming}
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
});
