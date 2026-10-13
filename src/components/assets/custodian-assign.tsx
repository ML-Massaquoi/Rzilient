"use client";

import { useEffect, useState, useActionState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  Loader2Icon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  UserRoundIcon,
  UserRoundPlusIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  checkOutAsset,
  searchAssignableEmployeesAction,
  transferAsset,
  type CustodyFormState,
} from "@/server/actions/custody";
import type { searchEmployees } from "@/server/queries/employees";

type EmployeeHit = Awaited<ReturnType<typeof searchEmployees>>[number];

const emptyState: CustodyFormState = { ok: false };
const DEBOUNCE_MS = 250;

export function CustodianAssign({
  mode,
  assetId,
  assetTag,
  condition,
  assignmentId,
  currentEmployeeId,
}: {
  mode: "checkout" | "transfer";
  assetId: string;
  assetTag: string;
  /** Asset's current condition — used as condition-at-checkout for quick assign. */
  condition?: string;
  assignmentId?: string;
  currentEmployeeId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmployeeHit[]>([]);
  const [selected, setSelected] = useState<EmployeeHit | null>(null);
  const [searched, setSearched] = useState(false);
  const [searching, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(
    mode === "checkout" ? checkOutAsset : transferAsset,
    emptyState
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const hits = await searchAssignableEmployeesAction(trimmed);
        setResults(
          currentEmployeeId
            ? hits.filter((hit) => hit.id !== currentEmployeeId)
            : hits
        );
        setSearched(true);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, currentEmployeeId]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSelected(null);
    setSearched(false);
  };

  const isCheckout = mode === "checkout";
  const photoId = selected?.attachments[0]?.id;

  return (
    <>
      <Button
        type="button"
        variant={isCheckout ? "default" : "outline"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        <UserRoundPlusIcon />
        {isCheckout ? "Select employee" : "Change custodian"}
      </Button>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent className="top-[12%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
          <DialogHeader className="border-border border-b px-5 py-4 text-left">
            <DialogTitle>
              {isCheckout ? "Check out to employee" : "Change custodian"}
            </DialogTitle>
            <DialogDescription>
              {isCheckout
                ? `Search the directory, then assign ${assetTag} to the employee you select.`
                : `Transfer custody of ${assetTag} to another employee.`}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto p-5">
            {!selected ? (
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    autoFocus
                    value={query}
                    onChange={(e) => {
                      const next = e.target.value;
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
                        const hitPhoto = hit.attachments[0]?.id;
                        return (
                          <li key={hit.id}>
                            <button
                              type="button"
                              onClick={() => setSelected(hit)}
                              className="hover:bg-muted/60 focus-visible:bg-muted/60 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left focus-visible:outline-none"
                            >
                              {hitPhoto ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={`/api/files/${hitPhoto}`}
                                  alt=""
                                  className="border-border size-8 shrink-0 rounded-full border object-cover"
                                />
                              ) : (
                                <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full border">
                                  <UserRoundIcon className="size-4" />
                                </div>
                              )}
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
                              <ArrowRightIcon className="text-muted-foreground ml-auto size-4 shrink-0" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : searched ? (
                    <p className="text-muted-foreground px-1 text-sm">
                      No employee found. Try a name, FIA number or department.
                    </p>
                  ) : (
                    <p className="text-muted-foreground px-1 text-sm">
                      Start typing to search the employee directory.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  {photoId ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`/api/files/${photoId}`}
                      alt={selected.fullName}
                      className="border-border size-20 shrink-0 rounded-lg border object-cover"
                    />
                  ) : (
                    <div className="bg-muted border-border text-muted-foreground flex size-20 shrink-0 items-center justify-center rounded-lg border">
                      <UserRoundIcon className="size-8" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <Link
                      href={`/employees/${selected.id}`}
                      onClick={close}
                      className="text-base font-semibold hover:underline"
                    >
                      {selected.fullName}
                    </Link>
                    <p className="text-muted-foreground text-sm">
                      {selected.position ? `${selected.position} · ` : ""}
                      {selected.department.name}
                    </p>
                    <p className="text-muted-foreground mt-1 font-mono text-xs">
                      {[selected.fiaNumber, selected.employeeNo]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {selected._count.assignments === 0
                        ? "No active assets"
                        : `Currently holding ${selected._count.assignments} asset${
                            selected._count.assignments === 1 ? "" : "s"
                          }`}
                    </p>
                  </div>
                </div>

                <dl className="divide-border border-t text-sm">
                  {selected.phone ? (
                    <div className="flex items-center justify-between gap-3 py-2">
                      <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <PhoneIcon className="size-3.5" />
                        Phone
                      </dt>
                      <dd>{selected.phone}</dd>
                    </div>
                  ) : null}
                  {selected.email ? (
                    <div className="flex items-center justify-between gap-3 py-2">
                      <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <MailIcon className="size-3.5" />
                        Email
                      </dt>
                      <dd className="truncate">{selected.email}</dd>
                    </div>
                  ) : null}
                </dl>

                <Link
                  href={`/employees/${selected.id}`}
                  onClick={close}
                  className="text-primary inline-flex w-fit items-center gap-1.5 text-sm hover:underline"
                >
                  Open full profile
                  <ArrowRightIcon className="size-3.5" />
                </Link>

                <form action={formAction} className="border-border border-t pt-4">
                  {isCheckout ? (
                    <>
                      <input type="hidden" name="assetId" value={assetId} />
                      <input type="hidden" name="employeeId" value={selected.id} />
                      <input type="hidden" name="condition" value={condition ?? "GOOD"} />
                    </>
                  ) : (
                    <>
                      <input type="hidden" name="assignmentId" value={assignmentId} />
                      <input type="hidden" name="toEmployeeId" value={selected.id} />
                    </>
                  )}

                  {state.error ? (
                    <Alert variant="destructive" className="mb-3">
                      <AlertDescription>{state.error}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setSelected(null)}
                      disabled={pending}
                    >
                      Back
                    </Button>
                    <Button type="submit" disabled={pending}>
                      {pending ? <Loader2Icon className="animate-spin" /> : null}
                      {pending
                        ? isCheckout
                          ? "Assigning…"
                          : "Transferring…"
                        : isCheckout
                          ? `Check out ${assetTag}`
                          : "Transfer asset"}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
