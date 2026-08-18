import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ArrowLeft, ArrowRight, Check, Mail } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button, ErrorBanner, Field, Screen } from "@/components/ui";
import { getAuthConfig } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { colors, spacing, typography } from "@/theme";

function passwordChecks(password: string) {
  return [
    {
      label: "8-20 characters",
      valid: password.length >= 8 && password.length <= 20,
    },
    { label: "One letter", valid: /[A-Za-z]/.test(password) },
    { label: "One number", valid: /\d/.test(password) },
  ];
}

export default function SignUpScreen() {
  const config = useQuery({
    queryKey: ["auth-config"],
    queryFn: getAuthConfig,
  });
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checks = useMemo(() => passwordChecks(password), [password]);
  const passwordValid = checks.every((check) => check.valid);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.signUp.email({ email, name, password });
      if (result?.error) {
        throw new Error(result.error.message || "Could not create account");
      }
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrap}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            {config.data?.isFirstUser
              ? "The first user will become the initial admin."
              : "Use the same account across web and mobile."}
          </Text>
        </View>
        <ErrorBanner message={error} />
        {step === 0 ? (
          <Field
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            value={email}
          />
        ) : null}
        {step === 1 ? (
          <Field
            autoCapitalize="words"
            label="Name"
            onChangeText={setName}
            value={name}
          />
        ) : null}
        {step === 2 ? (
          <View style={styles.form}>
            <Field
              autoComplete="new-password"
              label="Password"
              onChangeText={setPassword}
              secureTextEntry
              value={password}
            />
            <View style={styles.checks}>
              {checks.map((check) => (
                <View key={check.label} style={styles.checkRow}>
                  <Check
                    color={
                      check.valid ? colors.success : colors.mutedForeground
                    }
                    size={16}
                  />
                  <Text
                    style={[
                      styles.checkText,
                      check.valid && styles.checkTextValid,
                    ]}
                  >
                    {check.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <View style={styles.actions}>
          <Button
            icon={ArrowLeft}
            label={step === 0 ? "Sign in" : "Back"}
            onPress={() =>
              step === 0 ? router.replace("/sign-in") : setStep(step - 1)
            }
            variant="secondary"
          />
          {step < 2 ? (
            <Button
              disabled={(step === 0 && !email) || (step === 1 && !name)}
              icon={ArrowRight}
              label="Continue"
              onPress={() => setStep(step + 1)}
            />
          ) : (
            <Button
              disabled={!passwordValid}
              icon={Mail}
              label="Create"
              loading={loading}
              onPress={submit}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    gap: 20,
    paddingHorizontal: spacing.screenX,
  },
  header: {
    gap: 6,
  },
  title: {
    color: colors.foreground,
    ...typography.title,
  },
  subtitle: {
    color: colors.mutedForeground,
    ...typography.body,
  },
  form: {
    gap: 14,
  },
  checks: {
    gap: 8,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkText: {
    color: colors.mutedForeground,
    ...typography.bodySm,
  },
  checkTextValid: {
    color: colors.foreground,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
});
