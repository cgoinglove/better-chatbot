import type { ReactNode } from "react";
import { AdminHeader } from "@/components/admin/admin-header";

interface UserDetailLayoutProps {
  children: ReactNode;
}

export default function UserDetailLayout({ children }: UserDetailLayoutProps) {
  return (
    <main className="relative bg-background w-full min-h-screen">
      <AdminHeader />
      {children}
    </main>
  );
}
