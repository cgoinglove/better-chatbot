import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday, subDays } from "date-fns";
import { Plus, Trash2, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";
import { deleteThread, getThreads, renameThread } from "@/lib/api";
import type { ChatThread } from "@/lib/types";
import { colors, radii, spacing, typography } from "@/theme";
import { Button, IconButton } from "./ui";

function groupLabel(thread: ChatThread) {
  const source = thread.lastMessageAt || new Date(thread.createdAt).getTime();
  const date = new Date(source);

  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (date >= subDays(new Date(), 7)) return "Last Week";
  return "Older";
}

export function ThreadDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.86, 360);
  const [visible, setVisible] = useState(open);
  const slideX = useRef(new Animated.Value(-drawerWidth)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const queryClient = useQueryClient();
  const threads = useQuery({ queryKey: ["threads"], queryFn: getThreads });
  const [renameTarget, setRenameTarget] = useState<ChatThread | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const groups = useMemo(() => {
    const result = new Map<string, ChatThread[]>();
    for (const thread of threads.data || []) {
      const label = groupLabel(thread);
      result.set(label, [...(result.get(label) || []), thread]);
    }
    return Array.from(result.entries());
  }, [threads.data]);

  useEffect(() => {
    if (open) {
      setVisible(true);
      slideX.setValue(-drawerWidth);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!visible) return;

    Animated.parallel([
      Animated.timing(slideX, {
        toValue: -drawerWidth,
        duration: 190,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setVisible(false);
      }
    });
  }, [drawerWidth, opacity, open, slideX, visible]);

  async function handleDelete(thread: ChatThread) {
    await deleteThread(thread.id);
    await queryClient.invalidateQueries({ queryKey: ["threads"] });
  }

  function handleThreadActions(thread: ChatThread) {
    Alert.alert(thread.title || "Untitled chat", undefined, [
      {
        text: "Rename",
        onPress: () => {
          setRenameTarget(thread);
          setRenameTitle(thread.title);
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDelete(thread),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <>
      <Modal
        animationType="none"
        onRequestClose={onClose}
        transparent
        visible={visible}
      >
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateX: slideX }], width: drawerWidth },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Chats</Text>
            <IconButton icon={X} label="Close chats" onPress={onClose} />
          </View>
          <Button
            icon={Plus}
            label="New chat"
            onPress={() => {
              onClose();
              router.replace("/");
            }}
          />
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={threads.isFetching}
                onRefresh={threads.refetch}
              />
            }
          >
            {groups.map(([label, items]) => (
              <View key={label} style={styles.group}>
                <Text style={styles.groupLabel}>{label}</Text>
                {items.map((thread) => (
                  <Pressable
                    key={thread.id}
                    onLongPress={() => handleThreadActions(thread)}
                    onPress={() => {
                      onClose();
                      router.push(`/chat/${thread.id}`);
                    }}
                    style={styles.thread}
                  >
                    <View style={styles.threadText}>
                      <Text numberOfLines={1} style={styles.threadTitle}>
                        {thread.title || "Untitled chat"}
                      </Text>
                      <Text style={styles.threadDate}>
                        {format(
                          new Date(thread.lastMessageAt || thread.createdAt),
                          "MMM d, h:mm a",
                        )}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityLabel="Delete thread"
                      onPress={() => handleDelete(thread)}
                      style={styles.delete}
                    >
                      <Trash2 color={colors.destructive} size={17} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            ))}
            {!groups.length && !threads.isFetching ? (
              <Text style={styles.empty}>No chats yet</Text>
            ) : null}
          </ScrollView>
        </Animated.View>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={() => setRenameTarget(null)}
        transparent
        visible={Boolean(renameTarget)}
      >
        <View style={styles.renameBackdrop}>
          <View style={styles.renameBox}>
            <Text style={styles.renameTitle}>Rename chat</Text>
            <TextInput
              autoFocus
              onChangeText={setRenameTitle}
              placeholder="Chat title"
              placeholderTextColor={colors.mutedForeground}
              style={styles.renameInput}
              value={renameTitle}
            />
            <View style={styles.renameActions}>
              <Button
                label="Cancel"
                onPress={() => setRenameTarget(null)}
                variant="secondary"
              />
              <Button
                label="Save"
                onPress={async () => {
                  if (!renameTarget || !renameTitle.trim()) return;
                  await renameThread(renameTarget.id, renameTitle.trim());
                  await queryClient.invalidateQueries({
                    queryKey: ["threads"],
                  });
                  setRenameTarget(null);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.sidebar,
    paddingTop: 54,
    paddingHorizontal: spacing.screenX,
    gap: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: colors.foreground,
    ...typography.h2,
  },
  list: {
    paddingBottom: 32,
    gap: 18,
  },
  group: {
    gap: 8,
  },
  groupLabel: {
    color: colors.mutedForeground,
    ...typography.caption,
  },
  thread: {
    minHeight: 44,
    borderRadius: radii.md,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  threadText: {
    flex: 1,
    gap: 4,
  },
  threadTitle: {
    color: colors.foreground,
    ...typography.bodySm,
  },
  threadDate: {
    color: colors.mutedForeground,
    ...typography.caption,
  },
  delete: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    color: colors.mutedForeground,
    textAlign: "center",
    paddingTop: 24,
  },
  renameBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.overlay,
    padding: 24,
  },
  renameBox: {
    width: "100%",
    borderRadius: radii.md,
    backgroundColor: colors.background,
    padding: 16,
    gap: 14,
  },
  renameTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "800",
  },
  renameInput: {
    minHeight: 46,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.input,
    color: colors.foreground,
    paddingHorizontal: 12,
    ...typography.body,
  },
  renameActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
});
