"use client";

import { DropdownMenuItem } from "ui/dropdown-menu";
import { DropdownMenuContent } from "ui/dropdown-menu";
import { AvatarFallback } from "ui/avatar";
import { AvatarImage } from "ui/avatar";
import { SidebarMenuButton } from "ui/sidebar";
import { DropdownMenuTrigger } from "ui/dropdown-menu";
import { DropdownMenu } from "ui/dropdown-menu";
import { SidebarMenuItem } from "ui/sidebar";
import { SidebarMenu } from "ui/sidebar";
import { Avatar } from "ui/avatar";
import { ChevronsUpDown } from "lucide-react";
import { notImplementedToast } from "ui/shared-toast";

import { signOut, useSession } from "next-auth/react";
// import { signOut } from "@/app/api/auth/auth";

export function AppSidebarUser() {
  const { data: session } = useSession();

  const user = session?.user;

  const logout = () => {
    signOut({
      redirectTo: "/login",
    });
  };

  if (!user) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton>
              <Avatar className="rounded-full size-5">
                <AvatarImage
                  className="object-cover"
                  src={user.image || "/pf.png"}
                  alt={user.name || ""}
                />
                <AvatarFallback>{user.name?.slice(0, 1) || ""}</AvatarFallback>
              </Avatar>
              {user.email}
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="w-full">
            <DropdownMenuItem onClick={notImplementedToast}>
              <span>Account</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={notImplementedToast}>
              <span>Billing</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
