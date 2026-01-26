import {
  GitHubConfigSchema,
  GoogleConfigSchema,
  MicrosoftConfigSchema,
  OktaConfigSchema,
  GitHubConfig,
  GoogleConfig,
  MicrosoftConfig,
  OktaConfig,
  AuthConfig,
  AuthConfigSchema,
} from "app-types/authentication";
// Conditionally import React taint
let experimental_taintUniqueValue: any = () => {};
try {
  // Only use taint in Next.js runtime
  if (typeof window !== "undefined" || process.env.NEXT_RUNTIME) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const react = require("react");
    experimental_taintUniqueValue = react.experimental_taintUniqueValue;
  }
} catch (_e) {
  // No-op for non-React contexts
}
import { parseEnvBoolean } from "../utils";

function parseSocialAuthConfigs() {
  const configs: {
    github?: GitHubConfig;
    google?: GoogleConfig;
    microsoft?: MicrosoftConfig;
    okta?: OktaConfig;
  } = {};
  // DISABLE_SIGN_UP only applies to OAuth signups, not email signups
  const disableSignUp = parseEnvBoolean(process.env.DISABLE_SIGN_UP);

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    const githubResult = GitHubConfigSchema.safeParse({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      disableSignUp,
    });
    if (githubResult.success) {
      configs.github = githubResult.data;
      experimental_taintUniqueValue(
        "Do not pass GITHUB_CLIENT_SECRET to the client",
        configs,
        configs.github.clientSecret,
      );
    }
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const forceAccountSelection = parseEnvBoolean(
      process.env.GOOGLE_FORCE_ACCOUNT_SELECTION,
    );

    const googleConfig: GoogleConfig = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      ...(forceAccountSelection && { prompt: "select_account" as const }),
      disableSignUp,
    };

    const googleResult = GoogleConfigSchema.safeParse(googleConfig);
    if (googleResult.success) {
      configs.google = googleResult.data;
      experimental_taintUniqueValue(
        "Do not pass GOOGLE_CLIENT_SECRET to the client",
        configs,
        configs.google.clientSecret,
      );
    }
  }

  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    const forceAccountSelection = parseEnvBoolean(
      process.env.MICROSOFT_FORCE_ACCOUNT_SELECTION,
    );
    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";

    const microsoftConfig: MicrosoftConfig = {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      tenantId,
      ...(forceAccountSelection && { prompt: "select_account" as const }),
      disableSignUp,
    };

    const microsoftResult = MicrosoftConfigSchema.safeParse(microsoftConfig);
    if (microsoftResult.success) {
      configs.microsoft = microsoftResult.data;
      experimental_taintUniqueValue(
        "Do not pass MICROSOFT_CLIENT_SECRET to the client",
        configs,
        configs.microsoft.clientSecret,
      );
    }
  }

  // Okta OIDC/OAuth 2.0 configuration
  // Supports two modes:
  // 1. Authorization Server mode: OKTA_ISSUER = https://dev-xxxx.okta.com/oauth2/default
  //    - Requires Okta API Access Management feature (paid feature)
  //    - Full OIDC support with custom scopes and claims
  // 2. Org Authorization Server mode: OKTA_DOMAIN = https://dev-xxxx.okta.com
  //    - Available on all Okta tenants (no extra features required)
  //    - Uses the chatbot server as the OAuth redirect handler
  //    - Limited to basic OpenID Connect scopes
  //
  // Priority: OKTA_ISSUER takes precedence over OKTA_DOMAIN
  if (
    process.env.OKTA_CLIENT_ID &&
    process.env.OKTA_CLIENT_SECRET &&
    (process.env.OKTA_ISSUER || process.env.OKTA_DOMAIN)
  ) {
    // Determine the issuer URL
    // If OKTA_ISSUER is provided, use it directly (authorization server mode)
    // Otherwise, construct from OKTA_DOMAIN (org authorization server mode)
    const issuer = process.env.OKTA_ISSUER
      ? process.env.OKTA_ISSUER
      : process.env.OKTA_DOMAIN;

    const oktaResult = OktaConfigSchema.safeParse({
      clientId: process.env.OKTA_CLIENT_ID,
      clientSecret: process.env.OKTA_CLIENT_SECRET,
      issuer: issuer,
      disableSignUp,
    });
    if (oktaResult.success) {
      configs.okta = oktaResult.data;
      experimental_taintUniqueValue(
        "Do not pass OKTA_CLIENT_SECRET to the client",
        configs,
        configs.okta.clientSecret,
      );
    }
  }

  return configs;
}

export function getAuthConfig(): AuthConfig {
  const rawConfig = {
    emailAndPasswordEnabled: process.env.DISABLE_EMAIL_SIGN_IN
      ? !parseEnvBoolean(process.env.DISABLE_EMAIL_SIGN_IN)
      : true,
    // signUpEnabled now only applies to email signups
    // OAuth signups are controlled separately via DISABLE_SIGN_UP in parseSocialAuthConfigs
    signUpEnabled: process.env.DISABLE_EMAIL_SIGN_UP
      ? !parseEnvBoolean(process.env.DISABLE_EMAIL_SIGN_UP)
      : true,
    socialAuthenticationProviders: parseSocialAuthConfigs(),
  };

  const result = AuthConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    throw new Error(`Invalid auth configuration: ${result.error.message}`);
  }

  return result.data;
}
