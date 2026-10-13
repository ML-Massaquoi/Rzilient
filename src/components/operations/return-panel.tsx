"use client";

import { useActionState, useState } from "react";
import { RotateCcwIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { returnAsset } from "@/server/actions/custody";
import type { ActiveAssignment } from "@/server/queries/custody";
import { ASSET_CONDITIONS } from "@/lib/validation/asset";
import { CONDITION_LABELS } from "@/lib/labels";

export function ReturnPanel({ assignment }: { assignment: ActiveAssignment }) {
  const [state, formAction, pending] = useActionState(returnAsset, {
    ok: false,
    attempt: 0,
  });
  const [condition, setCondition] = useState<string>(
    assignment.asset.condition
  );
  const [returned, setReturned] = useState<string[]>(
    assignment.accessoriesOut
  );
  const [damageNotes, setDamageNotes] = useState("");
  const [notes, setNotes] = useState("");

  function toggleReturned(name: string) {
    setReturned((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  return (
    <form
      action={formAction}
      className="border-border flex flex-col gap-4 rounded-lg border p-5"
    >
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <input type="hidden" name="condition" value={condition} />
      <input type="hidden" name="damageNotes" value={damageNotes} />
      <input type="hidden" name="notes" value={notes} />
      {returned.map((name) => (
        <input key={name} type="hidden" name="returned" value={name} />
      ))}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Record return</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {assignment.asset.name} ·{" "}
            <span className="font-mono">{assignment.asset.assetTag}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{assignment.employee.fullName}</p>
          <p className="text-muted-foreground text-xs">
            Checked out {new Date(assignment.assignedAt).toLocaleDateString("en-GB")}
          </p>
        </div>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>Return failed</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="return-condition">Return condition</Label>
        <Select
          value={condition}
          onValueChange={(next) => setCondition(next ?? condition)}
        >
          <SelectTrigger id="return-condition" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSET_CONDITIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {CONDITION_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Damaged or malfunctioning assets move to maintenance automatically.
        </p>
      </div>

      {assignment.accessoriesOut.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label>Accessories</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {assignment.accessoriesOut.map((option) => (
              <label
                key={option}
                className="border-border hover:bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={returned.includes(option)}
                  onCheckedChange={() => toggleReturned(option)}
                />
                {option}
              </label>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            Untick anything that was not returned — it is recorded as missing
            in the return history.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="damage-notes">Damage notes (if any)</Label>
        <Textarea
          id="damage-notes"
          value={damageNotes}
          onChange={(e) => setDamageNotes(e.target.value)}
          placeholder="Screen dent, loose hinge, battery not charging…"
          rows={2}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="return-notes">General notes</Label>
        <Textarea
          id="return-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering about this return…"
          rows={2}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <RotateCcwIcon />
          {pending ? "Recording…" : "Record return"}
        </Button>
      </div>
    </form>
  );
}
