"use client";

import { useActionState, useState } from "react";
import { ArrowLeftRightIcon, Loader2Icon, SendIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StockTransactionType } from "@/generated/prisma/enums";
import { STOCK_TX_LABELS } from "@/lib/labels";
import {
  recordStockTransaction,
  type InventoryFormState,
} from "@/server/actions/inventory";
import type { InventoryListItem } from "@/server/queries/inventory";

const emptyState: InventoryFormState = { ok: false, attempt: 0 };

const TYPE_HINTS: Record<StockTransactionType, string> = {
  RECEIVED: "Stock coming in (delivery, purchase).",
  ISSUED: "Stock handed out (consumed or given to a person/department).",
  ADJUSTED: "Correction with a signed amount, e.g. 5 or -3.",
  DAMAGED: "Units written off as damaged.",
  LOST: "Units written off as lost.",
  RETURNED: "Previously issued stock coming back.",
};

export function TransactDialog({ item }: { item: InventoryListItem }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<StockTransactionType>("RECEIVED");
  const [state, formAction, pending] = useActionState(
    recordStockTransaction,
    emptyState
  );

  const err = (key: string) => state.errors?.[key];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <ArrowLeftRightIcon />
            Move stock
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record stock movement</DialogTitle>
          <DialogDescription>
            {item.name} · {item.sku} — currently{" "}
            <span className="text-foreground font-medium tabular-nums">
              {item.quantity} {item.unit}
            </span>{" "}
            on hand. Every movement is stored as an immutable transaction.
          </DialogDescription>
        </DialogHeader>

        <form
          key={state.attempt ?? 0}
          action={formAction}
          className="flex flex-col gap-4"
        >
          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to record</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <input type="hidden" name="itemId" value={item.id} />

          <div>
            <Label htmlFor="type" className="mb-1.5 block text-sm">
              Type<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select
              name="type"
              value={type}
              onValueChange={(value) => setType(value as StockTransactionType)}
            >
              <SelectTrigger id="type" aria-label="Transaction type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(StockTransactionType).map((value) => (
                  <SelectItem key={value} value={value}>
                    {STOCK_TX_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground mt-1.5 text-xs">
              {TYPE_HINTS[type]}
            </p>
          </div>

          <div>
            <Label htmlFor="quantity" className="mb-1.5 block text-sm">
              Quantity<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="quantity"
              name="quantity"
              inputMode="numeric"
              defaultValue={state.values?.quantity ?? ""}
              placeholder={type === "ADJUSTED" ? "e.g. 5 or -3" : "e.g. 24"}
              aria-invalid={Boolean(err("quantity"))}
              aria-describedby={err("quantity") ? "quantity-error" : undefined}
              className="tabular-nums"
            />
            {err("quantity")?.length ? (
              <p
                id="quantity-error"
                className="text-destructive mt-1.5 text-xs"
              >
                {err("quantity")![0]}
              </p>
            ) : (
              <p className="text-muted-foreground mt-1.5 text-xs">
                {type === "ADJUSTED"
                  ? "Signed delta applied to the current quantity."
                  : type === "RECEIVED" || type === "RETURNED"
                    ? "Units added to stock."
                    : "Units removed from stock."}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="reference" className="mb-1.5 block text-sm">
              Reference
            </Label>
            <Input
              id="reference"
              name="reference"
              defaultValue={state.values?.reference ?? ""}
              placeholder="PO number, requisition, recipient…"
              aria-invalid={Boolean(err("reference"))}
            />
          </div>

          <div>
            <Label htmlFor="tx-notes" className="mb-1.5 block text-sm">
              Notes
            </Label>
            <Textarea
              id="tx-notes"
              name="notes"
              rows={2}
              defaultValue={state.values?.notes ?? ""}
              placeholder="Optional context"
              aria-invalid={Boolean(err("notes"))}
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
              {pending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
              Record movement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
