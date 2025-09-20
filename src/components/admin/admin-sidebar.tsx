"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "ui/sidebar";
import { ArrowLeft, Shield, Users } from "lucide-react";
import { AppSidebarUser } from "@/components/layouts/app-sidebar-user";
import { SidebarHeaderShared } from "@/components/layouts/sidebar-header";
import { useTranslations } from "next-intl";
import { BasicUser } from "app-types/user";

export function AdminSidebar({
  user,
}: {
  user?: BasicUser;
}) {
  const pathname = usePathname();
  const t = useTranslations("Admin.Sidebar");

  const adminNavItems = [
    {
      title: t("users"),
      url: "/admin",
      icon: Users,
      isActive: pathname === "/admin" || pathname.startsWith("/admin/users"),
    },
  ];

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-sidebar-border/80"
    >
      <SidebarHeaderShared
        title={
          <div className="flex items-center gap-2">
            <Shield className="size-4" />
            <span className="font-semibold">{t("adminPanel")}</span>
          </div>
        }
        href="/"
        enableShortcuts={false}
      />

      <SidebarContent className="mt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem className="mb-1">
                <SidebarMenuButton asChild className="hover:bg-transparent">
                  <Link href="/" className="flex items-center gap-2">
                    <ArrowLeft className="size-4" />
                    <span className="font-semibold">{t("backToApp")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.isActive}
                    className="font-semibold"
                  >
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="flex flex-col items-stretch space-y-2">
        <AppSidebarUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
