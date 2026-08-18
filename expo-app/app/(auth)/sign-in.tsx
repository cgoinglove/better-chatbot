import { useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Link, router } from "expo-router";
import { Github, Mail } from "lucide-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ErrorBanner, Button, Field, Screen } from "@/components/ui";
import { getAuthConfig } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { colors, spacing, typography } from "@/theme";

export default function SignInScreen() {
  const config = useQuery({
    queryKey: ["auth-config"],
    queryFn: getAuthConfig,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInEmail() {
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result?.error) {
        throw new Error(result.error.message || "Could not sign in");
      }
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  async function signInSocial(provider: "github" | "google" | "microsoft") {
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: Linking.createURL("/"),
      });
      if (result?.error) {
        throw new Error(
          result.error.message || "Could not start social sign in",
        );
      }
    } catch (err: any) {
      setError(err.message || "Could not start social sign in");
    } finally {
      setLoading(false);
    }
  }

  const providers = config.data?.socialProviders;

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrap}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Better Chatbot</Text>
          <Text style={styles.subtitle}>Sign in to continue your chats.</Text>
        </View>
        <ErrorBanner message={error} />
        {config.data?.emailAndPasswordEnabled !== false ? (
          <View style={styles.form}>
            <Field
              autoComplete="email"
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              value={email}
            />
            <Field
              autoComplete="password"
              label="Password"
              onChangeText={setPassword}
              secureTextEntry
              value={password}
            />
            <Button
              disabled={!email || !password}
              icon={Mail}
              label="Sign in"
              loading={loading}
              onPress={signInEmail}
            />
          </View>
        ) : null}
        <View style={styles.social}>
          {providers?.google ? (
            <Button
              label="Continue with Google"
              loading={loading}
              onPress={() => signInSocial("google")}
              variant="secondary"
            />
          ) : null}
          {providers?.github ? (
            <Button
              icon={Github}
              label="Continue with GitHub"
              loading={loading}
              onPress={() => signInSocial("github")}
              variant="secondary"
            />
          ) : null}
          {providers?.microsoft ? (
            <Button
              label="Continue with Microsoft"
              loading={loading}
              onPress={() => signInSocial("microsoft")}
              variant="secondary"
            />
          ) : null}
        </View>
        {config.data?.signUpEnabled !== false ? (
          <Text style={styles.footer}>
            New here?{" "}
            <Link href="/sign-up" style={styles.link}>
              Create account
            </Link>
          </Text>
        ) : null}
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
  social: {
    gap: 10,
  },
  footer: {
    color: colors.mutedForeground,
    textAlign: "center",
  },
  link: {
    color: colors.foreground,
    fontWeight: "700",
  },
});
