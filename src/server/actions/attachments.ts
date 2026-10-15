"use server";

import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { AttachmentKind } from "@/generated/prisma/enums";
import { getActionUser } from "@/server/auth";
import { failure, logActionError } from "@/server/result";

export type PhotoFormState = {
  ok: boolean;
  attempt?: number;
  error?: string;
};

async function clientIp(): Promise<string | null> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

const FILE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};

const DOC_KINDS: Record<string, AttachmentKind> = {
  PURCHASE_DOCUMENT: "PURCHASE_DOCUMENT",
  WARRANTY_DOCUMENT: "WARRANTY_DOCUMENT",
  INVOICE: "INVOICE",
  MAINTENANCE_REPORT: "MAINTENANCE_REPORT",
  OTHER: "OTHER",
};

type AttachmentEntity = "asset" | "employee" | "maintenance";

const ENTITY_FOLDERS: Record<AttachmentEntity, string> = {
  asset: "assets",
  employee: "employees",
  maintenance: "maintenance",
};

const ENTITY_LABELS: Record<AttachmentEntity, string> = {
  asset: "Asset",
  employee: "Employee",
  maintenance: "MaintenanceRecord",
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 10;

function safeReturnPath(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export async function uploadPhotoAction(
  _prev: PhotoFormState,
  formData: FormData
): Promise<PhotoFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to upload files.");
  }

  const entity = formData.get("entity");
  const entityId = String(formData.get("entityId") ?? "").trim();
  const rawDocKind = String(formData.get("docKind") ?? "").trim();
  const files = formData
    .getAll("file")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (
    entity !== "asset" &&
    entity !== "employee" &&
    entity !== "maintenance"
  ) {
    return failure("Invalid upload target.");
  }
  if (files.length === 0) {
    return failure("Choose at least one file to upload.");
  }
  if (files.length > MAX_FILES_PER_UPLOAD) {
    return failure(
      `You can upload up to ${MAX_FILES_PER_UPLOAD} files at a time.`
    );
  }
  for (const file of files) {
    if (file.size > MAX_PHOTO_BYTES) {
      return failure(
        `"${file.name || "File"}" is larger than 5 MB. Try a smaller file.`
      );
    }
    if (!FILE_EXTENSIONS[file.type]) {
      return failure(
        `"${file.name}" is not supported. Use JPG, PNG, WebP, GIF or PDF.`
      );
    }
  }

  const docKind: AttachmentKind | undefined =
    entity === "maintenance"
      ? "MAINTENANCE_REPORT"
      : rawDocKind && DOC_KINDS[rawDocKind]
        ? DOC_KINDS[rawDocKind]
        : undefined;

  const writtenPaths: string[] = [];
  try {
    if (entity === "asset") {
      const asset = await db.asset.findUnique({
        where: { id: entityId },
        select: { id: true },
      });
      if (!asset) return failure("That asset no longer exists.");
    } else if (entity === "employee") {
      const employee = await db.employee.findUnique({
        where: { id: entityId },
        select: { id: true },
      });
      if (!employee) return failure("That employee no longer exists.");
    } else {
      const record = await db.maintenanceRecord.findUnique({
        where: { id: entityId },
        select: { id: true },
      });
      if (!record) return failure("That maintenance record no longer exists.");
    }

    const folder = ENTITY_FOLDERS[entity];
    const dir = path.join(process.cwd(), "storage", folder);
    await mkdir(dir, { recursive: true });

    for (const file of files) {
      const ext = FILE_EXTENSIONS[file.type];
      const isImage = file.type.startsWith("image/");
      const storedName = `${entityId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}${ext}`;
      const abs = path.join(dir, storedName);
      writtenPaths.push(abs);
      await writeFile(abs, Buffer.from(await file.arrayBuffer()));

      const kind =
        docKind ??
        (isImage
          ? entity === "asset"
            ? "ASSET_PHOTO"
            : "EMPLOYEE_PHOTO"
          : "OTHER");

      await db.attachment.create({
        data: {
          kind,
          filename: file.name || `file-${Date.now()}${ext}`,
          mimeType: file.type,
          sizeBytes: file.size,
          storagePath: path.posix.join("storage", folder, storedName),
          assetId: entity === "asset" ? entityId : null,
          employeeId: entity === "employee" ? entityId : null,
          maintenanceRecordId:
            entity === "maintenance" ? entityId : null,
          uploadedById: user.id,
        },
      });
    }

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "PHOTO_UPLOADED",
        entityType: ENTITY_LABELS[entity],
        entityId,
        summary: `Uploaded ${files.length} file${files.length === 1 ? "" : "s"}`,
        after: { count: files.length },
        ip: await clientIp(),
      },
    });
  } catch (error) {
    await Promise.all(
      writtenPaths.map((p) => rm(p, { force: true }).catch(() => undefined))
    );
    logActionError("uploadPhotoAction", error);
    return failure("Unable to upload the file right now. Please try again.");
  }

  if (formData.get("noRedirect") === "1") {
    return { ok: true, attempt: (_prev.attempt ?? 0) + 1 };
  }
  if (entity === "maintenance") {
    const returnUrl = safeReturnPath(formData.get("returnUrl"));
    const after = new URL(returnUrl, "http://internal");
    after.searchParams.set("just", "photo");
    redirect(after.pathname + after.search);
  }
  redirect(
    entity === "asset"
      ? `/assets/${entityId}?just=photo`
      : `/employees/${entityId}?just=photo`
  );
}

export async function deleteAttachmentAction(
  _prev: PhotoFormState,
  formData: FormData
): Promise<PhotoFormState> {
  const user = await getActionUser("ADMIN", "IT_STAFF");
  if (!user) {
    return failure("You do not have permission to delete files.");
  }

  const id = String(formData.get("attachmentId") ?? "").trim();
  const returnUrl = safeReturnPath(formData.get("returnUrl"));

  try {
    const attachment = await db.attachment.findUnique({ where: { id } });
    if (!attachment) {
      return failure("That file no longer exists.");
    }

    const storageRoot = path.join(process.cwd(), "storage");
    // Uploaded files live under storage/ at runtime — intentionally dynamic.
    const abs = path.join(/* turbopackIgnore: true */ process.cwd(), attachment.storagePath);
    if (!abs.startsWith(storageRoot + path.sep)) {
      return failure("Invalid file path.");
    }
    await rm(abs, { force: true });
    await db.attachment.delete({ where: { id } });

    const entityType = attachment.assetId
      ? "Asset"
      : attachment.employeeId
        ? "Employee"
        : attachment.maintenanceRecordId
          ? "MaintenanceRecord"
          : "Other";
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "PHOTO_DELETED",
        entityType,
        entityId:
          attachment.assetId ??
          attachment.employeeId ??
          attachment.maintenanceRecordId,
        summary: `File deleted: ${attachment.filename}`,
        after: { storagePath: attachment.storagePath },
        ip: await clientIp(),
      },
    });
  } catch (error) {
    logActionError("deleteAttachmentAction", error);
    return failure("Unable to delete the file right now. Please try again.");
  }

  const after = new URL(returnUrl, "http://internal");
  after.searchParams.set("just", "deleted");
  redirect(after.pathname + after.search);
}
