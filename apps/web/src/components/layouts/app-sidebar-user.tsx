"use client";

import { appStore } from "@/app/store";
import { useThemeStyle } from "@/hooks/use-theme-style";
import { getLocaleAction } from "@/i18n/get-locale";
import { BasicUser } from "app-types/user";
import { BillingMenuItem, WorkspaceMenuSection } from "@/components/gate";
import { IS_CLOUD_EDITION } from "@/lib/edition";
import { authClient } from "auth/client";
import { BASE_THEMES, COOKIE_KEY_LOCALE, SUPPORTED_LOCALES } from "lib/const";
import { getUserAvatar } from "lib/user/utils";
import { capitalizeFirstLetter, cn, fetcher } from "lib/utils";
import {
  ChevronRight,
  ChevronsUpDown,
  Command,
  Languages,
  LogOutIcon,
  Mail,
  MessagesSquare,
  MoonStar,
  Palette,
  Settings,
  Settings2,
  Sun,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Suspense, useCallback } from "react";
import useSWR from "swr";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "ui/sidebar";
import { Skeleton } from "ui/skeleton";

export function AppSidebarUserInner(props: {
  user?: BasicUser;
}) {
  const { data: user } = useSWR<BasicUser>(`/api/user/details`, fetcher, {
    fallbackData: props.user,
    suspense: true,
    revalidateOnMount: false,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    refreshInterval: 1000 * 60 * 10,
  });
  const appStoreMutate = appStore((state) => state.mutate);
  const t = useTranslations("Layout");

  const logout = () => {
    authClient.signOut().finally(() => {
      window.location.href = "/sign-in";
    });
  };

  if (!user) return null;

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground bg-input/30 border"
                size={"lg"}
                data-testid="sidebar-user-button"
              >
                <Avatar className="rounded-full size-8 border">
                  <AvatarImage
                    className="object-cover"
                    src={getUserAvatar(user)}
                    alt={user?.name || "User"}
                  />
                  <AvatarFallback>
                    {user?.name?.slice(0, 1) || ""}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate" data-testid="sidebar-user-email">
                  {user?.email}
                </span>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              className="bg-background w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-lg"
              align="start"
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage
                      src={getUserAvatar(user)}
                      alt={user?.name || "User"}
                    />
                    <AvatarFallback className="rounded-lg">
                      {user?.name?.slice(0, 1) || ""}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span
                      className="truncate font-medium"
                      data-testid="sidebar-user-name"
                    >
                      {user?.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => appStoreMutate({ openChatPreferences: true })}
              >
                <Settings2 className="size-4 text-foreground" />
                <span>{t("chatPreferences")}</span>
              </DropdownMenuItem>
              <SelectTheme />
              <SelectLanguage />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => appStoreMutate({ openShortcutsPopup: true })}
              >
                <Command className="size-4 text-foreground" />
                <span>{t("keyboardShortcuts")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  window.open("mailto:info@keinsaas.com", "_blank");
                }}
              >
                <Mail className="size-4 text-foreground" />
                <span>{t("reportAnIssue")}</span>
              </DropdownMenuItem>
              {!IS_CLOUD_EDITION && (
                <DropdownMenuItem
                  onClick={() => {
                    window.open("https://discord.gg/9dwdAYKBPp", "_blank");
                  }}
                >
                  <MessagesSquare className="size-4 text-foreground" />
                  <span>{t("joinDiscord")}</span>
                </DropdownMenuItem>
              )}
              <BillingMenuItem />
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => appStoreMutate({ openUserSettings: true })}
                className="cursor-pointer"
                data-testid="user-settings-menu-item"
              >
                <Settings className="size-4 text-foreground" />
                <span>User Settings</span>
              </DropdownMenuItem>
              <WorkspaceMenuSection />
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer">
                <LogOutIcon className="size-4 text-foreground" />
                <span>{t("signOut")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}

function SelectTheme() {
  const t = useTranslations("Layout");

  const { theme = "light", setTheme } = useTheme();

  const { themeStyle = "default", setThemeStyle } = useThemeStyle();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        className="flex items-center"
        icon={
          <>
            <span className="text-muted-foreground text-xs min-w-0 truncate">
              {`${capitalizeFirstLetter(theme)} ${capitalizeFirstLetter(
                themeStyle,
              )}`}
            </span>
            <ChevronRight className="size-4 ml-2" />
          </>
        }
      >
        <Palette className="mr-2 size-4" />
        <span className="mr-auto">{t("theme")}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="w-48">
          <DropdownMenuLabel className="text-muted-foreground w-full flex items-center">
            <span className="text-muted-foreground text-xs mr-2 select-none">
              {capitalizeFirstLetter(theme)}
            </span>
            <div className="flex-1" />

            <div
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="cursor-pointer border rounded-full flex items-center"
            >
              <div
                className={cn(
                  theme === "dark" &&
                    "bg-accent ring ring-muted-foreground/40 text-foreground",
                  "p-1 rounded-full",
                )}
              >
                <MoonStar className="size-3" />
              </div>
              <div
                className={cn(
                  theme === "light" &&
                    "bg-accent ring ring-muted-foreground/40 text-foreground",
                  "p-1 rounded-full",
                )}
              >
                <Sun className="size-3" />
              </div>
            </div>
          </DropdownMenuLabel>
          <div className="max-h-96 overflow-y-auto">
            {BASE_THEMES.map((t) => (
              <DropdownMenuCheckboxItem
                key={t}
                checked={themeStyle === t}
                onClick={(e) => {
                  e.preventDefault();
                  setThemeStyle(t);
                }}
                className="text-sm"
              >
                {capitalizeFirstLetter(t)}
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

function SelectLanguage() {
  const t = useTranslations("Layout");
  const { data: currentLocale } = useSWR(COOKIE_KEY_LOCALE, getLocaleAction, {
    fallbackData: SUPPORTED_LOCALES[0].code,
    revalidateOnFocus: false,
  });
  const handleOnChange = useCallback((locale: string) => {
    document.cookie = `${COOKIE_KEY_LOCALE}=${locale}; path=/;`;
    window.location.reload();
  }, []);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Languages className="mr-2 size-4" />
        <span>{t("language")}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="w-48 max-h-96 overflow-y-auto">
          <DropdownMenuLabel className="text-muted-foreground">
            {t("language")}
          </DropdownMenuLabel>
          {SUPPORTED_LOCALES.map((locale) => (
            <DropdownMenuCheckboxItem
              key={locale.code}
              checked={locale.code === currentLocale}
              onCheckedChange={() =>
                locale.code !== currentLocale && handleOnChange(locale.code)
              }
            >
              {locale.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

export function AppSidebarUserSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground bg-input/30 border"
          size={"lg"}
          data-testid="sidebar-user-button"
        >
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebarUser({
  user,
}: {
  user?: BasicUser;
}) {
  return (
    <Suspense fallback={<AppSidebarUserSkeleton />}>
      <AppSidebarUserInner user={user} />
    </Suspense>
  );
}
