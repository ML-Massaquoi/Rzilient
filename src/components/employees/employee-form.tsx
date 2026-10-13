"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EmployeeFormState } from "@/server/actions/employees";
import { EMPLOYMENT_STATUS_LABELS } from "@/lib/labels";
import type { EmploymentStatus } from "@/generated/prisma/enums";

export const emptyEmployeeFormState: EmployeeFormState = {
  ok: false,
  attempt: 0,
};

type Option = { id: string; name: string };

export type EmployeeDefaults = Partial<
  Record<
    | "firstName"
    | "middleName"
    | "lastName"
    | "departmentId"
    | "fiaNumber"
    | "employeeNo"
    | "position"
    | "unit"
    | "email"
    | "phone"
    | "status"
    | "notes",
    string
  >
>;

function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string[];
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-sm">
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </Label>
      {children}
      {error?.length ? (
        <p id={`${htmlFor}-error`} className="text-destructive mt-1.5 text-xs">
          {error[0]}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="sm:col-span-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-muted-foreground text-xs">{description}</p>
    </div>
  );
}

export function EmployeeForm({
  action,
  mode,
  employeeId,
  departments,
  defaults,
  cancelHref,
}: {
  action: (prev: EmployeeFormState, formData: FormData) => Promise<EmployeeFormState>;
  mode: "create" | "edit";
  employeeId?: string;
  departments: Option[];
  defaults: EmployeeDefaults;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    emptyEmployeeFormState
  );

  const v = (key: keyof EmployeeDefaults): string =>
    state.values?.[key] ?? defaults[key] ?? "";
  const err = (key: string) => state.errors?.[key];

  return (
    <form
      key={state.attempt ?? 0}
      action={formAction}
      className="flex flex-col gap-6"
    >
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to save</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {mode === "edit" && employeeId ? (
        <input type="hidden" name="id" value={employeeId} />
      ) : null}

      <section className="bg-card rounded-lg border p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SectionTitle
            title="Identity"
            description="Name as it should appear across the directory and asset records."
          />

          <Field label="First name" htmlFor="firstName" required error={err("firstName")}>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={v("firstName")}
              autoComplete="given-name"
              aria-invalid={Boolean(err("firstName"))}
              aria-describedby={err("firstName") ? "firstName-error" : undefined}
            />
          </Field>

          <Field label="Middle name" htmlFor="middleName" error={err("middleName")}>
            <Input
              id="middleName"
              name="middleName"
              defaultValue={v("middleName")}
              autoComplete="additional-name"
            />
          </Field>

          <Field label="Last name" htmlFor="lastName" required error={err("lastName")}>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={v("lastName")}
              autoComplete="family-name"
              aria-invalid={Boolean(err("lastName"))}
              aria-describedby={err("lastName") ? "lastName-error" : undefined}
            />
          </Field>

          <Field
            label="Employment status"
            htmlFor="status"
            required
            error={err("status")}
            hint="Inactive employees stay in history but are hidden from check-out."
          >
            <Select name="status" defaultValue={v("status") || "ACTIVE"}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(EMPLOYMENT_STATUS_LABELS) as EmploymentStatus[]).map(
                  (status) => (
                    <SelectItem key={status} value={status}>
                      {EMPLOYMENT_STATUS_LABELS[status]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className="bg-card rounded-lg border p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SectionTitle
            title="Placement"
            description="Department drives reporting and who an asset is assigned through."
          />

          <Field
            label="Department"
            htmlFor="departmentId"
            required
            error={err("departmentId")}
          >
            <Select name="departmentId" defaultValue={v("departmentId")}>
              <SelectTrigger
                id="departmentId"
                className="w-full"
                aria-invalid={Boolean(err("departmentId"))}
              >
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Position / title" htmlFor="position" error={err("position")}>
            <Input
              id="position"
              name="position"
              defaultValue={v("position")}
              placeholder="e.g. Systems Administrator"
            />
          </Field>

          <Field label="Unit / section" htmlFor="unit" error={err("unit")}>
            <Input
              id="unit"
              name="unit"
              defaultValue={v("unit")}
              placeholder="e.g. Network Operations"
            />
          </Field>

          <Field
            label="Notes"
            htmlFor="notes"
            error={err("notes")}
            className="sm:col-span-2"
          >
            <Textarea id="notes" name="notes" rows={3} defaultValue={v("notes")} />
          </Field>
        </div>
      </section>

      <section className="bg-card rounded-lg border p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SectionTitle
            title="Contact & identifiers"
            description="Optional details used to reach the person or match records."
          />

          <Field
            label="FIA number"
            htmlFor="fiaNumber"
            error={err("fiaNumber")}
            hint="Must be unique when provided."
          >
            <Input
              id="fiaNumber"
              name="fiaNumber"
              defaultValue={v("fiaNumber")}
              className="font-mono"
              placeholder="FIA-0000"
              aria-invalid={Boolean(err("fiaNumber"))}
              aria-describedby={err("fiaNumber") ? "fiaNumber-error" : undefined}
            />
          </Field>

          <Field
            label="Employee number"
            htmlFor="employeeNo"
            error={err("employeeNo")}
            hint="Must be unique when provided."
          >
            <Input
              id="employeeNo"
              name="employeeNo"
              defaultValue={v("employeeNo")}
              className="font-mono"
              aria-invalid={Boolean(err("employeeNo"))}
              aria-describedby={err("employeeNo") ? "employeeNo-error" : undefined}
            />
          </Field>

          <Field
            label="Email"
            htmlFor="email"
            error={err("email")}
            hint="Must be unique when provided."
          >
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={v("email")}
              autoComplete="email"
              aria-invalid={Boolean(err("email"))}
              aria-describedby={err("email") ? "email-error" : undefined}
            />
          </Field>

          <Field label="Phone / dial number" htmlFor="phone" error={err("phone")}>
            <Input
              id="phone"
              name="phone"
              defaultValue={v("phone")}
              className="font-mono"
              placeholder="e.g. 252000"
            />
          </Field>
        </div>
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          render={<Link href={cancelHref} />}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2Icon className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <SaveIcon />
              {mode === "create" ? "Add employee" : "Save changes"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
