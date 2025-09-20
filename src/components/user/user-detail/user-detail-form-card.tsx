"use client";

import { useActionState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "ui/avatar";
import { Label } from "ui/label";
import { Input } from "ui/input";

import { Badge } from "ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { User } from "lucide-react";
import { toast } from "sonner";
import Form from "next/form";
import { updateUserDetailsAction } from "@/app/api/user/actions";
import { UpdateUserActionState } from "@/app/api/user/validations";
import { BasicUserWithLastLogin } from "app-types/user";
import { getUserAvatar } from "lib/user/utils";
import { SubmitButton } from "./user-submit-button";
import { useProfileTranslations } from "@/hooks/use-profile-translations";

interface UserDetailFormCardProps {
  user: BasicUserWithLastLogin;
  currentUserId: string;
  userAccountInfo?: {
    hasPassword: boolean;
    oauthProviders: string[];
  };
  onUserDetailsUpdate?: (user: Partial<BasicUserWithLastLogin>) => void;
  view?: "admin" | "user";
}

export function UserDetailFormCard({
  user,
  currentUserId,
  userAccountInfo,
  onUserDetailsUpdate,
  view,
}: UserDetailFormCardProps) {
  const { t, tCommon } = useProfileTranslations(view);

  const [, detailsUpdateFormAction, isPending] = useActionState<
    UpdateUserActionState,
    FormData
  >(async (prevState, formData) => {
    const result = await updateUserDetailsAction(prevState, formData);
    if (result?.success && result.user) {
      const updatedUser = result.user;
      toast.success(t("updateSuccess"));
      onUserDetailsUpdate?.(updatedUser);
    } else {
      toast.error(result?.message || t("updateError"));
    }
    return result;
  }, {});

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          {tCommon("userDetailsCardTitle")}
        </CardTitle>
        <CardDescription>{t("userDetailsCardDescription")}</CardDescription>
      </CardHeader>

      <CardContent>
        <Form action={detailsUpdateFormAction} className="space-y-6">
          <input type="hidden" name="userId" value={user.id} />

          {/* Avatar and Name Section */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-border">
              <AvatarImage src={getUserAvatar(user)} />
              <AvatarFallback className="text-lg font-semibold">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex items-center gap-2">
              {user.id === currentUserId && (
                <Badge variant="outline" className="text-xs">
                  {tCommon("you")}
                </Badge>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
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
                      !!userAccountInfo?.oauthProviders?.length
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
                        !!userAccountInfo?.oauthProviders?.length || isPending
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

              {!!userAccountInfo?.oauthProviders?.length && (
                <p className="text-xs text-muted-foreground">
                  {t("emailCannotBeModifiedOAuth")}
                </p>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {tCommon("joined")}
              </Label>
              <p className="text-sm font-medium" data-testid="user-created-at">
                {format(new Date(user.createdAt), "PPP")}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {tCommon("lastUpdated")}
              </Label>
              <p className="text-sm font-medium" data-testid="user-updated-at">
                {format(new Date(user.updatedAt), "PPP")}
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <SubmitButton
              className="w-full"
              data-testid="save-changes-button"
              disabled={isPending}
            >
              {isPending ? tCommon("saving") : t("saveChanges")}
            </SubmitButton>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
