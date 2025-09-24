"use server";

import {
  validatedActionWithAdminPermission,
  validatedActionWithUserManagePermission,
} from "lib/action-utils";
import { headers } from "next/headers";
import { auth } from "auth/server";
import {
  UpdateUserDetailsSchema,
  DeleteUserSchema,
  UpdateUserPasswordSchema,
  UpdateUserActionState,
  DeleteUserActionState,
  UpdateUserPasswordActionState,
} from "./validations";
import { getUser, getUserAccounts, updateUserDetails } from "lib/user/server";
import { getTranslations } from "next-intl/server";
import { logger } from "better-auth";

export const updateUserDetailsAction = validatedActionWithUserManagePermission(
  UpdateUserDetailsSchema,
  async (
    data,
    userId,
    userSession,
    isOwnResource,
    _formData,
  ): Promise<UpdateUserActionState> => {
    const t = await getTranslations("User.Profile.common");

    try {
      const { name, email, image } = data;
      const user = await getUser(userId);
      if (!user) {
        return {
          success: false,
          message: t("userNotFound"),
        };
      }

      const isDifferentEmail = email && email !== userSession.user.email;
      const isDifferentName = name && name !== userSession.user.name;
      const isDifferentImage = image && image !== userSession.user.image;

      // this forces a session update for the current user, getting the latest data
      if (isOwnResource) {
        if (isDifferentName || isDifferentImage) {
          await auth.api.updateUser({
            returnHeaders: true,
            body: { name, ...(image && { image }) },
            headers: await headers(),
          });
        }
        if (isDifferentEmail) {
          await auth.api.changeEmail({
            returnHeaders: true,
            body: { newEmail: email },
            headers: await headers(),
          });
        }
      } else {
        await updateUserDetails(userId, name, email);
      }

      if (isDifferentEmail) user.email = email;
      if (isDifferentName) user.name = name;
      if (isDifferentImage) user.image = image;

      return {
        success: true,
        message: t("userDetailsUpdatedSuccessfully"),
        user,
        currentUserUpdated: isOwnResource,
      };
    } catch (error) {
      logger.error("Failed to update user details:", error);
      return {
        success: false,
        message: t("failedToUpdateUserDetails"),
      };
    }
  },
);

export const deleteUserAction = validatedActionWithAdminPermission(
  DeleteUserSchema,
  async (data, _formData, _userSession): Promise<DeleteUserActionState> => {
    const t = await getTranslations("Admin.UserDelete");
    const { userId } = data;
    try {
      await auth.api.removeUser({
        body: { userId },
        headers: await headers(),
      });
    } catch (error) {
      console.error("Failed to delete user:", error);
      return {
        success: false,
        message: t("failedToDeleteUser"),
      };
    }

    return {
      success: true,
      message: t("userDeletedSuccessfully"),
      redirect: "/admin",
    };
  },
);

export const updateUserPasswordAction = validatedActionWithUserManagePermission(
  UpdateUserPasswordSchema,
  async (
    data,
    userId,
    _userSession,
    isOwnResource,
    _formData,
  ): Promise<UpdateUserPasswordActionState> => {
    const t = await getTranslations("User.Profile.common");
    const {
      newPassword,
      isCurrentUser: isCurrentUserParam,
      currentPassword,
    } = data;
    const { hasPassword } = await getUserAccounts(userId);

    const isCurrentUser = isCurrentUserParam ? isOwnResource : false;

    if (!hasPassword) {
      return {
        success: false,
        message: t("userHasNoPasswordAccount"),
      };
    }

    try {
      if (isCurrentUser) {
        if (!currentPassword) {
          return {
            success: false,
            message: t("failedToUpdatePassword"),
          };
        }
        await auth.api.changePassword({
          body: { currentPassword, newPassword, revokeOtherSessions: true },
          headers: await headers(),
        });
      } else {
        await auth.api.setUserPassword({
          body: { userId, newPassword },
          headers: await headers(),
        });
        await auth.api.revokeUserSessions({
          body: { userId },
          headers: await headers(),
        });
      }
      return {
        success: true,
        message: t("passwordUpdatedSuccessfully"),
      };
    } catch (_error) {
      console.error("Failed to update user password:", _error);
      return {
        success: false,
        message: t("failedToUpdatePassword"),
      };
    }
  },
);
