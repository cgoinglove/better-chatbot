"use client";

import { APIKeyManagement } from "@/components/api-key-management";
import { SettingsConnections } from "@/components/settings-connections";

export default function SettingsPage() {
  return (
    <div className="w-full max-w-3xl p-8 mx-auto space-y-6">
      <APIKeyManagement />
      <SettingsConnections />
    </div>
  );
}
