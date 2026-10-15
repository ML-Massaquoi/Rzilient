"use client";

import { useEffect, useMemo, useState, useActionState, useTransition } from "react";
import {
  ArrowLeftRightIcon,
  CheckIcon,
  Loader2Icon,
  SearchIcon,
  UserRoundIcon,
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
import {
  bulkTransferEmployeesToDepartment,
  searchMovableEmployeesAction,
  type DepartmentFormState,
} from "@/server/actions/departments";
import type { searchEmployees } from "@/server/queries/employees";

type EmployeeHit = Awaited<ReturnType<typeof searchEmployees>>[number];

const emptyState: DepartmentFormState = { ok: false, attempt: 0 };
const DEBOUNCE_MS = 250;

export function MoveEmployeesDialog({
  departmentId,
  departmentName,
}: {
  departmentId: string;
  departmentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmployeeHit[]>([]);
  const [selected, setSelected] = useState<EmployeeHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(
    bulkTransferEmployeesToDepartment,
    emptyState
  );

  const selectedIds = useMemo(
    () => new Set(selected.map((employee) => employee.id)),
    [selected]
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const hits = await searchMovableEmployeesAction(trimmed, departmentId);
        setResults(hits);
        setSearched(true);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, departmentId]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSelected([]);
    setSearched(false);
  };

  const toggle = (hit: EmployeeHit) => {
    setSelected((current) =>
      current.some((employee) => employee.id === hit.id)
        ? current.filter((employee) => employee.id !== hit.id)
        : [...current, hit]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <UserRoundIcon />
            Move employees here
          </Button>
        }
      />
      <DialogContent className="top-[10%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogHeader className="border-border border-b px-5 py-4 text-left">
          <DialogTitle>Move employees here</DialogTitle>
          <DialogDescription>
            Search the directory, pick the employees joining {departmentName},
            and move them in one step.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex max-h-[75vh] flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
            {state.error ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to move</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <input type="hidden" name="departmentId" value={departmentId} />
            <input
              type="hidden"
              name="redirectTo"
              value={`/departments/${departmentId}`}
            />
            {selected.map((employee) => (
              <input
                key={employee.id}
                type="hidden"
                name="employeeIds"
                value={employee.id}
              />
            ))}

            <div className="relative">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => {
                  const next = event.target.value;
                  setQuery(next);
                  if (!next.trim()) {
                    setResults([]);
                    setSearched(false);
                  }
                }}
                placeholder="Search by name, FIA number or department…"
                className="pl-9"
                aria-label="Search employees"
              />
            </div>

            <div className="flex min-h-24 flex-col gap-1">
              {searching ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Searching…
                </p>
              ) : results.length > 0 ? (
                <ul className="flex flex-col">
                  {results.map((hit) => {
                    const isSelected = selectedIds.has(hit.id);
                    return (
                      <li key={hit.id}>
                        <button
                          type="button"
                          onClick={() => toggle(hit)}
                          aria-pressed={isSelected}
                          className="hover:bg-muted/60 focus-visible:bg-muted/60 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left focus-visible:outline-none"
                        >
                          <span
                            className={
                              isSelected
                                ? "bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-md border"
                                : "border-input flex size-5 shrink-0 items-center justify-center rounded-md border"
                            }
                          >
                            {isSelected ? <CheckIcon className="size-3.5" /> : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {hit.fullName}
                            </span>
                            <span className="text-muted-foreground block truncate text-xs">
                              {[hit.fiaNumber, hit.department.name, hit.position]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : searched ? (
                <p className="text-muted-foreground px-1 text-sm">
                  No employee found outside this department. Try a name, FIA
                  number or department.
                </p>
              ) : (
                <p className="text-muted-foreground px-1 text-sm">
                  Start typing to search the employee directory.
                </p>
              )}
            </div>

            {selected.length > 0 ? (
              <div className="border-border bg-muted/40 rounded-lg border p-3">
                <p className="text-muted-foreground mb-2 text-xs font-medium">
                  Selected ({selected.length})
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {selected.map((employee) => (
                    <li key={employee.id}>
                      <button
                        type="button"
                        onClick={() => toggle(employee)}
                        aria-label={`Remove ${employee.fullName}`}
                        className="bg-background border-border text-foreground hover:bg-muted inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
                      >
                        {employee.fullName}
                        <span className="text-muted-foreground">×</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-border border-t px-5 py-4">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || selected.length === 0}>
              {pending ? <Loader2Icon className="animate-spin" /> : <ArrowLeftRightIcon />}
              {pending
                ? "Moving…"
                : `Move ${selected.length} ${
                    selected.length === 1 ? "employee" : "employees"
                  }`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
