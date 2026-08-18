import { AdminUserRoleCounts } from "app-types/admin";
import { Edit3, Radio, ShieldCheck, User } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface UserRoleStatsProps {
  counts: AdminUserRoleCounts;
}

export async function UserRoleStats({ counts }: UserRoleStatsProps) {
  const t = await getTranslations("Admin.Users");

  const stats = [
    {
      key: "online",
      label: t("online"),
      value: counts.online,
      icon: Radio,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      key: "users",
      label: t("usersRole"),
      value: counts.user,
      icon: User,
      iconBg: "bg-muted",
      iconColor: "text-muted-foreground",
    },
    {
      key: "editors",
      label: t("editorsRole"),
      value: counts.editor,
      icon: Edit3,
      iconBg: "bg-chart-2/15",
      iconColor: "text-chart-2",
    },
    {
      key: "admins",
      label: t("adminsRole"),
      value: counts.admin,
      icon: ShieldCheck,
      iconBg: "bg-chart-1/15",
      iconColor: "text-chart-1",
    },
  ] as const;

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      data-testid="user-role-stats"
    >
      {stats.map(({ key, label, value, icon: Icon, iconBg, iconColor }) => (
        <div
          key={key}
          className="rounded-lg border bg-card p-3"
          data-testid={`user-role-stat-${key}`}
        >
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 shrink-0 ${iconBg}`}>
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">
                {label}
              </p>
              <p className="text-xl font-bold">{value.toLocaleString()}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
