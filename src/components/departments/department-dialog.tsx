"use client";

import { useActionState, useState, type ReactElement, type ReactNode } from "react";
import {
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  createDepartment,
  deleteDepartment,
  updateDepartment,
  type DepartmentFormState,
} from "@/server/actions/departments";

const emptyState: DepartmentFormState = { ok: false, attempt: 0 };

export type DepartmentItem = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  employeeCount: number;
  allEmployeeCount: number;
  checkedOutCount: number;
};

export type DepartmentOption = { id: string; name: string };

function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string[];
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-sm">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
      {error?.length ? (
        <p className="text-destructive mt-1.5 text-xs">{error[0]}</p>
      ) : hint ? (
        <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

export function DepartmentDialog({
  mode,
  department,
}: {
  mode: "create" | "edit";
  department?: DepartmentItem;
}) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createDepartment : updateDepartment;
  const [state, formAction, pending] = useActionState(action, emptyState);

  const err = (key: string) => state.errors?.[key];
  const v = (key: "name" | "code" | "description") =>
    state.values?.[key] ?? department?.[key] ?? "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={mode === "create" ? "default" : "ghost"} size="sm">
            {mode === "create" ? <PlusIcon /> : <PencilIcon />}
            {mode === "create" ? "New department" : "Edit"}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add department" : "Edit department"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Departments group employees and the devices checked out to them — Front Office, Engineering, Finance and anything new."
              : "Update the department name, code or description. Employees stay assigned."}
          </DialogDescription>
        </DialogHeader>
        <form
          key={state.attempt ?? 0}
          action={formAction}
          className="flex flex-col gap-4"
        >
          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to save</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          {mode === "edit" && department ? (
            <input type="hidden" name="id" value={department.id} />
          ) : null}

          <Field
            label="Department name"
            htmlFor="department-name"
            required
            error={err("name")}
          >
            <Input
              id="department-name"
              name="name"
              defaultValue={v("name")}
              placeholder="e.g. Front Office"
              aria-invalid={Boolean(err("name")?.length)}
            />
          </Field>

          <Field
            label="Code"
            htmlFor="department-code"
            error={err("code")}
            hint="Optional short code shown next to the name — e.g. FO, ENG."
          >
            <Input
              id="department-code"
              name="code"
              defaultValue={v("code")}
              placeholder="e.g. FO"
              maxLength={12}
              className="uppercase"
              aria-invalid={Boolean(err("code")?.length)}
            />
          </Field>

          <Field label="Description" htmlFor="department-description" error={err("description")}>
            <Textarea
              id="department-description"
              name="description"
              rows={2}
              defaultValue={v("description")}
              placeholder="Optional — what this department is responsible for."
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              {mode === "create" ? "Add department" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDepartmentDialog({
  department,
  destinations,
  trigger,
}: {
  department: DepartmentItem;
  destinations: DepartmentOption[];
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteDepartment,
    emptyState
  );

  const others = destinations.filter((d) => d.id !== department.id);
  const needsDestination = department.allEmployeeCount > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="ghost" size="sm">
              <Trash2Icon />
              Delete
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {department.name}?</DialogTitle>
          <DialogDescription>
            {needsDestination
              ? `${department.allEmployeeCount} ${
                  department.allEmployeeCount === 1
                    ? "employee belongs"
                    : "employees belong"
                } to this department and must be moved before it can be deleted.`
              : "The department will be removed from the directory. Devices keep their records but lose the direct department link."}
          </DialogDescription>
        </DialogHeader>
        <form
          key={state.attempt ?? 0}
          action={formAction}
          className="flex flex-col gap-4"
        >
          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to delete</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <input type="hidden" name="departmentId" value={department.id} />

          {needsDestination ? (
            <Field
              label="Move employees to"
              htmlFor="delete-destination"
              required
              error={state.errors?.moveToDepartmentId}
              hint={
                others.length === 0
                  ? "Create another department first — employees cannot be left without one."
                  : undefined
              }
            >
              <Select
                name="moveToDepartmentId"
                defaultValue={state.values?.moveToDepartmentId}
                disabled={others.length === 0}
              >
                <SelectTrigger
                  id="delete-destination"
                  className="w-full"
                  aria-invalid={Boolean(
                    state.errors?.moveToDepartmentId?.length
                  )}
                >
                  <SelectValue placeholder="Choose a department…" />
                </SelectTrigger>
                <SelectContent>
                  {others.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
              Delete department
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DepartmentRowActions({
  department,
  destinations,
}: {
  department: DepartmentItem;
  destinations: DepartmentOption[];
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <DepartmentDialog mode="edit" department={department} />
      <DeleteDepartmentDialog
        department={department}
        destinations={destinations}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${department.name}`}
          >
            <Trash2Icon />
          </Button>
        }
      />
    </div>
  );
}
