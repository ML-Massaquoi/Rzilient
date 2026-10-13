import { readFile } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const attachment = await db.attachment.findUnique({ where: { id } });
  if (!attachment) {
    return new Response("Not found", { status: 404 });
  }

  const storageRoot = path.join(process.cwd(), "storage");
  const abs = path.join(process.cwd(), attachment.storagePath);
  if (!abs.startsWith(storageRoot + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const buffer = await readFile(abs);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": attachment.mimeType ?? "application/octet-stream",
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, max-age=60",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(
          attachment.filename
        )}`,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
