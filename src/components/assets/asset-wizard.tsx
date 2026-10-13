"use client";

import { useEffect, useActionState, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import QRCode from "qrcode";
import { motion } from "motion/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CameraIcon,
  BoxesIcon,
  SaveIcon,
  Loader2Icon,
  PencilIcon,
  ScanLineIcon,
  CpuIcon,
  ClipboardPasteIcon,
} from "lucide-react";
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
import { StatusBadge } from "@/components/assets/status-badge";
import { createAsset, type AssetFormState } from "@/server/actions/assets";
import { SUBMITTABLE_ASSET_STATUSES } from "@/lib/validation/asset";
import { qrPayloadForAsset } from "@/lib/asset-codes";
import {
  describeDetected,
  parseDetectPayload,
  type DetectedDevice,
} from "@/lib/device-detect";
import { CONDITION_LABELS, STATUS_LABELS } from "@/lib/labels";
import {
  AssetCondition,
  type AssetStatus,
} from "@/generated/prisma/enums";
import { cn } from "cn";

const emptyState: AssetFormState = { ok: false, attempt: 0 };

type Option = { id: string; name: string; requiresSerial?: boolean };

const STEP_LABELS = ["Identity", "Details", "Commercial", "Review"] as const;

const STEP_FIELDS: string[][] = [
  ["name", "assetTag", "categoryId", "serialNumber"],
  ["status", "condition", "locationId", "brand", "model", "os", "fqdn", "ethernetMac", "wifiMac"],
  ["purchaseDate", "purchaseCost", "supplier", "warrantyEndsAt", "description", "notes"],
  [],
];

function stepForField(field: string): number {
  for (let i = 0; i < STEP_FIELDS.length; i++) {
    if (STEP_FIELDS[i].includes(field)) return i;
  }
  return 0;
}

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

function StepHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
    </div>
  );
}

export function AssetWizard({
  categories,
  locations,
  nextTag,
  initialSerial,
  initialTag,
}: {
  categories: Option[];
  locations: Option[];
  nextTag: string;
  initialSerial?: string;
  initialTag?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createAsset, emptyState);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({
    assetTag: initialTag || nextTag,
    serialNumber: initialSerial ?? "",
    status: "AVAILABLE",
    condition: "GOOD",
  });
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const scannedCode = initialSerial || initialTag;
  const [detectInput, setDetectInput] = useState("");
  const [detectMessage, setDetectMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [autoToken, setAutoToken] = useState<string | null>(null);
  const [autoCommand, setAutoCommand] = useState<string | null>(null);
  const [collectBusy, setCollectBusy] = useState(false);

  const created = state.ok && state.assetId ? state : null;
  const createdTag = created
    ? (created.values?.assetTag ?? nextTag)
    : "";

  useEffect(() => {
    if (!created?.assetId) return;
    confetti({
      particleCount: 90,
      spread: 72,
      origin: { y: 0.35 },
      disableForReducedMotion: true,
    });
  }, [created?.assetId]);

  useEffect(() => {
    if (!created?.assetId || qrUrl) return;
    const valuesNow = created.values ?? {};
    void QRCode.toDataURL(
      qrPayloadForAsset({
        assetTag: createdTag,
        name: valuesNow.name,
        status: valuesNow.status,
        condition: valuesNow.condition,
        custodian: null,
      }),
      {
        width: 360,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#0f172a", light: "#ffffff" },
      }
    ).then(setQrUrl);
  }, [created?.assetId, createdTag, created?.values, qrUrl]);

  const set = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const applyDetected = useCallback((device: DetectedDevice) => {
    setValues((prev) => {
      const next = { ...prev };
      const put = (key: string, value: string | undefined, force = false) => {
        const v = value?.trim();
        if (!v) return;
        if (force || !next[key]?.trim()) next[key] = v;
      };
      put("serialNumber", device.serialNumber, true);
      put("fqdn", device.hostName, true);
      put("ethernetMac", device.ethernetMac, true);
      put("wifiMac", device.wifiMac, true);
      put("brand", device.manufacturer);
      put("model", device.model);
      put("os", device.osCaption);
      if (!next.name?.trim()) {
        const suggested = [device.manufacturer, device.model]
          .filter(Boolean)
          .join(" ");
        if (suggested) next.name = suggested;
      }
      if (!next.notes?.trim()) {
        const extras = [
          device.cpu,
          device.memoryGB ? `${device.memoryGB} GB RAM` : undefined,
          device.ip ? `IP ${device.ip}` : undefined,
        ].filter(Boolean);
        if (extras.length > 0) next.notes = `Detected: ${extras.join("; ")}`;
      }
      return next;
    });
    setDetectMessage({
      ok: true,
      text: `Filled from device — ${describeDetected(device)}. Review and continue.`,
    });
    setDetectInput("");
  }, []);

  // Poll for the device info posted back by the collect script.
  useEffect(() => {
    if (!autoToken) return;
    const interval = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/devices/collect/status?token=${autoToken}`
          );
          if (!res.ok) return;
          const data = (await res.json()) as {
            status: string;
            device?: DetectedDevice;
          };
          if (data.status === "ready" && data.device) {
            setAutoToken(null);
            setAutoCommand(null);
            applyDetected(data.device);
          } else if (data.status === "expired") {
            setAutoToken(null);
            setAutoCommand(null);
            setDetectMessage({
              ok: false,
              text: "Detection session expired — click Detect this PC to start again.",
            });
          }
        } catch {
          // transient network error — keep polling until expiry
        }
      })();
    }, 1500);
    return () => clearInterval(interval);
  }, [autoToken, applyDetected]);

  const startAutoDetect = async () => {
    setCollectBusy(true);
    setDetectMessage(null);
    try {
      const res = await fetch("/api/devices/collect/token", { method: "POST" });
      if (!res.ok) throw new Error("token_failed");
      const data = (await res.json()) as { token: string };
      const command = `irm ${window.location.origin}/api/devices/collect/script?token=${data.token} | iex`;
      setAutoToken(data.token);
      setAutoCommand(command);
      try {
        await navigator.clipboard.writeText(command);
        setDetectMessage({
          ok: true,
          text: "Command copied — run it in PowerShell on THIS PC. The form fills by itself.",
        });
      } catch {
        setDetectMessage({
          ok: false,
          text: "Clipboard blocked — copy the command shown below and run it in PowerShell.",
        });
      }
    } catch {
      setDetectMessage({
        ok: false,
        text: "Could not start detection. Use the paste box below instead.",
      });
    } finally {
      setCollectBusy(false);
    }
  };

  const copyDetectCommand = async () => {
    const command = `irm ${window.location.origin}/tools/detect-device.ps1 | iex`;
    try {
      await navigator.clipboard.writeText(command);
      setDetectMessage({
        ok: true,
        text: "Command copied — run it in PowerShell on the device you're registering.",
      });
    } catch {
      setDetectMessage({
        ok: false,
        text: `Clipboard blocked. Run this on the device: ${command}`,
      });
    }
  };

  const pasteDetectCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const device = parseDetectPayload(text);
      if (device) {
        applyDetected(device);
      } else {
        setDetectInput(text.trim());
        setDetectMessage({
          ok: false,
          text: "Clipboard doesn't contain an Avci device code (AVCI1:…).",
        });
      }
    } catch {
      setDetectMessage({
        ok: false,
        text: "Clipboard access blocked — click the paste box and press Ctrl+V instead.",
      });
    }
  };

  const err = (key: string) => state.errors?.[key];
  const v = (key: string) => values[key] ?? "";

  const selectedCategory = categories.find(
    (category) => category.id === v("categoryId")
  );
  const serialRequired = Boolean(selectedCategory?.requiresSerial);

  const stepErrors = (index: number) =>
    STEP_FIELDS[index].some((field) => err(field)?.length);

  const canAdvance = (index: number): boolean => {
    if (index === 0) {
      if (!v("name").trim()) return false;
      if (!v("assetTag").trim()) return false;
      if (!v("categoryId")) return false;
      if (serialRequired && !v("serialNumber").trim()) return false;
    }
    return true;
  };

  const summary = useMemo(() => {
    const category = categories.find((c) => c.id === v("categoryId"));
    const location = locations.find((l) => l.id === v("locationId"));
    const rows: { label: string; value: string; step: number }[] = [
      { label: "Name", value: v("name"), step: 0 },
      { label: "Asset tag", value: v("assetTag"), step: 0 },
      { label: "Category", value: category?.name ?? "", step: 0 },
      { label: "Serial", value: v("serialNumber"), step: 0 },
      { label: "Status", value: STATUS_LABELS[v("status") as AssetStatus] ?? v("status"), step: 1 },
      { label: "Condition", value: CONDITION_LABELS[v("condition") as keyof typeof CONDITION_LABELS] ?? v("condition"), step: 1 },
      { label: "Location", value: location?.name ?? "", step: 1 },
      { label: "Brand / model", value: [v("brand"), v("model")].filter(Boolean).join(" "), step: 1 },
      { label: "Serial no. (MAC)", value: [v("ethernetMac"), v("wifiMac")].filter(Boolean).join(" · "), step: 1 },
      { label: "Purchase date", value: v("purchaseDate"), step: 2 },
      { label: "Cost", value: v("purchaseCost") ? `SLE ${v("purchaseCost")}` : "", step: 2 },
      { label: "Supplier", value: v("supplier"), step: 2 },
      { label: "Warranty ends", value: v("warrantyEndsAt"), step: 2 },
    ];
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, categories, locations]);

  if (created?.assetId) {
    const assetId = created.assetId;
    const assetName = created.values?.name ?? "Asset";
    return (
      <div className="border-border bg-card mx-auto flex w-full max-w-lg flex-col items-center gap-5 rounded-2xl border p-8 text-center shadow-xs">
        <div className="bg-status-available/15 text-status-available flex size-14 items-center justify-center rounded-full">
          <CheckCircle2Icon className="size-7" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Asset registered</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {assetName} ({createdTag}) is live in the register with its first
            history entry.
          </p>
        </div>

        <div className="border-border rounded-xl border bg-white p-3">
          {qrUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrUrl}
              alt={`QR code for ${createdTag}`}
              className="size-40"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex size-40 items-center justify-center rounded-lg text-xs">
              Generating QR…
            </div>
          )}
          <p className="mt-2 font-mono text-sm font-medium text-slate-900">
            {createdTag}
          </p>
        </div>

        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <CameraIcon className="size-3.5" />
          Next: open the asset and snap its first photos.
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button render={<Link href={`/assets/${assetId}`} />}>
            View asset &amp; add photos
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/assets/new")}
          >
            <BoxesIcon />
            Register another
          </Button>
          <Button variant="ghost" render={<Link href="/assets" />}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-5">
        {scannedCode ? (
          <div className="border-primary/40 bg-primary/5 flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 text-sm">
            <ScanLineIcon className="text-primary size-4 shrink-0" />
            <span>
              Scanned code{" "}
              <span className="font-mono font-medium">{scannedCode}</span> is
              prefilled {initialTag ? "as the asset tag" : "as the serial number"}{" "}
              — complete the rest of step 1.
            </span>
          </div>
        ) : null}
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <CpuIcon className="size-3.5" />
              Device detection
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={collectBusy || Boolean(autoToken)}
                onClick={() => void startAutoDetect()}
              >
                {collectBusy ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <CpuIcon />
                )}
                Detect this PC
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyDetectCommand()}
              >
                <ClipboardPasteIcon />
                Copy run-command
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
            Registering the PC you are sitting at? Click{" "}
            <span className="text-foreground font-medium">Detect this PC</span>,
            run the command it copies in PowerShell, and the serial, hostname,
            MAC addresses and model fill in automatically. For any other
            device, run the command on that machine and paste the code it
            prints into the box below.
          </p>

          {autoToken && autoCommand ? (
            <div className="border-primary/40 bg-primary/5 mt-3 space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium">
                Waiting for this PC — run this in PowerShell:
              </p>
              <code className="bg-background block overflow-x-auto rounded-md border px-2 py-1.5 font-mono text-xs">
                {autoCommand}
              </code>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(autoCommand)
                      .catch(() => {});
                  }}
                >
                  <ClipboardPasteIcon />
                  Copy again
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAutoToken(null);
                    setAutoCommand(null);
                  }}
                >
                  Cancel
                </Button>
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Listening for the device…
                </span>
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={detectInput}
              onChange={(event) => {
                const value = event.target.value;
                setDetectInput(value);
                const device = parseDetectPayload(value);
                if (device) {
                  applyDetected(device);
                } else if (value.trim().startsWith("AVCI1:")) {
                  setDetectMessage({
                    ok: false,
                    text: "That code looks damaged — run the script again and re-paste.",
                  });
                } else {
                  setDetectMessage(null);
                }
              }}
              placeholder="Paste AVCI1:… device code here"
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
              aria-label="Device detect code"
            />
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              onClick={() => void pasteDetectCode()}
            >
              <ClipboardPasteIcon />
              Paste
            </Button>
          </div>
          {detectMessage ? (
            <p
              className={
                detectMessage.ok
                  ? "text-status-available mt-2 text-xs font-medium"
                  : "text-destructive mt-2 text-xs font-medium"
              }
            >
              {detectMessage.text}
            </p>
          ) : null}
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2">
            {STEP_LABELS.map((label, index) => (
              <div key={label} className="flex flex-1 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (index < step) setStep(index);
                  }}
                  disabled={index > step}
                  className={cn(
                    "flex items-center gap-1.5 text-left text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                    index < step
                      ? "text-status-available hover:underline"
                      : index === step
                        ? "text-foreground"
                        : "text-muted-foreground/60"
                  )}
                >
                  {index < step ? (
                    <CheckCircle2Icon className="size-3.5 shrink-0" />
                  ) : (
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px]",
                        index === step
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
                      )}
                    >
                      {index + 1}
                    </span>
                  )}
                  <span className="truncate">{label}</span>
                </button>
                {index === STEP_LABELS.length - 1 ? null : (
                  <div className="bg-muted h-1 overflow-hidden rounded-full">
                    {index < step ? (
                      <div className="bg-status-available h-full w-full" />
                    ) : index === step ? (
                      <motion.div
                        className="bg-primary h-full"
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {state.error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to save</AlertTitle>
            <AlertDescription>
              {state.error}
              {state.errors && Object.keys(state.errors).length > 0
                ? " — jump to the affected section below."
                : ""}
            </AlertDescription>
          </Alert>
        ) : null}

        {state.ok === false && state.attempt && state.attempt > 0 && state.errors && Object.keys(state.errors).length > 0 ? (
          <div className="border-border bg-card flex flex-wrap gap-2 rounded-lg border p-3 text-sm">
            <span className="text-muted-foreground">Needs attention:</span>
            {Object.entries(state.errors).map(([field, messages]) => (
              <button
                key={field}
                type="button"
                onClick={() => setStep(stepForField(field))}
                className="text-destructive hover:underline rounded-sm text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {messages[0]}
              </button>
            ))}
          </div>
        ) : null}

        <form
          action={formAction}
          className="flex flex-col gap-5"
          key={`wizard-${state.attempt ?? 0}`}
        >
          <input type="hidden" name="noRedirect" value="1" />

          <div className={cn(step === 0 ? "animate-in fade-in-0 slide-in-from-right-4 duration-200" : "hidden")}>
            <StepHeading
              title="Identity"
              description="How this asset is recognized in the register and on its QR label."
            />
            <div className="border-border bg-card grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
              <Field label="Asset name" htmlFor="name" required error={err("name")}>
                <Input
                  id="name"
                  name="name"
                  value={v("name")}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Dell Latitude 5420"
                  aria-invalid={Boolean(err("name"))}
                />
              </Field>
              <Field
                label="Asset tag"
                htmlFor="assetTag"
                required
                error={err("assetTag")}
                hint="Pre-filled with the next FIA-IT-##### tag."
              >
                <Input
                  id="assetTag"
                  name="assetTag"
                  value={v("assetTag")}
                  onChange={(e) => set("assetTag", e.target.value)}
                  placeholder="FIA-IT-00001"
                  className="font-mono"
                  aria-invalid={Boolean(err("assetTag"))}
                />
              </Field>
              <Field label="Category" htmlFor="categoryId" required error={err("categoryId")}>
                <Select
                  value={v("categoryId")}
                  onValueChange={(value) => set("categoryId", value ?? "")}
                >
                  <SelectTrigger id="categoryId" className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                        {category.requiresSerial ? " · serial required" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="categoryId" value={v("categoryId")} />
              </Field>
              <Field
                label="Serial number"
                htmlFor="serialNumber"
                required={serialRequired}
                error={err("serialNumber")}
                hint={
                  serialRequired
                    ? "This category requires a serial number."
                    : "Leave empty when the device has none."
                }
              >
                <Input
                  id="serialNumber"
                  name="serialNumber"
                  value={v("serialNumber")}
                  onChange={(e) => set("serialNumber", e.target.value)}
                  placeholder="Manufacturer serial"
                  className="font-mono"
                  aria-invalid={Boolean(err("serialNumber"))}
                />
              </Field>
            </div>
          </div>

          <div className={cn(step === 1 ? "animate-in fade-in-0 slide-in-from-right-4 duration-200" : "hidden")}>
            <StepHeading
              title="Details"
              description="Classification, location and technical identifiers."
            />
            <div className="border-border bg-card grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
              <Field label="Status" htmlFor="status" required error={err("status")}>
                <Select
                  value={v("status")}
                  onValueChange={(value) => set("status", value ?? "")}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBMITTABLE_ASSET_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="status" value={v("status")} />
              </Field>
              <Field label="Condition" htmlFor="condition" required error={err("condition")}>
                <Select
                  value={v("condition")}
                  onValueChange={(value) => set("condition", value ?? "")}
                >
                  <SelectTrigger id="condition" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AssetCondition).map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {CONDITION_LABELS[condition]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="condition" value={v("condition")} />
              </Field>
              <Field label="Location" htmlFor="locationId" error={err("locationId")}>
                <Select
                  value={v("locationId") || "__none__"}
                  onValueChange={(value) =>
                    set("locationId", !value || value === "__none__" ? "" : value)
                  }
                >
                  <SelectTrigger id="locationId" className="w-full">
                    <SelectValue placeholder="No location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No location</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="locationId" value={v("locationId")} />
              </Field>
              <div />
              <Field label="Brand" htmlFor="brand" error={err("brand")}>
                <Input id="brand" name="brand" value={v("brand")} onChange={(e) => set("brand", e.target.value)} placeholder="Dell" />
              </Field>
              <Field label="Model" htmlFor="model" error={err("model")}>
                <Input id="model" name="model" value={v("model")} onChange={(e) => set("model", e.target.value)} placeholder="Latitude 5420" />
              </Field>
              <Field label="Operating system" htmlFor="os" error={err("os")}>
                <Input id="os" name="os" value={v("os")} onChange={(e) => set("os", e.target.value)} placeholder="Windows 11 Pro" />
              </Field>
              <Field label="Hostname (FQDN)" htmlFor="fqdn" error={err("fqdn")}>
                <Input id="fqdn" name="fqdn" value={v("fqdn")} onChange={(e) => set("fqdn", e.target.value)} className="font-mono" placeholder="FQDN or computer name" />
              </Field>
              <Field label="Ethernet MAC" htmlFor="ethernetMac" error={err("ethernetMac")}>
                <Input id="ethernetMac" name="ethernetMac" value={v("ethernetMac")} onChange={(e) => set("ethernetMac", e.target.value)} className="font-mono" placeholder="00:1A:2B:3C:4D:5E" />
              </Field>
              <Field label="Wi-Fi MAC" htmlFor="wifiMac" error={err("wifiMac")}>
                <Input id="wifiMac" name="wifiMac" value={v("wifiMac")} onChange={(e) => set("wifiMac", e.target.value)} className="font-mono" placeholder="00:1A:2B:3C:4D:5F" />
              </Field>
            </div>
          </div>

          <div className={cn(step === 2 ? "animate-in fade-in-0 slide-in-from-right-4 duration-200" : "hidden")}>
            <StepHeading
              title="Commercial"
              description="Purchase, warranty and free-text notes — all optional."
            />
            <div className="border-border bg-card grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
              <Field label="Purchase date" htmlFor="purchaseDate" error={err("purchaseDate")}>
                <Input id="purchaseDate" name="purchaseDate" type="date" value={v("purchaseDate")} onChange={(e) => set("purchaseDate", e.target.value)} />
              </Field>
              <Field label="Purchase cost" htmlFor="purchaseCost" error={err("purchaseCost")}>
                <Input id="purchaseCost" name="purchaseCost" type="number" min="0" step="0.01" inputMode="decimal" value={v("purchaseCost")} onChange={(e) => set("purchaseCost", e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Supplier" htmlFor="supplier" error={err("supplier")}>
                <Input id="supplier" name="supplier" value={v("supplier")} onChange={(e) => set("supplier", e.target.value)} />
              </Field>
              <Field label="Warranty ends" htmlFor="warrantyEndsAt" error={err("warrantyEndsAt")}>
                <Input id="warrantyEndsAt" name="warrantyEndsAt" type="date" value={v("warrantyEndsAt")} onChange={(e) => set("warrantyEndsAt", e.target.value)} />
              </Field>
              <Field label="Description" htmlFor="description" error={err("description")} className="sm:col-span-2">
                <Textarea id="description" name="description" rows={3} value={v("description")} onChange={(e) => set("description", e.target.value)} />
              </Field>
              <Field label="Notes" htmlFor="notes" error={err("notes")} className="sm:col-span-2">
                <Textarea id="notes" name="notes" rows={3} value={v("notes")} onChange={(e) => set("notes", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className={cn(step === 3 ? "animate-in fade-in-0 slide-in-from-right-4 duration-200" : "hidden")}>
            <StepHeading
              title="Review &amp; register"
              description="Check the summary, then register the asset."
            />
            <div className="border-border bg-card rounded-xl border">
              <dl className="divide-border divide-y px-5">
                {summary
                  .filter((row) => row.value)
                  .map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-4 py-2.5 text-sm"
                    >
                      <dt className="text-muted-foreground text-xs">{row.label}</dt>
                      <dd className="truncate text-right font-medium">
                        {row.value}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || pending}
            >
              <ArrowLeftIcon />
              Back
            </Button>
            {step < STEP_LABELS.length - 1 ? (
              <Button
                type="button"
                onClick={() => setStep((s) => Math.min(STEP_LABELS.length - 1, s + 1))}
                disabled={!canAdvance(step)}
              >
                Next
                <ArrowRightIcon />
              </Button>
            ) : (
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2Icon className="animate-spin" />
                    Registering…
                  </>
                ) : (
                  <>
                    <SaveIcon />
                    Register asset
                  </>
                )}
              </Button>
            )}
          </div>
          {!canAdvance(step) && step === 0 ? (
            <p className="text-muted-foreground -mt-2 text-xs">
              Name, asset tag and category are required to continue.
              {serialRequired ? " Serial number is required for this category." : ""}
            </p>
          ) : null}
          {stepErrors(step) && step < 3 ? (
            <p className="text-destructive -mt-2 text-xs">
              Some fields need fixing — jump to Review to see the details.
            </p>
          ) : null}
        </form>
      </div>

      <aside className="hidden lg:block">
        <div className="border-border bg-card sticky top-24 rounded-xl border p-4">
          <p className="text-muted-foreground mb-3 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <PencilIcon className="size-3" />
            Live preview
          </p>
          <div className="bg-muted flex h-28 items-center justify-center rounded-lg border border-dashed">
            <BoxesIcon className="text-muted-foreground/40 size-8" />
          </div>
          <p className="mt-3 truncate text-sm font-semibold">
            {v("name") || "Asset name"}
          </p>
          <p className="text-muted-foreground truncate font-mono text-xs">
            {v("assetTag") || "FIA-IT-#####"}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={(v("status") || "AVAILABLE") as AssetStatus} />
            <span className="text-muted-foreground text-xs">
              {CONDITION_LABELS[v("condition") as keyof typeof CONDITION_LABELS] ??
                "Good"}
            </span>
          </div>
          <dl className="divide-border mt-3 space-y-1.5 border-t pt-3 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Category</dt>
              <dd className="truncate font-medium">
                {selectedCategory?.name ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Brand / model</dt>
              <dd className="truncate font-medium">
                {[v("brand"), v("model")].filter(Boolean).join(" ") || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Serial</dt>
              <dd className="truncate font-mono font-medium">
                {v("serialNumber") || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Location</dt>
              <dd className="truncate font-medium">
                {locations.find((l) => l.id === v("locationId"))?.name ?? "—"}
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
