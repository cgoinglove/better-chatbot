import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Plus, Send, Square, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { uploadAttachment } from "@/lib/api";
import type { ChatAttachment } from "@/lib/types";
import { colors, radii, shadows, spacing, typography } from "@/theme";
import { IconButton } from "./ui";

export function Composer({
  disabled,
  streaming,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  onSend,
  onStop,
  placeholder = "Message",
}: {
  disabled?: boolean;
  streaming?: boolean;
  attachments: ChatAttachment[];
  onAddAttachment: (attachment: ChatAttachment) => void;
  onRemoveAttachment: (url: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const canSend = text.trim().length > 0 && !disabled && !streaming;
  const webTextInputProps =
    Platform.OS === "web"
      ? ({
          dataSet: {
            gramm: "false",
            grammEditor: "false",
            enableGrammarly: "false",
          },
        } as Record<string, unknown>)
      : {};

  async function handleUploadDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setUploading(true);
      const attachment = await uploadAttachment({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType,
      });
      onAddAttachment(attachment);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      Alert.alert("Upload failed", error.message || "Could not upload file");
    } finally {
      setUploading(false);
    }
  }

  async function handleUploadImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setUploading(true);
      const attachment = await uploadAttachment({
        uri: asset.uri,
        name: asset.fileName || `image-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
      onAddAttachment(attachment);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      Alert.alert("Upload failed", error.message || "Could not upload image");
    } finally {
      setUploading(false);
    }
  }

  function handleAddAttachment() {
    setAttachmentMenuOpen(true);
  }

  return (
    <View style={styles.outer}>
      <Modal
        animationType="fade"
        onRequestClose={() => setAttachmentMenuOpen(false)}
        transparent
        visible={attachmentMenuOpen}
      >
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setAttachmentMenuOpen(false)}
        />
        <View style={styles.attachmentMenu}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setAttachmentMenuOpen(false);
              handleUploadImage();
            }}
            style={styles.menuItem}
          >
            <Text style={styles.menuText}>Photo Library</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setAttachmentMenuOpen(false);
              handleUploadDocument();
            }}
            style={styles.menuItem}
          >
            <Text style={styles.menuText}>File</Text>
          </Pressable>
        </View>
      </Modal>
      <View style={[styles.wrap, shadows.floating]}>
        {attachments.length ? (
          <View style={styles.tray}>
            {attachments.map((attachment) => (
              <View key={attachment.url} style={styles.chip}>
                <Text numberOfLines={1} style={styles.chipText}>
                  {attachment.filename || attachment.url}
                </Text>
                <Pressable
                  accessibilityLabel="Remove attachment"
                  onPress={() => onRemoveAttachment(attachment.url)}
                  style={styles.chipRemove}
                >
                  <X color={colors.mutedForeground} size={14} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.toolbar}>
          <View style={styles.actionSlot}>
            <IconButton
              disabled={disabled || uploading}
              icon={Plus}
              label="Add attachment"
              onPress={handleAddAttachment}
            />
          </View>
          <View style={styles.inputWrap}>
            <TextInput
              {...webTextInputProps}
              autoCorrect={false}
              autoComplete="off"
              editable={!disabled}
              multiline
              onBlur={() => setFocused(false)}
              onChangeText={setText}
              onFocus={() => setFocused(true)}
              placeholder=""
              style={styles.input}
              spellCheck={false}
              textAlignVertical="center"
              value={text}
            />
            {!text && !focused ? (
              <Text pointerEvents="none" style={styles.placeholder}>
                {placeholder}
              </Text>
            ) : null}
          </View>
          <View style={styles.actionSlot}>
            {uploading ? (
              <View style={styles.action}>
                <ActivityIndicator color={colors.foreground} size="small" />
              </View>
            ) : streaming ? (
              <View style={styles.stopButton}>
                <IconButton
                  icon={Square}
                  label="Stop streaming"
                  onPress={onStop}
                />
              </View>
            ) : (
              <View
                style={[styles.sendButton, !canSend && styles.sendDisabled]}
              >
                <IconButton
                  color={colors.primaryForeground}
                  disabled={!canSend}
                  icon={Send}
                  label="Send message"
                  onPress={async () => {
                    const value = text.trim();
                    if (!value) return;
                    setText("");
                    await Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Medium,
                    );
                    onSend(value);
                  }}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: "100%",
    maxWidth: spacing.maxContent,
    alignSelf: "center",
    paddingHorizontal: spacing.screenX,
    paddingBottom: 12,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
  attachmentMenu: {
    position: "absolute",
    left: spacing.screenX + 8,
    bottom: 74,
    minWidth: 176,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.popover,
    paddingVertical: 6,
    ...shadows.floating,
  },
  menuItem: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  menuText: {
    color: colors.foreground,
    ...typography.bodySm,
  },
  wrap: {
    borderRadius: radii["4xl"],
    backgroundColor: colors.mutedSoft,
    paddingHorizontal: 8,
    paddingVertical: 8,
    overflow: "hidden",
  },
  tray: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    maxWidth: "100%",
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.input,
    paddingHorizontal: 10,
  },
  chipText: {
    maxWidth: 220,
    color: colors.foreground,
    ...typography.caption,
  },
  chipRemove: {
    minWidth: 24,
    minHeight: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbar: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionSlot: {
    width: spacing.icon,
    height: spacing.icon,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  input: {
    width: "100%",
    maxHeight: 132,
    minHeight: 40,
    color: colors.foreground,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.transparent,
    textAlign: "left",
    ...(Platform.OS === "web"
      ? ({
          outlineStyle: "none",
          outlineWidth: 0,
        } as Record<string, unknown>)
      : null),
    ...typography.body,
  },
  placeholder: {
    position: "absolute",
    left: 6,
    right: 6,
    top: "50%",
    color: colors.mutedForeground,
    transform: [{ translateY: -12 }],
    ...typography.body,
  },
  action: {
    width: spacing.icon,
    height: spacing.icon,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButton: {
    width: spacing.icon,
    height: spacing.icon,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stopButton: {
    width: spacing.icon,
    height: spacing.icon,
    borderRadius: radii.pill,
    backgroundColor: colors.input,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.5,
  },
});
