import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ArrowLeft, Eraser } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Composer } from "@/components/Composer";
import { MessageList } from "@/components/MessageList";
import { ModelPicker } from "@/components/ModelPicker";
import { ErrorBanner, IconButton, Screen } from "@/components/ui";
import { useChatController } from "@/hooks/useChatController";
import { getModels } from "@/lib/api";
import { createThreadId } from "@/lib/messages";
import { useChatStore } from "@/store/chat-store";
import { colors, radii, spacing, typography } from "@/theme";

export default function TemporaryChatScreen() {
  const [temporaryId, setTemporaryId] = useState(createThreadId());
  const models = useQuery({ queryKey: ["models"], queryFn: getModels });
  const {
    selectedModel,
    setSelectedModel,
    toolChoice,
    temporaryInstructions,
    setTemporaryInstructions,
    draftAttachments,
    addDraftAttachment,
    removeDraftAttachment,
  } = useChatStore();
  const chat = useChatController({
    threadId: temporaryId,
    temporary: true,
    chatModel: selectedModel,
    toolChoice,
    temporaryInstructions,
  });

  useEffect(() => {
    if (!selectedModel && models.data?.length) {
      setSelectedModel(
        models.data.find((model) => model.hasAPIKey !== false) ||
          models.data[0],
      );
    }
  }, [models.data, selectedModel, setSelectedModel]);

  return (
    <Screen inset={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrap}
      >
        <View style={styles.header}>
          <IconButton
            icon={ArrowLeft}
            label="Back"
            onPress={() => router.back()}
          />
          <ModelPicker
            selectedModel={selectedModel}
            onSelect={setSelectedModel}
          />
          <IconButton
            icon={Eraser}
            label="Clear temporary chat"
            onPress={() => setTemporaryId(createThreadId())}
          />
        </View>
        <View style={styles.instructionsWrap}>
          <Text style={styles.temporaryLabel}>Temporary chat</Text>
          <TextInput
            multiline
            onChangeText={setTemporaryInstructions}
            placeholder="Temporary instructions"
            placeholderTextColor={colors.mutedForeground}
            style={styles.instructions}
            value={temporaryInstructions}
          />
        </View>
        <ErrorBanner message={chat.error} />
        <MessageList messages={chat.messages} onDelete={chat.removeMessage} />
        <Composer
          attachments={draftAttachments}
          onAddAttachment={addDraftAttachment}
          onRemoveAttachment={removeDraftAttachment}
          onSend={chat.send}
          onStop={chat.stop}
          placeholder="Temporary message"
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
  instructionsWrap: {
    width: "100%",
    maxWidth: spacing.maxContent,
    alignSelf: "center",
    paddingHorizontal: spacing.screenX,
    paddingBottom: 8,
    gap: 8,
  },
  temporaryLabel: {
    color: colors.mutedForeground,
    ...typography.caption,
  },
  instructions: {
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.input,
    color: colors.foreground,
    paddingHorizontal: 12,
    paddingTop: 10,
    ...typography.bodySm,
  },
});
