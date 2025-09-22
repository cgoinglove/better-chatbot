"use client";

import { APIKeyManagement } from "@/components/api-key-management";

export default function SettingsPage() {
  return (
    <div className="w-full max-w-3xl p-8 mx-auto">
      <APIKeyManagement />
    </div>
  );
}
