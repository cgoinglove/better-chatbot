import { getUserStats } from "lib/user/server";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Label } from "ui/label";

interface UserStatsProps {
  userId?: string;
  view?: "admin" | "user";
}

export async function UserStats({ userId }: UserStatsProps) {
  const stats = await getUserStats(userId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Chat Threads</Label>
            <p className="text-2xl font-bold">{stats.threadCount}</p>
          </div>

          <div className="space-y-2">
            <Label>Messages Sent</Label>
            <p className="text-2xl font-bold">{stats.messageCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
