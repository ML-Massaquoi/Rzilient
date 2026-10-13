"use client";

import { useEffect } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="bg-destructive/10 text-destructive grid size-12 place-items-center rounded-full">
        <TriangleAlertIcon className="size-6" />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          An unexpected error occurred. Try again — if the problem persists,
          contact the system administrator.
        </p>
      </div>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
