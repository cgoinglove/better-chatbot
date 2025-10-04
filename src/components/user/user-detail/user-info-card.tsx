"use client";

import { useState, useActionState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "ui/avatar";
import { Label } from "ui/label";
import { Input } from "ui/input";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { Edit3, Check, X, User, Mail } from "lucide-react";
import { toast } from "sonner";
import Form from "next/form";
import { updateUserDetailsAction } from "@/app/api/user/actions";
import { UpdateUserActionState } from "@/app/api/user/validations";
import { BasicUserWithLastLogin } from "app-types/user";
import { getUserAvatar } from "lib/user/utils";
import { SubmitButton } from "./user-submit-button";
import { useProfileTranslations } from "@/hooks/use-profile-translations";

interface UserInfoCardProps {
  user: BasicUserWithLastLogin;
  currentUserId: string;
  userAccountInfo?: {
    hasPassword: boolean;
    oauthProviders: string[];
  };
  onUserDetailsUpdate: (user: Partial<BasicUserWithLastLogin>) => void;
  view?: "admin" | "user";
}

export function UserInfoCard({
  user,
  currentUserId,
  userAccountInfo,
  onUserDetailsUpdate,
  view,
}: UserInfoCardProps) {
  const { t, tCommon } = useProfileTranslations(view);
  const [editingField, setEditingField] = useState<"name" | "email" | null>(
    null,
  );

  const [, detailsUpdateFormAction, isPending] = useActionState<
    UpdateUserActionState,
    FormData
  >(async (prevState, formData) => {
    const result = await updateUserDetailsAction(prevState, formData);
    if (result?.success && result.user) {
      const updatedUser = result.user;
      onUserDetailsUpdate(updatedUser);
      toast.success(t("updateSuccess"));
      setEditingField(null);
    } else {
      toast.error(result?.message || t("updateError"));
    }
    return result;
  }, {});

  const renderInlineEditField = (
    fieldType: "name" | "email",
    value: string,
    icon: React.ReactNode,
    disabled?: boolean,
  ) => {
    const isEditing = editingField === fieldType;
    const canEdit = !disabled && !isPending;

    if (isEditing) {
      return (
        <div className="rounded-md px-2 py-1 -mx-2 bg-muted/20">
          <Form
            action={detailsUpdateFormAction}
            className="flex items-center gap-2 w-full"
          >
            <input type="hidden" name="userId" value={user.id} />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {icon}
              <Input
                name={fieldType}
                defaultValue={value}
                required
                disabled={isPending}
                className={`h-8 border-0 bg-background shadow-none focus-visible:ring-1 px-2 ${fieldType === "name" ? "text-lg font-semibold" : "text-base"}`}
                autoFocus
                data-testid={`${fieldType}-edit-input`}
              />
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <SubmitButton
                size="sm"
                className="h-6 w-6 p-0"
                data-testid={`save-${fieldType}-button`}
              >
                <Check className="h-3 w-3" />
              </SubmitButton>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingField(null)}
                className="h-6 w-6 p-0 hover:bg-background"
                data-testid={`cancel-${fieldType}-button`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </Form>
        </div>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="group/field flex items-center gap-2 hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 transition-colors cursor-pointer"
            onClick={canEdit ? () => setEditingField(fieldType) : undefined}
          >
            {icon}
            <span
              className={`${fieldType === "name" ? "text-2xl font-bold" : "text-muted-foreground"} flex-1`}
              data-testid={`user-${fieldType}`}
            >
              {value}
            </span>
            {canEdit && (
              <Edit3
                className="h-3 w-3 text-muted-foreground group-hover/field:text-foreground transition-colors"
                data-testid={`edit-${fieldType}-button`}
              />
            )}
          </div>
        </TooltipTrigger>
        {canEdit && (
          <TooltipContent>
            {disabled
              ? t("emailCannotBeModifiedSSO")
              : t("clickToEdit", { field: fieldType })}
          </TooltipContent>
        )}
      </Tooltip>
    );
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="space-y-6 pt-6">
        {/* Avatar and Basic Info */}
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 ring-2 ring-border">
            <AvatarImage src={getUserAvatar(user)} />
            <AvatarFallback className="text-lg font-semibold">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            {/* Name Field */}
            <div className="flex items-center gap-2">
              {renderInlineEditField(
                "name",
                user.name,
                <User className="h-4 w-4 text-blue-600" />,
              )}
              {user.id === currentUserId && (
                <Badge variant="outline" className="text-xs ml-2">
                  {tCommon("you")}
                </Badge>
              )}
            </div>

            {/* Email Field */}
            <div className="flex items-center gap-2">
              {renderInlineEditField(
                "email",
                user.email,
                <Mail className="h-4 w-4 text-green-600" />,
                !!userAccountInfo?.oauthProviders?.length,
              )}
            </div>

            {!!userAccountInfo?.oauthProviders?.length && (
              <div className="flex items-center gap-2 px-2 -mx-2">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {t("emailCannotBeModifiedOAuth")}
                </p>
              </div>
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
      </CardContent>
    </Card>
  );
}
