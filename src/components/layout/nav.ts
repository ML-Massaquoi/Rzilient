import type { LucideIcon } from "lucide-react";
import {
  ActivityIcon,
  ArrowLeftRightIcon,
  ArrowRightIcon,
  BoxesIcon,
  Building2Icon,
  CableIcon,
  CpuIcon,
  FileTextIcon,
  HistoryIcon,
  LaptopIcon,
  LayoutDashboardIcon,
  PackageIcon,
  RotateCcwIcon,
  ScanLineIcon,
  SettingsIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import type { Role } from "@/generated/prisma/enums";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles?: Role[];
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

const STAFF_ONLY: Role[] = ["ADMIN", "IT_STAFF"];

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon }],
  },
  {
    title: "Assets",
    items: [
      { title: "All Assets", href: "/assets", icon: BoxesIcon },
      { title: "Devices", href: "/assets/devices", icon: LaptopIcon },
      { title: "Device Models", href: "/assets/models", icon: CpuIcon },
      { title: "Accessories", href: "/assets/accessories", icon: CableIcon },
      { title: "Maintenance", href: "/maintenance", icon: WrenchIcon },
    ],
  },
  {
    title: "People",
    items: [
      { title: "Employees", href: "/employees", icon: UsersIcon },
      { title: "Departments", href: "/departments", icon: Building2Icon },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Check Out",
        href: "/operations/check-out",
        icon: ArrowRightIcon,
        roles: STAFF_ONLY,
      },
      {
        title: "Returns",
        href: "/operations/returns",
        icon: RotateCcwIcon,
        roles: STAFF_ONLY,
      },
      {
        title: "Transfers",
        href: "/operations/transfers",
        icon: ArrowLeftRightIcon,
        roles: STAFF_ONLY,
      },
      {
        title: "QR Scanner",
        href: "/scanner",
        icon: ScanLineIcon,
        roles: STAFF_ONLY,
      },
    ],
  },
  {
    title: "Inventory",
    items: [
      { title: "Warehouse", href: "/inventory", icon: PackageIcon },
      { title: "Transactions", href: "/inventory/transactions", icon: HistoryIcon },
    ],
  },
  {
    items: [
      { title: "Reports", href: "/reports", icon: FileTextIcon },
      { title: "Activity", href: "/activity", icon: ActivityIcon },
      { title: "Settings", href: "/settings", icon: SettingsIcon, roles: ["ADMIN"] },
    ],
  },
];

export function visibleSections(role: Role): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.roles || item.roles.includes(role)
    ),
  })).filter((section) => section.items.length > 0);
}

/** Best-match nav item for the current pathname (longest prefix wins). */
export function findNavItem(pathname: string): NavItem | undefined {
  let best: NavItem | undefined;
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (
        pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
      ) {
        if (!best || item.href.length > best.href.length) best = item;
      }
    }
  }
  return best;
}

export function isActivePath(item: NavItem, pathname: string): boolean {
  if (item.href === "/dashboard") return pathname === "/dashboard";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
