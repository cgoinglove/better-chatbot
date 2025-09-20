import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { AdminHeader } from "@/components/admin/admin-header";
import { getTranslations } from "next-intl/server";

interface UsersLayoutProps {
  children: ReactNode;
}

export default async function UsersLayout({ children }: UsersLayoutProps) {
  const t = await getTranslations("Admin.Users");

  return (
    <main className="relative bg-background w-full flex flex-col min-h-screen">
      <AdminHeader />
      <div className="flex-1 overflow-y-auto p-6 w-full">
        <div className="space-y-6 w-full max-w-none">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t("title")}</h1>
              <p className="text-muted-foreground">{t("viewAndManageUsers")}</p>
            </div>
          </div>

          {/* Main Card */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle>{t("allUsers")}</CardTitle>
              <CardDescription>{t("viewAndManageUsers")}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 w-full">{children}</CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
