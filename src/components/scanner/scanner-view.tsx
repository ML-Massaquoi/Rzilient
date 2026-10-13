"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { motion } from "motion/react";
import {
  CameraIcon,
  ClipboardCheckIcon,
  Loader2Icon,
  PlusIcon,
  QrCodeIcon,
  RotateCcwIcon,
  ScanLineIcon,
  SearchIcon,
  ShieldCheckIcon,
  SquareIcon,
  ArrowRightLeftIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/assets/status-badge";
import { registerHrefForCode } from "@/lib/asset-codes";
import { CONDITION_LABELS } from "@/lib/labels";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AssetStatus } from "@/generated/prisma/enums";

type ScannedAsset = {
  id: string;
  assetTag: string;
  serialNumber: string | null;
  name: string;
  status: AssetStatus;
  condition: string;
  category: string;
  location: string | null;
  custodian: string | null;
  department: string | null;
  assignmentId: string | null;
};

type MatchedBy = "assetTag" | "serialNumber" | null;

const IDLE_SEARCH_MS = 650;

export function ScannerView({ canWrite }: { canWrite: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [asset, setAsset] = useState<ScannedAsset | null>(null);
  const [matchedBy, setMatchedBy] = useState<MatchedBy>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const lookup = useCallback(
    async (raw: string) => {
      const query = raw.trim();
      if (!query) return;
      clearDebounce();
      const seq = ++seqRef.current;
      stopCamera();
      setAsset(null);
      setMatchedBy(null);
      setNotFound(null);
      setLookupError(null);
      setLooking(true);
      try {
        const res = await fetch(`/api/scanner?q=${encodeURIComponent(query)}`);
        if (seq !== seqRef.current) return;
        if (res.status === 404) {
          setNotFound(query);
        } else if (!res.ok) {
          setLookupError("Lookup failed. Please try again.");
        } else {
          const data = (await res.json()) as {
            asset: ScannedAsset;
            matchedBy?: MatchedBy;
          };
          setAsset(data.asset);
          setMatchedBy(data.matchedBy ?? null);
        }
      } catch {
        if (seq === seqRef.current) {
          setLookupError("Network error while looking up the asset.");
        }
      } finally {
        if (seq === seqRef.current) setLooking(false);
        tagInputRef.current?.focus();
      }
    },
    [clearDebounce, stopCamera]
  );

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("no video element");
      video.srcObject = stream;
      await video.play();
      setCameraOn(true);

      const tick = () => {
        const el = videoRef.current;
        const canvas = canvasRef.current;
        if (!el || !canvas || el.readyState !== el.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        const maxWidth = 640;
        const scale = Math.min(1, maxWidth / (el.videoWidth || maxWidth));
        const width = Math.max(1, Math.round((el.videoWidth || maxWidth) * scale));
        const height = Math.max(1, Math.round((el.videoHeight || maxWidth) * scale));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(el, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const found = jsQR(imageData.data, width, height, {
          inversionAttempts: "attemptBoth",
        });
        if (found?.data) {
          navigator.vibrate?.(120);
          setCode(found.data);
          void lookup(found.data);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setCameraError(
        name === "NotAllowedError"
          ? "Camera access was denied. Allow camera access in your browser, or use the scan box above."
          : "Could not start the camera on this device. Use the scan box above instead."
      );
      stopCamera();
    } finally {
      setCameraStarting(false);
    }
  }, [lookup, stopCamera]);

  useEffect(() => {
    tagInputRef.current?.focus();
    return () => {
      clearDebounce();
      stopCamera();
    };
  }, [clearDebounce, stopCamera]);

  // USB barcode scanners type like a keyboard — capture keystrokes anywhere on
  // this page and funnel them into the scan box, so a trigger pull works even
  // when focus drifted (e.g. after clicking a button).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const editable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        Boolean(target?.isContentEditable);
      if (editable) return;
      if (event.key.length !== 1) return;
      const input = tagInputRef.current;
      if (!input) return;
      event.preventDefault();
      if (document.activeElement !== input) input.focus();
      setCode((prev) => prev + event.key);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const reset = () => {
    seqRef.current += 1;
    clearDebounce();
    setAsset(null);
    setMatchedBy(null);
    setNotFound(null);
    setLookupError(null);
    setLooking(false);
    setCode("");
    tagInputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Single scan box — barcode scanners type here and hit Enter */}
      <Card className="border-primary/40">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-primary flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <ScanLineIcon className="size-3.5" />
              Scan box
            </p>
            {looking ? (
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Loader2Icon className="size-3.5 animate-spin" />
                Searching…
              </span>
            ) : (
              <span className="text-status-available flex items-center gap-1.5 text-xs font-medium">
                <span className="bg-status-available size-1.5 rounded-full" />
                Ready
              </span>
            )}
          </div>
          <form
            className="flex items-stretch gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void lookup(code);
            }}
          >
            <div className="border-input relative flex-1 rounded-lg border focus-within:ring-2 focus-within:ring-ring">
              <ScanLineIcon className="text-muted-foreground absolute top-1/2 left-3 size-5 -translate-y-1/2" />
              <input
                ref={tagInputRef}
                type="text"
                name="code"
                value={code}
                autoComplete="off"
                spellCheck={false}
                aria-label="Asset tag or serial number"
                onChange={(event) => {
                  const value = event.target.value;
                  setCode(value);
                  clearDebounce();
                  const trimmed = value.trim();
                  if (trimmed.length >= 3) {
                    debounceRef.current = setTimeout(() => {
                      debounceRef.current = null;
                      void lookup(trimmed);
                    }, IDLE_SEARCH_MS);
                  }
                }}
                placeholder="FIA-IT-0042 or serial number"
                className="h-12 w-full bg-transparent px-3 pl-10 font-mono text-base outline-none"
              />
            </div>
            <Button
              type="submit"
              className="h-12 shrink-0 px-4"
              disabled={looking || !code.trim()}
            >
              {looking ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SearchIcon />
              )}
              Look up
            </Button>
          </form>
          <p className="text-muted-foreground text-xs leading-relaxed">
            One box for everything: pull the barcode scanner trigger and the
            code lands here — it searches automatically. Works with asset tags
            and serial numbers; unknown codes can be registered on the spot.
          </p>
        </CardContent>
      </Card>

      {/* Not found → register or search */}
      {notFound ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="border-amber-400/50">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <div className="bg-amber-400/15 text-amber-600 dark:text-amber-400 grid size-9 shrink-0 place-items-center rounded-lg">
                  <PlusIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Not in the register</p>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    No asset matches{" "}
                    <span className="font-mono font-medium">{notFound}</span>.
                    Log it now or look deeper.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canWrite ? (
                  <Button render={<Link href={registerHrefForCode(notFound)} />}>
                    <PlusIcon />
                    Register this device
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  render={
                    <Link
                      href={`/assets?q=${encodeURIComponent(notFound)}`}
                    />
                  }
                >
                  <SearchIcon />
                  Search asset list
                </Button>
                <Button variant="ghost" onClick={reset}>
                  <ScanLineIcon />
                  Scan again
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {cameraError ? (
        <Alert variant="destructive">
          <AlertTitle>Camera unavailable</AlertTitle>
          <AlertDescription>{cameraError}</AlertDescription>
        </Alert>
      ) : null}

      {lookupError ? (
        <Alert variant="destructive">
          <AlertTitle>Lookup failed</AlertTitle>
          <AlertDescription>
            {lookupError} Check the connection and try again.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Optional camera mode */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-muted/70 relative aspect-[4/3] w-full overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`size-full object-cover ${cameraOn ? "" : "invisible"}`}
            />
            {!cameraOn ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                <QrCodeIcon className="text-muted-foreground size-10" />
                <p className="text-muted-foreground max-w-xs px-4 text-sm">
                  Camera is off. Use the scan box above, or start the camera to
                  scan an asset QR label.
                </p>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="border-primary/70 size-44 rounded-xl border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t p-3">
            {cameraOn ? (
              <Button variant="outline" onClick={stopCamera}>
                <SquareIcon />
                Stop camera
              </Button>
            ) : (
              <Button onClick={() => void startCamera()} disabled={cameraStarting}>
                {cameraStarting ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <CameraIcon />
                )}
                Start camera
              </Button>
            )}
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <ScanLineIcon className="size-3.5" />
              Hold the QR label inside the frame
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Matched asset card */}
      {asset ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="border-primary/40">
            <CardContent className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-muted-foreground font-mono text-sm">
                  {asset.assetTag}
                  {asset.serialNumber ? (
                    <span className="text-muted-foreground/70">
                      {" "}
                      · SN {asset.serialNumber}
                    </span>
                  ) : null}
                </p>
                <h2 className="mt-0.5 text-lg font-semibold">{asset.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge status={asset.status} />
                  {CONDITION_LABELS[asset.condition as keyof typeof CONDITION_LABELS] ? (
                    <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs font-medium">
                      {CONDITION_LABELS[asset.condition as keyof typeof CONDITION_LABELS]}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground">{asset.category}</span>
                  {asset.location ? (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">
                        {asset.location}
                      </span>
                    </>
                  ) : null}
                  {matchedBy === "serialNumber" ? (
                    <span className="border-primary/40 text-primary rounded-full border px-2 py-0.5 text-[11px] font-medium">
                      Matched by serial
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {asset.custodian ? (
              <div className="bg-muted/60 rounded-lg px-3 py-2.5 text-sm">
                <p className="text-muted-foreground text-xs">Held by</p>
                <p className="font-medium">{asset.custodian}</p>
                <p className="text-muted-foreground text-xs">
                  {asset.department}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {canWrite && asset.status === "AVAILABLE" ? (
                <Button
                  render={
                    <Link href={`/operations/check-out?asset=${asset.id}`} />
                  }
                >
                  <ClipboardCheckIcon />
                  Check Out
                </Button>
              ) : null}
              {canWrite && asset.assignmentId ? (
                <>
                  <Button
                    render={
                      <Link
                        href={`/operations/returns?assignment=${asset.assignmentId}`}
                      />
                    }
                  >
                    <RotateCcwIcon />
                    Return
                  </Button>
                  <Button
                    variant="outline"
                    render={
                      <Link
                        href={`/operations/transfers?assignment=${asset.assignmentId}`}
                      />
                    }
                  >
                    <ArrowRightLeftIcon />
                    Transfer
                  </Button>
                </>
              ) : null}
              {canWrite && asset.status !== "RETIRED" && asset.status !== "DISPOSED" ? (
                <Button
                  variant="outline"
                  render={
                    <Link href={`/maintenance/new?assetId=${asset.id}`} />
                  }
                >
                  <ShieldCheckIcon />
                  Maintenance
                </Button>
              ) : null}
              <Button
                variant="outline"
                render={<Link href={`/assets/${asset.id}`} />}
              >
                View Details
              </Button>
              <Button variant="ghost" onClick={reset}>
                <ScanLineIcon />
                Scan another
              </Button>
            </div>
          </CardContent>
          </Card>
        </motion.div>
      ) : null}
    </div>
  );
}
