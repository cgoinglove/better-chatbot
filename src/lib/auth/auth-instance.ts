// Base auth instance without "server-only" - can be used in seed scripts
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin } from "better-auth/plugins";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { pgDb } from "lib/db/pg/db.pg";
import { headers } from "next/headers";
import {
  AccountTable,
  SessionTable,
  UserTable,
  VerificationTable,
} from "lib/db/pg/schema.pg";
import { getAuthConfig } from "./config";
import logger from "logger";
import { userRepository } from "lib/db/repository";
import { DEFAULT_USER_ROLE, USER_ROLES } from "app-types/roles";
import { admin, editor, user, ac } from "./roles";

const {
  emailAndPasswordEnabled,
  signUpEnabled,
  socialAuthenticationProviders,
} = getAuthConfig();

// Build standard social providers config (github, google, microsoft)
// Okta is handled separately via the genericOAuth plugin
function buildStandardSocialProviders() {
  const providers: Record<string, any> = {};

  if (socialAuthenticationProviders.github) {
    providers.github = socialAuthenticationProviders.github;
  }
  if (socialAuthenticationProviders.google) {
    providers.google = socialAuthenticationProviders.google;
  }
  if (socialAuthenticationProviders.microsoft) {
    providers.microsoft = socialAuthenticationProviders.microsoft;
  }

  return providers;
}

// Build genericOAuth config for Okta (and other OIDC providers)
// Supports two Okta modes:
// 1. Custom Authorization Server mode: issuer ends with /oauth2/xxx
//    - Has OIDC discovery at {issuer}/.well-known/openid-configuration
//    - Requires Okta API Access Management feature
// 2. Org Authorization Server mode: issuer is just the domain
//    - NO discovery endpoint available
//    - Must manually specify authorization, token, and userinfo endpoints
//    - Works on all Okta tenants without extra features
function buildGenericOAuthConfig() {
  const config: any[] = [];

  if (socialAuthenticationProviders.okta) {
    const oktaConfig = socialAuthenticationProviders.okta;
    const issuer = oktaConfig.issuer.replace(/\/$/, "");

    // Check if this is Org Authorization Server (no /oauth2/ path)
    const isOrgAuthServer = !issuer.includes("/oauth2/");

    if (isOrgAuthServer) {
      logger.info(
        "Okta configured in Org Authorization Server mode - using manual endpoints",
      );

      // Org Authorization Server doesn't have OIDC discovery
      // Must manually specify all endpoints
      config.push({
        providerId: "okta",
        clientId: oktaConfig.clientId,
        clientSecret: oktaConfig.clientSecret,
        // Org Auth Server endpoints (v1 API)
        authorizationUrl: `${issuer}/oauth2/v1/authorize`,
        tokenUrl: `${issuer}/oauth2/v1/token`,
        userInfoUrl: `${issuer}/oauth2/v1/userinfo`,
        scopes: ["openid", "profile", "email"],
        disableSignUp: oktaConfig.disableSignUp,
      });
    } else {
      logger.info(
        "Okta configured in Custom Authorization Server mode - using discovery",
      );

      // Custom Authorization Server has OIDC discovery
      const discoveryUrl = `${issuer}/.well-known/openid-configuration`;

      config.push({
        providerId: "okta",
        discoveryUrl,
        clientId: oktaConfig.clientId,
        clientSecret: oktaConfig.clientSecret,
        scopes: ["openid", "profile", "email"],
        disableSignUp: oktaConfig.disableSignUp,
      });
    }
  }

  return config;
}

const standardSocialProviders = buildStandardSocialProviders();
const genericOAuthConfig = buildGenericOAuthConfig();

// Get all trusted provider names for account linking
function getTrustedProviders() {
  const providers = Object.keys(standardSocialProviders);
  if (socialAuthenticationProviders.okta) {
    providers.push("okta");
  }
  return providers;
}

// Build plugins array - include genericOAuth only if we have Okta configured
const plugins = [
  adminPlugin({
    defaultRole: DEFAULT_USER_ROLE,
    adminRoles: [USER_ROLES.ADMIN],
    ac,
    roles: {
      admin,
      editor,
      user,
    },
  }),
  nextCookies(),
  // Add genericOAuth plugin if we have Okta or other OIDC providers
  ...(genericOAuthConfig.length > 0
    ? [genericOAuth({ config: genericOAuthConfig })]
    : []),
];

const options = {
  secret: process.env.BETTER_AUTH_SECRET!,
  plugins,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL,
  user: {
    changeEmail: {
      enabled: true,
    },
    deleteUser: {
      enabled: true,
    },
  },
  database: drizzleAdapter(pgDb, {
    provider: "pg",
    schema: {
      user: UserTable,
      session: SessionTable,
      account: AccountTable,
      verification: VerificationTable,
    },
  }),
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // This hook ONLY runs during user creation (sign-up), not on sign-in
          // Use our optimized getIsFirstUser function with caching
          const isFirstUser = await getIsFirstUser();

          // Set role based on whether this is the first user
          const role = isFirstUser ? USER_ROLES.ADMIN : DEFAULT_USER_ROLE;

          logger.info(
            `User creation hook: ${user.email} will get role: ${role} (isFirstUser: ${isFirstUser})`,
          );

          return {
            data: {
              ...user,
              role,
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: emailAndPasswordEnabled,
    disableSignUp: !signUpEnabled,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60,
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
  },
  advanced: {
    useSecureCookies:
      process.env.NO_HTTPS == "1"
        ? false
        : process.env.NODE_ENV === "production",
    database: {
      generateId: false,
    },
  },
  account: {
    accountLinking: {
      trustedProviders: getTrustedProviders(),
    },
  },
  socialProviders: standardSocialProviders,
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...options,
  plugins: [...(options.plugins ?? [])],
});

export const getSession = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      logger.error("No session found");
      return null;
    }
    return session;
  } catch (error) {
    logger.error("Error getting session:", error);
    return null;
  }
};

// Cache the first user check to avoid repeated DB queries
let isFirstUserCache: boolean | null = null;

export const getIsFirstUser = async () => {
  // If we already know there's at least one user, return false immediately
  // This in-memory cache prevents any DB calls once we know users exist
  if (isFirstUserCache === false) {
    return false;
  }

  try {
    // Direct database query - simple and reliable
    const userCount = await userRepository.getUserCount();
    const isFirstUser = userCount === 0;

    // Once we have at least one user, cache it permanently in memory
    if (!isFirstUser) {
      isFirstUserCache = false;
    }

    return isFirstUser;
  } catch (error) {
    logger.error("Error checking if first user:", error);
    // Cache as false on error to prevent repeated attempts
    isFirstUserCache = false;
    return false;
  }
};
