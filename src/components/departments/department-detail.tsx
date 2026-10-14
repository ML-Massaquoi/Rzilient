"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  UserPlusIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  addSystemAccount,
  createSystem,
  removeSystemAccount,
  type DepartmentFormState,
} from "@/server/actions/departments";

const emptyState: DepartmentFormState = { ok: false, attempt: 0 };

type EmployeeOption = {
  id: string;
  fullName: string;
  position: string | null;
};

export function NewSystemDialog({ departmentId }: { departmentId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createSystem, emptyState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <PlusIcon />
            New system
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a system</DialogTitle>
          <DialogDescription>
            Systems are the services departments use daily — Office 365, Sage,
            TAMS, FIDS, Payroll, and anything else you add.
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
          <input type="hidden" name="departmentId" value={departmentId} />
          <div>
            <Label htmlFor="system-name" className="mb-1.5 block text-sm">
              System name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="system-name"
              name="name"
              defaultValue={state.values?.name ?? ""}
              placeholder="e.g. Airport Ops System"
              aria-invalid={Boolean(state.errors?.name?.length)}
            />
            {state.errors?.name?.length ? (
              <p className="text-destructive mt-1.5 text-xs">
                {state.errors.name[0]}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
              Add system
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddAccountDialog({
  departmentId,
  system,
  employees,
}: {
  departmentId: string;
  system: { id: string; name: string };
  employees: EmployeeOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addSystemAccount,
    emptyState
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <UserPlusIcon />
            Add account
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{system.name} account</DialogTitle>
          <DialogDescription>
            Record which employee in this department has an account.
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
          <input type="hidden" name="departmentId" value={departmentId} />
          <input type="hidden" name="systemId" value={system.id} />

          <div>
            <Label htmlFor="account-employee" className="mb-1.5 block text-sm">
              Employee <span className="text-destructive">*</span>
            </Label>
            <Select name="employeeId">
              <SelectTrigger
                id="account-employee"
                className="w-full"
                aria-invalid={Boolean(state.errors?.employeeId?.length)}
              >
                <SelectValue placeholder="Choose an employee…" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.fullName}
                    {employee.position ? ` — ${employee.position}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.errors?.employeeId?.length ? (
              <p className="text-destructive mt-1.5 text-xs">
                {state.errors.employeeId[0]}
              </p>
            ) : (
              <p className="text-muted-foreground mt-1.5 text-xs">
                Only employees in this department are listed.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="account-username" className="mb-1.5 block text-sm">
              Username / email
            </Label>
            <Input
              id="account-username"
              name="username"
              defaultValue={state.values?.username ?? ""}
              placeholder="e.g. m.sesay or shared-account"
              className="font-mono"
            />
            <p className="text-muted-foreground mt-1.5 text-xs">
              Optional — leave blank if unknown or shared.
            </p>
          </div>

          <div>
            <Label htmlFor="account-notes" className="mb-1.5 block text-sm">
              Notes
            </Label>
            <Textarea
              id="account-notes"
              name="notes"
              rows={2}
              defaultValue={state.values?.notes ?? ""}
              placeholder="License tier, shared logon location, anything useful"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <CheckIcon />
              )}
              Save account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SystemAccountsPanel({
  departmentId,
  system,
  accounts,
  employees,
  canWrite,
}: {
  departmentId: string;
  system: { id: string; name: string; slug: string };
  accounts: {
    id: string;
    username: string | null;
    notes: string | null;
    employee: {
      id: string;
      fullName: string;
      position: string | null;
      unit: string | null;
      status: string;
    };
  }[];
  employees: EmployeeOption[];
  canWrite: boolean;
}) {
  function remove(id: string) {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("departmentId", departmentId);
    void removeSystemAccount(formData);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {system.name} accounts in this department
          </p>
          <p className="text-muted-foreground text-xs">
            {accounts.length} {accounts.length === 1 ? "person" : "people"} with
            an account
          </p>
        </div>
        {canWrite ? (
          <AddAccountDialog
            departmentId={departmentId}
            system={system}
            employees={employees}
          />
        ) : null}
      </div>

      {accounts.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          No one in this department has a {system.name} account yet.
          {canWrite ? " Use “Add account” to record the first one." : ""}
        </div>
      ) : (
        <div className="border-border overflow-x-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Notes</TableHead>
                {canWrite ? <TableHead className="w-16" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="min-w-[180px] text-sm font-medium">
                    <Link
                      href={`/employees/${account.employee.id}`}
                      className="hover:text-primary underline underline-offset-2"
                    >
                      {account.employee.fullName}
                    </Link>
                    {account.employee.status === "INACTIVE" ? (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        Inactive
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">
                    {account.employee.position ?? account.employee.unit ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm whitespace-nowrap">
                    {account.username ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[240px] truncate text-xs">
                    {account.notes ?? "—"}
                  </TableCell>
                  {canWrite ? (
                    <TableCell>
                      <ConfirmDialog
                        title="Remove account?"
                        description={`Remove ${account.employee.fullName}'s ${system.name} account from this department?`}
                        confirmLabel="Remove"
                        destructive
                        onConfirm={() => remove(account.id)}
                      >
                        {({ onClick }) => (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onClick}
                            aria-label="Remove account"
                          >
                            <Trash2Icon />
                          </Button>
                        )}
                      </ConfirmDialog>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
