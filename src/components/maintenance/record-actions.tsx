"use client";

import { useTransition } from "react";
import {
  CheckIcon,
  CirclePlayIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MaintenanceStatus } from "@/generated/prisma/enums";
import { setMaintenanceStatus } from "@/server/actions/maintenance";

export function RecordActions({
  recordId,
  status,
  compact = false,
}: {
  recordId: string;
  status: MaintenanceStatus;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (status === "COMPLETED" || status === "CANCELLED") {
    return null;
  }

  function update(next: "IN_PROGRESS" | "COMPLETED" | "CANCELLED") {
    startTransition(async () => {
      const result = await setMaintenanceStatus(recordId, next);
      if (result.ok) {
        toast.success(
          next === "IN_PROGRESS"
            ? "Maintenance started"
            : next === "COMPLETED"
              ? "Maintenance completed"
              : "Maintenance cancelled"
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  const size = compact ? "sm" : "default";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "OPEN" ? (
        <Button
          type="button"
          size={size}
          variant="outline"
          disabled={pending}
          onClick={() => update("IN_PROGRESS")}
        >
          {pending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <CirclePlayIcon />
          )}
          Start work
        </Button>
      ) : null}
      <Button
        type="button"
        size={size}
        variant={status === "IN_PROGRESS" ? "default" : "outline"}
        disabled={pending}
        onClick={() => update("COMPLETED")}
      >
        <CheckIcon />
        Complete
      </Button>
      <Button
        type="button"
        size={size}
        variant="ghost"
        disabled={pending}
        onClick={() => update("CANCELLED")}
      >
        <XIcon />
        Cancel
      </Button>
    </div>
  );
}
