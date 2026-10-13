import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="bg-muted grid size-12 place-items-center rounded-full">
        <SearchXIcon className="text-muted-foreground size-6" />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          The page you are looking for doesn&apos;t exist or may have been
          moved.
        </p>
      </div>
      <Button render={<Link href="/dashboard">Back to dashboard</Link>} />
    </div>
  );
}
