"use server";

import { validatedActionWithAdminPermission } from "lib/action-utils";
import { headers } from "next/headers";
import { auth } from "auth/server";
import { DEFAULT_USER_ROLE, userRolesInfo } from "app-types/roles";
import {
  UpdateUserRoleSchema,
  UpdateUserRoleActionState,
  UpdateUserBanStatusSchema,
  UpdateUserBanStatusActionState,
} from "./validations";
import logger from "lib/logger";
import { getTranslations } from "next-intl/server";
import { getUser } from "lib/user/server";

export const updateUserRolesAction = validatedActionWithAdminPermission(
  UpdateUserRoleSchema,
  async (data, _formData, userSession): Promise<UpdateUserRoleActionState> => {
    const t = await getTranslations("Admin.UserRoles");
    const tCommon = await getTranslations("User.Profile.common");
    const { userId, role: roleInput } = data;

    const role = roleInput || DEFAULT_USER_ROLE;
    if (userSession.user.id === userId) {
      return {
        success: false,
        message: t("cannotUpdateOwnRole"),
      };
    }
    await auth.api.setRole({
      body: { userId, role: role as "user" | "admin" },
      headers: await headers(),
    });
    await auth.api.revokeUserSessions({
      body: { userId },
      headers: await headers(),
    });
    const user = await getUser(userId);
    if (!user) {
      return {
        success: false,
        message: tCommon("userNotFound"),
      };
    }

    return {
      success: true,
      message: t("roleUpdatedSuccessfullyTo", {
        role: userRolesInfo[role].label,
      }),
      user,
    };
  },
);

export const updateUserBanStatusAction = validatedActionWithAdminPermission(
  UpdateUserBanStatusSchema,
  async (
    data,
    _formData,
    userSession,
  ): Promise<UpdateUserBanStatusActionState> => {
    const tCommon = await getTranslations("User.Profile.common");
    const { userId, banned, banReason } = data;

    if (userSession.user.id === userId) {
      return {
        success: false,
        message: tCommon("cannotBanUnbanYourself"),
      };
    }
    try {
      if (!banned) {
        await auth.api.banUser({
          body: {
            userId,
            banReason:
              banReason ||
              (await getTranslations("User.Profile.common"))("bannedByAdmin"),
          },
          headers: await headers(),
        });
        await auth.api.revokeUserSessions({
          body: { userId },
          headers: await headers(),
        });
      } else {
        await auth.api.unbanUser({
          body: { userId },
          headers: await headers(),
        });
      }
      const user = await getUser(userId);
      if (!user) {
        return {
          success: false,
          message: tCommon("userNotFound"),
        };
      }
      return {
        success: true,
        message: user.banned
          ? tCommon("userBannedSuccessfully")
          : tCommon("userUnbannedSuccessfully"),
        user,
      };
    } catch (error) {
      logger.error(error);
      return {
        success: false,
        message: tCommon("failedToUpdateUserStatus"),
        error: error instanceof Error ? error.message : tCommon("unknownError"),
      };
    }
  },
);
