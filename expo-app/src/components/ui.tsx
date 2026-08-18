import type { ComponentType, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import { colors, radii, shadows, spacing, typography } from "@/theme";

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  icon?: ComponentType<{ size: number; color: string }>;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
  icon: Icon,
  style,
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isDestructive = variant === "destructive";
  const isGhost = variant === "ghost";
  const foreground =
    isPrimary || isDestructive ? colors.primaryForeground : colors.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.secondaryButton,
        isGhost && styles.ghostButton,
        isDestructive && styles.destructiveButton,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : Icon ? (
        <Icon color={foreground} size={16} />
      ) : null}
      <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

type IconButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  icon: ComponentType<{ size: number; color: string }>;
  destructive?: boolean;
  color?: string;
};

export function IconButton({
  label,
  onPress,
  disabled,
  icon: Icon,
  destructive,
  color,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        destructive && styles.iconButtonDestructive,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Icon
        color={color || (destructive ? colors.destructive : colors.foreground)}
        size={16}
      />
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, props.multiline && styles.textarea]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

export function LoadingScreen({ label = "Loading" }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.foreground} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function Screen({
  children,
  inset = true,
}: {
  children: ReactNode;
  inset?: boolean;
}) {
  return (
    <View style={[styles.screen, inset && styles.screenInset]}>{children}</View>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text
              style={[
                styles.segmentLabel,
                selected && styles.segmentLabelSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenInset: {
    padding: spacing.screenX,
  },
  button: {
    minHeight: spacing.control,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    ...shadows.control,
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowOpacity: 0,
  },
  ghostButton: {
    backgroundColor: colors.transparent,
    shadowOpacity: 0,
  },
  destructiveButton: {
    backgroundColor: colors.destructive,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.72,
  },
  buttonText: {
    ...typography.label,
  },
  iconButton: {
    width: spacing.icon,
    height: spacing.icon,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.transparent,
  },
  iconButtonDestructive: {
    backgroundColor: colors.destructiveSoft,
  },
  field: {
    gap: 8,
  },
  label: {
    color: colors.foreground,
    ...typography.label,
  },
  input: {
    minHeight: 36,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.input,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    color: colors.foreground,
    ...typography.body,
  },
  textarea: {
    minHeight: 64,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  errorText: {
    color: colors.destructive,
    fontSize: 12,
  },
  errorBanner: {
    borderRadius: radii.md,
    backgroundColor: colors.destructiveSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.destructive,
    padding: 12,
  },
  errorBannerText: {
    color: colors.destructive,
    ...typography.bodySm,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.background,
  },
  muted: {
    color: colors.mutedForeground,
  },
  segmented: {
    minHeight: 36,
    flexDirection: "row",
    borderRadius: radii.md,
    backgroundColor: colors.muted,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
  },
  segmentSelected: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  segmentLabel: {
    color: colors.mutedForeground,
    ...typography.caption,
    fontWeight: "500",
  },
  segmentLabelSelected: {
    color: colors.foreground,
  },
});
