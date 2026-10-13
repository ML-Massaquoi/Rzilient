import { requireUser } from "@/server/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return <AppShell user={user}>{children}</AppShell>;
}
