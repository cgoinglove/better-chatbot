import "server-only";
import {
  betterAuth,
  MiddlewareInputContext,
  MiddlewareOptions,
} from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { pgDb } from "lib/db/pg/db.pg";
import { headers } from "next/headers";
import { toast } from "sonner";
import {
  AccountSchema,
  SessionSchema,
  UserSchema,
  VerificationSchema,
} from "lib/db/pg/schema.pg";
import { safe } from "ts-safe";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { compare } from "bcrypt-ts";
import { toAny } from "lib/utils";
import logger from "logger";
import { redirect } from "next/navigation";

export const auth = betterAuth({
  plugins: [nextCookies()],
  database: drizzleAdapter(pgDb, {
    provider: "pg",
    schema: {
      user: UserSchema,
      session: SessionSchema,
      account: AccountSchema,
      verification: VerificationSchema,
    },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.DISABLE_SIGN_UP == "true" ? true : false,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 10 * 60,
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
      trustedProviders: ["google", "github"],
    },
  },
  fetchOptions: {
    onError(e) {
      if (e.error.status === 429) {
        toast.error("Too many requests. Please try again later.");
      }
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  hooks: {
    async before(inputContext) {
      return v1_4_0_user_migrate_middleware(inputContext);
    },
  },
});

export const getSession = async () => {
  "use server";
  const session = await auth.api
    .getSession({
      headers: await headers(),
    })
    .catch((e) => {
      logger.error(e);
      return null;
    });

  if (!session) {
    return redirect("/sign-in");
  }
  return session;
};

/**
 * Temporary middleware function to support migration from next-auth to better-auth.
 *
 * This middleware ensures existing users are properly migrated by moving user passwords
 * from the user table to the account table. This allows seamless authentication for
 * users who registered before the migration.
 *
 * Note: This middleware will be removed in release version v1.6.0 once the migration
 * period is complete.
 */
async function v1_4_0_user_migrate_middleware(
  request: MiddlewareInputContext<MiddlewareOptions> & {
    path?: string;
  },
) {
  const isSignIn = request.path?.startsWith("/sign-in/email");
  if (!isSignIn) return request;
  const { email, password: plainPassword } = (request.body ?? {}) as {
    email: string;
    password: string;
  };
  const oldVersionUserId = await v1_4_0_user_migrate_checkOldVersionUser(
    email,
    plainPassword,
  );

  if (oldVersionUserId) {
    const newPassword = await auth.$context.then(({ password: { hash } }) => {
      return hash(plainPassword);
    });

    await v1_4_0_user_migrate_migrateOldVersionUser(
      oldVersionUserId,
      newPassword,
    );

    request.body = toAny({
      ...(request.body ?? {}),
      password: newPassword,
    });
  }

  return request;
}

async function v1_4_0_user_migrate_checkOldVersionUser(
  email: string,
  password: string,
): Promise<string | null> {
  return safe(async () => {
    const [user] = await pgDb
      .select({
        id: UserSchema.id,
        email: UserSchema.email,
        oldPassword: UserSchema.password,
      })
      .from(UserSchema)
      .leftJoin(
        AccountSchema,
        and(
          eq(UserSchema.id, AccountSchema.userId),
          eq(AccountSchema.providerId, "credential"),
        ),
      )
      .where(
        and(
          isNotNull(UserSchema.password),
          eq(UserSchema.email, email),
          isNull(AccountSchema.id),
        ),
      );
    if (!user) return null;
    //
    const passwordsMatch = await compare(password, user.oldPassword!);
    return passwordsMatch ? user.id : null;
  }).orElse(null);
}
async function v1_4_0_user_migrate_migrateOldVersionUser(
  userId: string,
  newPassword: string,
): Promise<void> {
  return pgDb.transaction(async (tx) => {
    await tx
      .update(UserSchema)
      .set({
        password: null,
      })
      .where(eq(UserSchema.id, userId));

    await tx.insert(AccountSchema).values({
      userId,
      providerId: "credential",
      password: newPassword,
      accountId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
}
