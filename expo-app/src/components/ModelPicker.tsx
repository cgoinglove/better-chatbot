import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getModels } from "@/lib/api";
import type { ChatModel } from "@/lib/types";
import { colors, radii, shadows, spacing, typography } from "@/theme";

function modelLabel(model?: ChatModel) {
  if (!model) return "Model";
  return model.name || model.label || `${model.provider}/${model.model}`;
}

export function ModelPicker({
  selectedModel,
  onSelect,
}: {
  selectedModel?: ChatModel;
  onSelect: (model: ChatModel) => void;
}) {
  const [open, setOpen] = useState(false);
  const models = useQuery({ queryKey: ["models"], queryFn: getModels });
  const enabledModels = useMemo(
    () => (models.data || []).filter((model) => model.hasAPIKey !== false),
    [models.data],
  );

  return (
    <>
      <Pressable
        accessibilityLabel="Choose model"
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text numberOfLines={1} style={styles.triggerText}>
          {modelLabel(selectedModel)}
        </Text>
        <ChevronDown color={colors.mutedForeground} size={16} />
      </Pressable>
      <Modal
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        transparent
        visible={open}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.menu, shadows.floating]}>
          <Text style={styles.title}>Model</Text>
          <ScrollView contentContainerStyle={styles.list}>
            {(enabledModels.length ? enabledModels : models.data || []).map(
              (model) => {
                const selected =
                  selectedModel?.provider === model.provider &&
                  selectedModel?.model === model.model;
                return (
                  <Pressable
                    key={`${model.provider}:${model.model}`}
                    onPress={() => {
                      onSelect(model);
                      setOpen(false);
                    }}
                    style={styles.row}
                  >
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{modelLabel(model)}</Text>
                      <Text style={styles.rowSub}>
                        {model.provider}/{model.model}
                      </Text>
                    </View>
                    {selected ? (
                      <Check color={colors.success} size={20} />
                    ) : null}
                  </Pressable>
                );
              },
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    maxWidth: 220,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
  },
  triggerText: {
    flexShrink: 1,
    color: colors.foreground,
    ...typography.label,
    fontSize: 18,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.68,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  menu: {
    position: "absolute",
    top: 78,
    left: spacing.screenX,
    right: spacing.screenX,
    maxHeight: 360,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.popover,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  title: {
    color: colors.mutedForeground,
    paddingHorizontal: 10,
    ...typography.caption,
    fontWeight: "700",
  },
  list: {
    paddingBottom: 4,
    gap: 6,
  },
  row: {
    minHeight: 48,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    color: colors.foreground,
    ...typography.label,
  },
  rowSub: {
    color: colors.mutedForeground,
    ...typography.caption,
  },
});
