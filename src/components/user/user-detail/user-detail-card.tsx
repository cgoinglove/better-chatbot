"use client";

import { Card, CardHeader } from "ui/card";
import { Avatar } from "ui/avatar";
import { AvatarImage } from "ui/avatar";
import { AvatarFallback } from "ui/avatar";
import { CardTitle } from "ui/card";
import { CardDescription } from "ui/card";
import { Badge } from "ui/badge";
import { BasicUserWithLastLogin } from "app-types/user";
import { UserRoleBadges } from "./user-role-badges";
import { getUserAvatar } from "lib/user/utils";
import { useProfileTranslations } from "@/hooks/use-profile-translations";

export function UserDetailCard({
  user,
  currentUserId,
  view,
}: {
  user: BasicUserWithLastLogin;
  currentUserId: string;
  view?: "admin" | "user";
}) {
  const { tCommon } = useProfileTranslations(view);
  return (
    <Card data-testid="user-detail-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-full">
              <AvatarImage src={getUserAvatar(user)} />
              <AvatarFallback>
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl" data-testid="user-name">
                  {user.name}
                </CardTitle>
                {user.id === currentUserId && (
                  <Badge
                    variant="outline"
                    className="text-xs"
                    data-testid="current-user-badge"
                  >
                    {tCommon("you")}
                  </Badge>
                )}
              </div>
              <CardDescription data-testid="user-email">
                {user.email}
              </CardDescription>
              <UserRoleBadges user={user} showBanned={true} />
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
