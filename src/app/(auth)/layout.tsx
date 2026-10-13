export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="bg-[#F7F5EE] flex min-h-svh w-full">{children}</div>
  );
}
