"use server";

import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
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

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
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
    return failure("You do not have permission to upload photos.");
  }

  const entity = formData.get("entity");
  const entityId = String(formData.get("entityId") ?? "").trim();
  const files = formData
    .getAll("file")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (entity !== "asset" && entity !== "employee") {
    return failure("Invalid upload target.");
  }
  if (files.length === 0) {
    return failure("Choose at least one photo to upload.");
  }
  if (files.length > MAX_FILES_PER_UPLOAD) {
    return failure(
      `You can upload up to ${MAX_FILES_PER_UPLOAD} photos at a time.`
    );
  }
  for (const file of files) {
    if (file.size > MAX_PHOTO_BYTES) {
      return failure(
        `"${file.name || "Photo"}" is larger than 5 MB. Try a smaller image.`
      );
    }
    if (!IMAGE_EXTENSIONS[file.type]) {
      return failure(
        `"${file.name}" is not a supported image. Use JPG, PNG, WebP or GIF.`
      );
    }
  }

  const writtenPaths: string[] = [];
  try {
    if (entity === "asset") {
      const asset = await db.asset.findUnique({
        where: { id: entityId },
        select: { id: true },
      });
      if (!asset) return failure("That asset no longer exists.");
    } else {
      const employee = await db.employee.findUnique({
        where: { id: entityId },
        select: { id: true },
      });
      if (!employee) return failure("That employee no longer exists.");
    }

    const folder = entity === "asset" ? "assets" : "employees";
    const dir = path.join(process.cwd(), "storage", folder);
    await mkdir(dir, { recursive: true });

    for (const file of files) {
      const ext = IMAGE_EXTENSIONS[file.type];
      const storedName = `${entityId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}${ext}`;
      const abs = path.join(dir, storedName);
      writtenPaths.push(abs);
      await writeFile(abs, Buffer.from(await file.arrayBuffer()));

      await db.attachment.create({
        data: {
          kind: entity === "asset" ? "ASSET_PHOTO" : "EMPLOYEE_PHOTO",
          filename: file.name || `photo-${Date.now()}${ext}`,
          mimeType: file.type,
          sizeBytes: file.size,
          storagePath: path.posix.join("storage", folder, storedName),
          assetId: entity === "asset" ? entityId : null,
          employeeId: entity === "employee" ? entityId : null,
          uploadedById: user.id,
        },
      });
    }

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "PHOTO_UPLOADED",
        entityType: entity === "asset" ? "Asset" : "Employee",
        entityId,
        summary: `Uploaded ${files.length} photo${files.length === 1 ? "" : "s"}`,
        after: { count: files.length },
        ip: await clientIp(),
      },
    });
  } catch (error) {
    await Promise.all(
      writtenPaths.map((p) => rm(p, { force: true }).catch(() => undefined))
    );
    logActionError("uploadPhotoAction", error);
    return failure("Unable to upload the photo right now. Please try again.");
  }

  if (formData.get("noRedirect") === "1") {
    return { ok: true, attempt: (_prev.attempt ?? 0) + 1 };
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
    const abs = path.join(process.cwd(), attachment.storagePath);
    if (!abs.startsWith(storageRoot + path.sep)) {
      return failure("Invalid file path.");
    }
    await rm(abs, { force: true });
    await db.attachment.delete({ where: { id } });

    const entityType = attachment.assetId
      ? "Asset"
      : attachment.employeeId
        ? "Employee"
        : "Other";
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "PHOTO_DELETED",
        entityType,
        entityId: attachment.assetId ?? attachment.employeeId,
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
