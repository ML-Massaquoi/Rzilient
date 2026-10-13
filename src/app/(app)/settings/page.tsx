import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <ModulePlaceholder
        title="Settings"
        description="Administration: users and roles, asset categories, custom fields, status history and system configuration."
        phase="Phase 8"
        features={[
          'User management with ADMIN, IT_STAFF and VIEWER roles',
          'Asset categories, statuses and custom field configuration',
          'Branding, timezone and notification preferences',
          'Danger zone for governed destructive operations'
        ]}
      />
    </div>
  );
}
