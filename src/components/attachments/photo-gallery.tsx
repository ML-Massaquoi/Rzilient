"use client";

import {
  useActionState,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { motion } from "motion/react";
import {
  CameraIcon,
  FolderUpIcon,
  Loader2Icon,
  Trash2Icon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CameraCaptureButton } from "@/components/attachments/camera-capture";
import {
  deleteAttachmentAction,
  uploadPhotoAction,
  type PhotoFormState,
} from "@/server/actions/attachments";

type GalleryPhoto = {
  id: string;
  filename: string;
};

const emptyState: PhotoFormState = { ok: false };

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif";

const pickButtonClass =
  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

function UploadForm({
  entity,
  entityId,
  returnUrl,
}: {
  entity: "asset" | "employee";
  entityId: string;
  returnUrl: string;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [state, formAction, pending] = useActionState(
    uploadPhotoAction,
    emptyState
  );
  const formRef = useRef<HTMLFormElement | null>(null);

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length > 0) {
      setFiles((prev) => [...prev, ...picked].slice(0, 10));
    }
  };

  const clearPicked = () => {
    setFiles([]);
    const inputs = formRef.current?.querySelectorAll<HTMLInputElement>(
      'input[type="file"]'
    );
    inputs?.forEach((input) => {
      input.value = "";
    });
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2.5"
    >
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="entityId" value={entityId} />
      <input type="hidden" name="returnUrl" value={returnUrl} />

      <div className="flex flex-wrap items-center gap-2">
        <CameraCaptureButton
          entity={entity}
          entityId={entityId}
          returnUrl={returnUrl}
          triggerClassName={pickButtonClass}
          title="Take a photo with the camera"
        >
          <CameraIcon />
          Camera
        </CameraCaptureButton>

        <label className={pickButtonClass} title="Use the device camera app">
          <CameraIcon />
          Take photo
          <input
            type="file"
            name="file"
            accept={ACCEPTED}
            capture="environment"
            className="sr-only"
            onChange={onPick}
          />
        </label>

        <label className={pickButtonClass} title="Pick one or more files">
          <FolderUpIcon />
          Upload files
          <input
            type="file"
            name="file"
            accept={ACCEPTED}
            multiple
            className="sr-only"
            onChange={onPick}
          />
        </label>

        <Button type="submit" disabled={files.length === 0 || pending} className="h-9">
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {pending ? "Uploading…" : `Upload${files.length > 1 ? ` (${files.length})` : ""}`}
        </Button>
      </div>

      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="bg-muted flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs"
            >
              <span className="max-w-44 truncate font-medium">{file.name}</span>
              <span className="text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={clearPicked}
              className="text-muted-foreground hover:text-foreground rounded-sm text-xs outline-none underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear selection
            </button>
          </li>
        </ul>
      ) : null}

      <p className="text-muted-foreground text-xs">
        Snap with the live camera, use the device camera app, or pick files —
        whichever works. Multiple photos allowed (up to 10 · JPG, PNG, WebP or
        GIF · max 5 MB each).
      </p>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}

export function PhotoCaptureButton({
  entity,
  entityId,
  returnUrl,
}: {
  entity: "asset" | "employee";
  entityId: string;
  returnUrl: string;
}) {
  return (
    <div className="absolute right-0 bottom-0 z-10">
      <CameraCaptureButton
        entity={entity}
        entityId={entityId}
        returnUrl={returnUrl}
        triggerClassName="bg-background/95 hover:bg-accent flex size-8 items-center justify-center rounded-full border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        title="Add photo (camera or upload)"
      >
        <CameraIcon className="size-4" />
      </CameraCaptureButton>
    </div>
  );
}

function PhotoItem({
  photo,
  index,
  canWrite,
  returnUrl,
  formAction,
  pending,
}: {
  photo: GalleryPhoto;
  index: number;
  canWrite: boolean;
  returnUrl: string;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.2) }}
      className="bg-muted group relative aspect-square overflow-hidden rounded-lg border"
    >
      <a
        href={`/api/files/${photo.id}`}
        target="_blank"
        rel="noreferrer"
        className="block size-full"
        title={photo.filename}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/files/${photo.id}`}
          alt={photo.filename}
          loading="lazy"
          className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
        />
      </a>
      {canWrite ? (
        <>
          <form ref={formRef} action={formAction} className="hidden">
            <input type="hidden" name="attachmentId" value={photo.id} />
            <input type="hidden" name="returnUrl" value={returnUrl} />
          </form>
          <ConfirmDialog
            title="Remove this photo?"
            description={`${photo.filename} will be permanently deleted. This cannot be undone.`}
            confirmLabel="Remove photo"
            destructive
            onConfirm={() => {
              formRef.current?.requestSubmit();
            }}
          >
            {(trigger) => (
              <button
                type="button"
                {...trigger}
                disabled={pending}
                title="Remove photo"
                className="bg-background/90 hover:bg-background text-destructive absolute top-1.5 right-1.5 rounded-md border p-1.5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            )}
          </ConfirmDialog>
        </>
      ) : null}
    </motion.div>
  );
}

export function PhotoGallery({
  entity,
  entityId,
  photos,
  canWrite,
  returnUrl,
  subject,
}: {
  entity: "asset" | "employee";
  entityId: string;
  photos: GalleryPhoto[];
  canWrite: boolean;
  returnUrl: string;
  subject: string;
}) {
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteAttachmentAction,
    emptyState
  );

  return (
    <div className="space-y-4">
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <PhotoItem
              key={photo.id}
              photo={photo}
              index={index}
              canWrite={canWrite}
              returnUrl={returnUrl}
              formAction={deleteFormAction}
              pending={deletePending}
            />
          ))}
        </div>
      ) : (
        <div className="border-border flex flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-8 text-center">
          <CameraIcon className="text-muted-foreground size-6" />
          <p className="text-sm font-medium">No photos yet</p>
          <p className="text-muted-foreground max-w-sm text-xs">
            {canWrite
              ? `Snap a photo with the camera or upload files — add as many photos of this ${subject} as you like.`
              : `No photos have been uploaded for this ${subject} yet.`}
          </p>
        </div>
      )}

      {deleteState.error ? (
        <Alert variant="destructive">
          <AlertDescription>{deleteState.error}</AlertDescription>
        </Alert>
      ) : null}

      {canWrite ? (
        <UploadForm
          entity={entity}
          entityId={entityId}
          returnUrl={returnUrl}
        />
      ) : null}
    </div>
  );
}
