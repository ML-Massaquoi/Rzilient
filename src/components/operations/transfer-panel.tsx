"use client";

import { useActionState, useState } from "react";
import { ArrowRightLeftIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { transferAsset } from "@/server/actions/custody";
import type { ActiveAssignment } from "@/server/queries/custody";
import { TRANSFER_REASONS } from "@/lib/custody";
import { EmployeePicker, type EmployeeHit } from "./selectors";

export function TransferPanel({ assignment }: { assignment: ActiveAssignment }) {
  const [state, formAction, pending] = useActionState(transferAsset, {
    ok: false,
    attempt: 0,
  });
  const [employee, setEmployee] = useState<EmployeeHit | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  return (
    <form
      action={formAction}
      className="border-border flex flex-col gap-4 rounded-lg border p-5"
    >
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <input type="hidden" name="toEmployeeId" value={employee?.id ?? ""} />
      <input type="hidden" name="reason" value={reason} />
      <input type="hidden" name="notes" value={notes} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Transfer custody</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {assignment.asset.name} ·{" "}
            <span className="font-mono">{assignment.asset.assetTag}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Current custodian</p>
          <p className="text-sm font-medium">{assignment.employee.fullName}</p>
          <p className="text-muted-foreground text-xs">
            {assignment.employee.department.name}
          </p>
        </div>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>Transfer failed</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {hint ? (
        <Alert>
          <AlertDescription>{hint}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label>Transfer to</Label>
        <EmployeePicker
          value={employee}
          onChange={(next) => {
            setEmployee(next);
            setHint(null);
          }}
          excludeId={assignment.employee.id}
          inputId="transfer-employee-search"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transfer-reason">Reason</Label>
        <Select
          value={reason}
          onValueChange={(next) => setReason(next ?? "")}
        >
          <SelectTrigger id="transfer-reason" className="w-full">
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {TRANSFER_REASONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transfer-notes">Notes</Label>
        <Textarea
          id="transfer-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Handover context…"
          rows={2}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={pending}
          onClick={(e) => {
            if (!employee) {
              e.preventDefault();
              setHint("Select the employee receiving the asset.");
            }
          }}
        >
          <ArrowRightLeftIcon />
          {pending ? "Transferring…" : "Transfer asset"}
        </Button>
      </div>
    </form>
  );
}
