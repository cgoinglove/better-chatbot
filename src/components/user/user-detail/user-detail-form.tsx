"use client";

import { useActionState } from "react";
import { format } from "date-fns";
import { Label } from "ui/label";
import { Input } from "ui/input";
import { Button } from "ui/button";

import { FormGroup } from "ui/form-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { toast } from "sonner";
import { updateUserDetailsAction } from "@/app/api/user/actions";
import { UpdateUserActionState } from "@/app/api/user/validations";
import { BasicUserWithLastLogin } from "app-types/user";
import { UserRoleSelector } from "./user-role-selection-dialog";
import { UserRoleBadges } from "./user-role-badges";
import Form from "next/form";
import { UpdateUserPasswordDialog } from "./user-update-password-dialog";
import { SubmitButton } from "./user-submit-button";
import { LockIcon } from "lucide-react";
import { useProfileTranslations } from "@/hooks/use-profile-translations";
import { UserStatusBadge } from "./user-status-badge";
import { useState } from "react";

interface UserDetailFormProps {
  user: BasicUserWithLastLogin;
  userAccountInfo?: {
    hasPassword: boolean;
    oauthProviders: string[];
  };
  currentUserId: string;
  onUserDetailsUpdate: (user: Partial<BasicUserWithLastLogin>) => void;
  view?: "admin" | "user";
}

export function UserDetailForm({
  user,
  userAccountInfo,
  currentUserId,
  view,
  onUserDetailsUpdate,
}: UserDetailFormProps) {
  const { t, tCommon } = useProfileTranslations(view);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  const [, detailsUpdateFormAction, isPending] = useActionState<
    UpdateUserActionState,
    FormData
  >(async (prevState, formData) => {
    const result = await updateUserDetailsAction(prevState, formData);
    if (result?.success && result.user) {
      const updatedUser = result.user;
      onUserDetailsUpdate(updatedUser);

      toast.success(t("updateSuccess"));
    } else {
      toast.error(result?.message || t("updateError"));
    }
    return result;
  }, {});

  const handleUserUpdate = (updatedUser: Partial<BasicUserWithLastLogin>) => {
    onUserDetailsUpdate(updatedUser);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 pb-6">
          <div className="max-w-2xl mx-auto">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t("sectionTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("sectionDescription")}
              </p>
            </div>

            <Form
              className="space-y-6 mt-6"
              action={detailsUpdateFormAction}
              data-testid="user-detail-form"
            >
              <input type="hidden" name="userId" value={user.id} />

              <FormGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{tCommon("name")}</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={user.name}
                      required
                      disabled={isPending}
                      data-testid="user-name-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{tCommon("email")}</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={
                            !userAccountInfo?.oauthProviders?.length
                              ? "cursor-not-allowed"
                              : ""
                          }
                        >
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            defaultValue={user.email}
                            disabled={
                              !!userAccountInfo?.oauthProviders?.length ||
                              isPending
                            }
                            required
                            data-testid="user-email-input"
                          />
                        </span>
                      </TooltipTrigger>
                      {!!userAccountInfo?.oauthProviders?.length && (
                        <TooltipContent>
                          {t("emailCannotBeModifiedSSO")}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </div>
              </FormGroup>

              <FormGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Roles Section */}
                  <div className="space-y-2 sm:border-r sm:border-border sm:pr-4">
                    <Label>{t("roles")}</Label>
                    <UserRoleBadges
                      user={user}
                      showBanned={false}
                      view={view}
                      onRoleClick={
                        user.id !== currentUserId
                          ? () => setShowRoleDialog(true)
                          : undefined
                      }
                      disabled={user.id === currentUserId || isPending}
                      className="mt-0"
                    />
                    {user.id === currentUserId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("cannotModifyOwnRole")}
                      </p>
                    )}
                  </div>

                  {/* Account Status Section */}
                  <div className="space-y-2 sm:pl-4">
                    <Label>{t("accountStatus")}</Label>
                    <UserStatusBadge
                      user={user}
                      onStatusChange={handleUserUpdate}
                      currentUserId={currentUserId}
                      disabled={isPending}
                      showClickable={view === "admin"}
                      view={view}
                    />
                  </div>
                </div>
              </FormGroup>

              <FormGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{tCommon("joined")}</Label>
                    <p
                      className="text-sm text-muted-foreground"
                      data-testid="user-created-at"
                    >
                      {format(new Date(user.createdAt), "PPP")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{tCommon("lastUpdated")}</Label>
                    <p
                      className="text-sm text-muted-foreground"
                      data-testid="user-updated-at"
                    >
                      {format(new Date(user.updatedAt), "PPP")}
                    </p>
                  </div>
                </div>
              </FormGroup>
            </Form>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-background border-t border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-end gap-2">
          <UpdateUserPasswordDialog
            userId={user.id}
            view={view}
            currentUserId={currentUserId}
          >
            <Button
              variant="secondary"
              disabled={isPending || !userAccountInfo?.hasPassword}
              className="flex items-center gap-2"
              data-testid="update-password-button"
            >
              <LockIcon className="w-4 h-4" />
              {t("updatePassword")}
            </Button>
          </UpdateUserPasswordDialog>

          <SubmitButton data-testid="save-changes-button">
            {t("saveChanges")}
          </SubmitButton>
        </div>
      </div>

      <UserRoleSelector
        user={user}
        onRoleChange={handleUserUpdate}
        open={showRoleDialog}
        onOpenChange={setShowRoleDialog}
        view={view}
      />
    </>
  );
}
