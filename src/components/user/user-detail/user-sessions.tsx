import { getUserSessions } from "lib/user/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui/table";
import { format } from "date-fns";
import { getTranslations } from "next-intl/server";

interface UserSessionsProps {
  userId: string;
  view?: "admin" | "user";
}

export async function UserSessions({
  userId,
  view = "admin",
}: UserSessionsProps) {
  const t = await getTranslations(
    view === "admin" ? "User.Profile.admin" : "User.Profile.user",
  );
  const tCommon = await getTranslations("User.Profile.common");
  const sessions = await getUserSessions(userId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tCommon("activeSessions")}</CardTitle>
        <CardDescription>{t("viewUserSessionsAndAccess")}</CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tCommon("noActiveSessions")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tCommon("created")}</TableHead>
                <TableHead>{tCommon("expires")}</TableHead>
                <TableHead>{tCommon("ipAddress")}</TableHead>
                <TableHead>{tCommon("userAgent")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    {format(new Date(session.createdAt), "PPp")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(session.expiresAt), "PPp")}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {session.ipAddress || tCommon("unknown")}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">
                    {session.userAgent || tCommon("unknown")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
