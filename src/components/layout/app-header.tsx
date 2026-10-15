"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  UserRoundIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { findNavItem, NAV_SECTIONS } from "@/components/layout/nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { logout } from "@/server/actions/auth";
import type { SessionUser } from "@/server/auth";

const ROLE_LABELS = {
  ADMIN: "Administrator",
  IT_STAFF: "IT Staff",
  VIEWER: "Viewer",
} as const;

const emptySubscribe = () => () => {};

function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {hydrated && resolvedTheme === "dark" ? (
        <SunIcon />
      ) : (
        <MoonIcon />
      )}
    </Button>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function UserMenu({ user }: { user: SessionUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-9 gap-2 px-1.5 sm:px-2">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-36 truncate text-sm font-medium sm:inline">
              {user.name}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">
            {user.name}
          </p>
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
          <p className="text-muted-foreground/80 mt-1 text-[11px] tracking-wide uppercase">
            {ROLE_LABELS[user.role]}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href="/profile" />}
          className="cursor-pointer"
        >
          <UserRoundIcon />
          View profile
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            void logout();
          }}
        >
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader({
  user,
  onOpenMenu,
}: {
  user: SessionUser;
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();
  const activeItem = findNavItem(pathname);
  const section = NAV_SECTIONS.find((s) =>
    s.items.some((item) => item.href === activeItem?.href)
  );

  return (
    <header className="bg-background/85 sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-md sm:px-6 print:hidden">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={onOpenMenu}
      >
        <MenuIcon />
      </Button>

      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
            {activeItem?.title ?? "Avci"}
          </h1>
        </div>
        {section?.title && activeItem?.title !== section.title ? (
          <p className="text-muted-foreground hidden truncate text-xs sm:block">
            {section.title}
          </p>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <CommandPalette role={user.role} />
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
