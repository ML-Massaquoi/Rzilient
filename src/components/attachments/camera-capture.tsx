"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  CameraIcon,
  CheckCircle2Icon,
  FolderUpIcon,
  Loader2Icon,
  XIcon,
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
import {
  uploadPhotoAction,
  type PhotoFormState,
} from "@/server/actions/attachments";

const emptyState: PhotoFormState = { ok: false };
const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif";

export function CameraCaptureButton({
  entity,
  entityId,
  returnUrl,
  triggerClassName,
  title = "Take a photo with the camera",
  children,
}: {
  entity: "asset" | "employee";
  entityId: string;
  returnUrl: string;
  triggerClassName?: string;
  title?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        title={title}
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        }
      >
        {children}
      </button>

      {open ? (
        <CameraDialog
          onClose={() => setOpen(false)}
          entity={entity}
          entityId={entityId}
          returnUrl={returnUrl}
        />
      ) : null}
    </>
  );
}

function CameraDialog({
  onClose,
  entity,
  entityId,
  returnUrl,
}: {
  onClose: () => void;
  entity: "asset" | "employee";
  entityId: string;
  returnUrl: string;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [state, formAction, pending] = useActionState(
    uploadPhotoAction,
    emptyState
  );
  const [shots, setShots] = useState(0);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
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
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setCameraError(
        name === "NotAllowedError"
          ? "Camera access was denied. Allow camera access in your browser settings, or choose a file instead."
          : "The camera could not be opened on this device. Choose a file instead."
      );
    } finally {
      setStarting(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    void startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  const uploadFile = (file: File) => {
    const fd = new FormData();
    fd.set("entity", entity);
    fd.set("entityId", entityId);
    fd.set("returnUrl", returnUrl);
    fd.set("file", file);
    fd.set("noRedirect", "1");
    setShots((count) => count + 1);
    void formAction(fd);
  };

  const snap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || pending) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        navigator.vibrate?.(120);
        uploadFile(
          new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" })
        );
      },
      "image/jpeg",
      0.9
    );
  };

  const close = () => {
    router.refresh();
    onClose();
  };

  const savedCount = Math.max(0, shots - (state.error ? 1 : 0));

  return (
    <Dialog open onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Take a photo</DialogTitle>
          <DialogDescription>
            Point the camera at the {entity === "asset" ? "device" : "employee"}{" "}
            and tap the shutter. You can take several photos in a row.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden rounded-lg">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`size-full object-cover ${cameraError || starting ? "invisible" : ""}`}
          />
          {cameraError || starting ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
              {starting ? (
                <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
              ) : (
                <CameraIcon className="text-muted-foreground size-8" />
              )}
              <p className="text-muted-foreground max-w-xs text-sm">
                {starting
                  ? "Starting camera…"
                  : "Camera unavailable — choose a file instead."}
              </p>
            </div>
          ) : null}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {state.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        {savedCount > 0 && !pending ? (
          <p className="text-status-available flex items-center gap-1.5 text-sm font-medium">
            <CheckCircle2Icon className="size-4" />
            {savedCount} photo{savedCount === 1 ? "" : "s"} uploaded this
            session
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={snap}
            disabled={pending || Boolean(cameraError) || starting}
            className="h-11 flex-1"
          >
            {pending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <CameraIcon />
            )}
            {pending ? "Uploading…" : "Snap & upload"}
          </Button>

          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
            <FolderUpIcon />
            Choose file
            <input
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = "";
                if (file) uploadFile(file);
              }}
            />
          </label>

          <Button variant="ghost" className="h-11" onClick={close}>
            <XIcon />
            {savedCount > 0 ? "Done" : "Cancel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
