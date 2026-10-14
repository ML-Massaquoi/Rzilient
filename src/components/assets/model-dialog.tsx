"use client";

import { useActionState, useState } from "react";
import {
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createDeviceModel,
  deleteDeviceModel,
  updateDeviceModel,
  type DeviceModelFormState,
} from "@/server/actions/device-models";

const emptyState: DeviceModelFormState = { ok: false, attempt: 0 };

export type CategoryOption = { id: string; name: string };

export type DeviceModelItem = {
  id: string;
  categoryId: string;
  brand: string;
  name: string;
  notes: string | null;
  category: { name: string };
  _count: { assets: number };
};

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
  children: React.ReactNode;
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

export function ModelDialog({
  mode,
  model,
  categories,
}: {
  mode: "create" | "edit";
  model?: DeviceModelItem;
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createDeviceModel : updateDeviceModel;
  const [state, formAction, pending] = useActionState(action, emptyState);

  const err = (key: string) => state.errors?.[key];
  const v = (key: string) =>
    state.values?.[key] ?? String(model?.[key as keyof DeviceModelItem] ?? "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={mode === "create" ? "default" : "ghost"} size="sm">
            {mode === "create" ? <PlusIcon /> : <PencilIcon />}
            {mode === "create" ? "New model" : "Edit"}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add device model" : "Edit device model"}
          </DialogTitle>
          <DialogDescription>
            Models keep brands and type names consistent — Xerox VersaLink,
            Dell Latitude, HP LaserJet and anything new you register.
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
          {mode === "edit" && model ? (
            <input type="hidden" name="id" value={model.id} />
          ) : null}

          <Field
            label="Category"
            htmlFor="model-category"
            required
            error={err("categoryId")}
          >
            <Select
              name="categoryId"
              defaultValue={
                state.values?.categoryId ?? model?.categoryId ?? undefined
              }
            >
              <SelectTrigger
                id="model-category"
                className="w-full"
                aria-invalid={Boolean(err("categoryId")?.length)}
              >
                <SelectValue placeholder="Choose a category…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Brand" htmlFor="model-brand" required error={err("brand")}>
              <Input
                id="model-brand"
                name="brand"
                defaultValue={v("brand")}
                placeholder="e.g. Xerox"
                aria-invalid={Boolean(err("brand")?.length)}
              />
            </Field>
            <Field
              label="Model name"
              htmlFor="model-name"
              required
              error={err("name")}
            >
              <Input
                id="model-name"
                name="name"
                defaultValue={v("name")}
                placeholder="e.g. VersaLink C7030"
                aria-invalid={Boolean(err("name")?.length)}
              />
            </Field>
          </div>

          <Field label="Notes" htmlFor="model-notes" error={err("notes")}>
            <Textarea
              id="model-notes"
              name="notes"
              rows={2}
              defaultValue={v("notes")}
              placeholder="Optional — toner type, typical use, etc."
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
              {mode === "create" ? "Add model" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ModelRowActions({
  model,
  categories,
}: {
  model: DeviceModelItem;
  categories: CategoryOption[];
}) {
  function remove() {
    const formData = new FormData();
    formData.append("id", model.id);
    void deleteDeviceModel(formData);
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <ModelDialog mode="edit" model={model} categories={categories} />
      <ConfirmDialog
        title="Delete model?"
        description={`${model.brand} ${model.name} will be removed from the catalog. Models used by existing devices cannot be deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      >
        {({ onClick }) => (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClick}
            aria-label="Delete model"
          >
            <Trash2Icon />
          </Button>
        )}
      </ConfirmDialog>
    </div>
  );
}
