"use client";

import { useActionState, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { checkOutAsset } from "@/server/actions/custody";
import type { CheckoutAsset } from "@/server/queries/custody";
import { ACCESSORY_OPTIONS } from "@/lib/custody";
import { ASSET_CONDITIONS } from "@/lib/validation/asset";
import { CONDITION_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/datetime";
import {
  AssetMultiPicker,
  EmployeePicker,
  type EmployeeHit,
} from "./selectors";

const STEPS = ["Assets", "Employee", "Condition & accessories", "Confirm"] as const;

export function CheckoutWizard({
  initialAsset,
}: {
  initialAsset: CheckoutAsset | null;
}) {
  const [state, formAction, pending] = useActionState(checkOutAsset, {
    ok: false,
    attempt: 0,
  });
  const [step, setStep] = useState(initialAsset ? 2 : 1);
  const [assets, setAssets] = useState<CheckoutAsset[]>(
    initialAsset ? [initialAsset] : []
  );
  const [employee, setEmployee] = useState<EmployeeHit | null>(null);
  const [condition, setCondition] = useState<string>(
    initialAsset?.condition ?? "GOOD"
  );
  const [accessories, setAccessories] = useState<string[]>([]);
  const [expectedReturnAt, setExpectedReturnAt] = useState("");
  const [notes, setNotes] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  function toggleAccessory(name: string) {
    setAccessories((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  function goNext() {
    setHint(null);
    if (step === 1 && assets.length === 0) {
      setHint("Select at least one asset to continue.");
      return;
    }
    if (step === 2 && !employee) {
      setHint("Select an employee to continue.");
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  }

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => {
          const number = index + 1;
          const done = number < step;
          const current = number === step;
          return (
            <li
              key={label}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                current
                  ? "border-primary text-primary"
                  : done
                    ? "text-muted-foreground"
                    : "text-muted-foreground/60"
              }`}
            >
              <span
                className={`grid size-4 place-items-center rounded-full text-[10px] ${
                  current
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-muted"
                      : "border"
                }`}
              >
                {done ? <CheckIcon className="size-2.5" /> : number}
              </span>
              {label}
            </li>
        );
      })}
      </ol>

      {assets.length > 0 && step > 1 ? (
        <div className="border-border flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
          <span className="min-w-0">
            <span className="text-muted-foreground block text-xs">
              {assets.length} device{assets.length === 1 ? "" : "s"} selected
            </span>
            <span className="mt-0.5 block truncate">
              {assets
                .map((asset) => `${asset.assetTag} ${asset.name}`)
                .join(" · ")}
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setHint(null);
              setStep(1);
            }}
          >
            Change assets
          </Button>
        </div>
      ) : null}

      <form action={formAction} className="flex flex-col gap-5">
        {assets.map((asset) => (
          <input
            key={asset.id}
            type="hidden"
            name="assetIds"
            value={asset.id}
          />
        ))}
        <input type="hidden" name="employeeId" value={employee?.id ?? ""} />
        <input type="hidden" name="condition" value={condition} />
        <input
          type="hidden"
          name="expectedReturnAt"
          value={expectedReturnAt}
        />
        <input type="hidden" name="notes" value={notes} />
        {accessories.map((option) => (
          <input key={option} type="hidden" name="accessories" value={option} />
        ))}

        {state.error ? (
          <Alert variant="destructive">
            <AlertTitle>Check-out failed</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        {hint ? (
          <Alert>
            <AlertDescription>{hint}</AlertDescription>
          </Alert>
        ) : null}

        {step === 1 ? (
          <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
            <div>
              <h2 className="text-sm font-semibold">1. Select the assets</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Pick one or more devices — PC, laptop, printer, phone — they
                are all handed to the same employee in one step. Only
                available assets without an active assignment can be checked
                out.
              </p>
            </div>
            <AssetMultiPicker value={assets} onChange={setAssets} />
          </section>
        ) : null}

        {step === 2 ? (
          <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
            <div>
              <h2 className="text-sm font-semibold">2. Select the employee</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Search by name, FIA number, employee number or department — no
                manual typing required.
              </p>
            </div>
            <EmployeePicker value={employee} onChange={setEmployee} />
          </section>
        ) : null}

        {step === 3 ? (
          <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
            <div>
              <h2 className="text-sm font-semibold">
                3. Condition &amp; accessories
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Record what leaves the store with these assets — one shared
                condition and accessory set for the whole handover.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="checkout-condition">Condition at handover</Label>
                <Select
                  value={condition}
                  onValueChange={(next) => setCondition(next ?? condition)}
                >
                  <SelectTrigger id="checkout-condition" className="w-full">
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
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expectedReturnAt">Expected return date</Label>
                <Input
                  id="expectedReturnAt"
                  type="date"
                  value={expectedReturnAt}
                  onChange={(e) => setExpectedReturnAt(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Accessories handed over</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {ACCESSORY_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className="border-border hover:bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={accessories.includes(option)}
                      onCheckedChange={() => toggleAccessory(option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkout-notes">Notes</Label>
              <Textarea
                id="checkout-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Handover context, due date agreement…"
                rows={3}
              />
            </div>
          </section>
        ) : null}

        {step === 4 && assets.length > 0 && employee ? (
          <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
            <div>
              <h2 className="text-sm font-semibold">4. Confirm check-out</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                The transaction is committed atomically — every asset status,
                assignment and history are updated together.
              </p>
            </div>
            <dl className="divide-border border-t text-sm">
              <SummaryRow label={`Assets (${assets.length})`}>
                <ul className="flex flex-col items-end gap-1">
                  {assets.map((asset) => (
                    <li key={asset.id}>
                      <span className="font-mono text-xs">
                        {asset.assetTag}
                      </span>{" "}
                      {asset.name}
                    </li>
                  ))}
                </ul>
              </SummaryRow>
              <SummaryRow label="Employee">
                {employee.fullName}
                <span className="text-muted-foreground">
                  {" "}
                  · {employee.department.name}
                  {employee.fiaNumber ? ` · ${employee.fiaNumber}` : ""}
                </span>
              </SummaryRow>
              <SummaryRow label="Condition">
                {CONDITION_LABELS[
                  condition as (typeof ASSET_CONDITIONS)[number]
                ] ?? condition}
              </SummaryRow>
              <SummaryRow label="Accessories">
                {accessories.length > 0 ? accessories.join(", ") : "None"}
              </SummaryRow>
              <SummaryRow label="Expected return">
                {expectedReturnAt ? formatDate(expectedReturnAt) : "Not set"}
              </SummaryRow>
              <SummaryRow label="Notes">{notes || "—"}</SummaryRow>
            </dl>
          </section>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={step === 1 || pending}
            onClick={() => {
              setHint(null);
              setStep((s) => Math.max(1, s - 1));
            }}
          >
            <ArrowLeftIcon />
            Back
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={goNext}>
              Next
              <ArrowRightIcon />
            </Button>
          ) : (
            <Button type="submit" disabled={pending}>
              {pending ? "Checking out…" : "Confirm check-out"}
              {!pending ? <ArrowRightIcon /> : null}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3 py-2.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
