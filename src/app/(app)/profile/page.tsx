import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  KeyRoundIcon,
  LogOutIcon,
  MailIcon,
  CalendarIcon,
  ClockIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/lib/db";
import { logout } from "@/server/actions/auth";
import {
  PageHeader,
  PanelCard,
  tileClassForKey,
} from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { cn } from "cn";

export const metadata: Metadata = {
  title: "Profile",
};

const ROLE_LABELS = {
  ADMIN: "Administrator",
  IT_STAFF: "IT Staff",
  VIEWER: "Viewer",
} as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        <Icon className="size-4" />
        {label}
      </span>
      <span
        className={cn(
          "truncate text-right text-sm font-medium",
          mono && "font-mono text-xs"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default async function ProfilePage() {
  const sessionUser = await requireUser();

  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  const tile = tileClassForKey(user.email);
  const roleLabel = ROLE_LABELS[user.role];

  const [sessions, actions] = await Promise.all([
    db.auditLog.count({
      where: { userId: user.id, action: "LOGIN" },
    }),
    db.auditLog.count({
      where: { userId: user.id },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        icon={UserRoundIcon}
        iconClassName={tile}
        title="Profile"
        subtitle="Your account details and session"
        actions={
          <form action={logout}>
            <Button type="submit" variant="destructive">
              <LogOutIcon />
              Sign out
            </Button>
          </form>
        }
      />

      <PanelCard className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={cn(
              "flex size-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold",
              tile
            )}
          >
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{user.name}</h2>
            <p className="text-muted-foreground truncate text-sm">
              {user.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary gap-1"
              >
                <ShieldCheckIcon className="size-3" />
                {roleLabel}
              </Badge>
              <Badge
                variant="outline"
                className={
                  user.status === "ACTIVE"
                    ? "bg-status-available/15 text-status-available"
                    : "bg-destructive/10 text-destructive"
                }
              >
                {user.status === "ACTIVE" ? "Active" : "Disabled"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="border-border mt-6 divide-y divide-border border-t">
          <DetailRow icon={MailIcon} label="Email" value={user.email} />
          <DetailRow icon={KeyRoundIcon} label="Role" value={roleLabel} />
          <DetailRow
            icon={ClockIcon}
            label="Last sign-in"
            value={formatDateTime(user.lastLoginAt)}
          />
          <DetailRow
            icon={CalendarIcon}
            label="Member since"
            value={formatDate(user.createdAt)}
          />
          <DetailRow
            icon={ShieldCheckIcon}
            label="Sign-ins"
            value={`${sessions} ${sessions === 1 ? "time" : "times"}`}
          />
          <DetailRow
            icon={KeyRoundIcon}
            label="Activity recorded"
            value={`${actions} ${actions === 1 ? "entry" : "entries"}`}
          />
        </div>
      </PanelCard>
    </div>
  );
}
