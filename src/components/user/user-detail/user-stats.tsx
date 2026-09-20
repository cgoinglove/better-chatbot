import { getTranslations } from "next-intl/server";
import { getUserStats } from "lib/user/server";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Label } from "ui/label";

interface UserStatsProps {
  userId?: string;
  view?: "admin" | "user";
}

export async function UserStats({ userId }: UserStatsProps) {
  const stats = await getUserStats(userId);
  const tCommon = await getTranslations("Common");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tCommon("usageStatistics")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{tCommon("chatThreads")}</Label>
            <p className="text-2xl font-bold">{stats.threadCount}</p>
          </div>

          <div className="space-y-2">
            <Label>{tCommon("messagesSent")}</Label>
            <p className="text-2xl font-bold">{stats.messageCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
