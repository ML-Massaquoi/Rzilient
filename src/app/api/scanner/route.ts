import { getCurrentUser } from "@/server/auth";
import { db } from "@/lib/db";
import { extractAssetTagFromScan } from "@/lib/asset-codes";

const assetSelect = {
  id: true,
  assetTag: true,
  serialNumber: true,
  name: true,
  status: true,
  condition: true,
  category: { select: { name: true } },
  location: { select: { name: true } },
  activeAssignment: {
    select: {
      id: true,
      employee: {
        select: {
          fullName: true,
          department: { select: { name: true } },
        },
      },
    },
  },
} as const;

function shape(asset: {
  id: string;
  assetTag: string;
  serialNumber: string | null;
  name: string;
  status: string;
  condition: string;
  category: { name: string };
  location: { name: string } | null;
  activeAssignment: {
    id: string;
    employee: { fullName: string; department: { name: string } };
  } | null;
}) {
  return {
    id: asset.id,
    assetTag: asset.assetTag,
    serialNumber: asset.serialNumber,
    name: asset.name,
    status: asset.status,
    condition: asset.condition,
    category: asset.category.name,
    location: asset.location?.name ?? null,
    custodian: asset.activeAssignment?.employee.fullName ?? null,
    department: asset.activeAssignment?.employee.department.name ?? null,
    assignmentId: asset.activeAssignment?.id ?? null,
  };
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawQuery = new URL(req.url).searchParams.get("q")?.trim();
  if (!rawQuery) {
    return Response.json({ error: "missing_query" }, { status: 400 });
  }
  // QR labels encode a /scan URL — fall back to the raw tag when the value
  // isn't a URL (plain barcode/serial scans).
  const q = extractAssetTagFromScan(rawQuery) || rawQuery;

  let asset = await db.asset.findUnique({
    where: { assetTag: q },
    select: assetSelect,
  });
  let matchedBy: "assetTag" | "serialNumber" | null = asset ? "assetTag" : null;

  if (!asset) {
    const tagMatches = await db.asset.findMany({
      where: { assetTag: { equals: q, mode: "insensitive" } },
      take: 2,
      select: assetSelect,
    });
    if (tagMatches.length === 1) {
      asset = tagMatches[0];
      matchedBy = "assetTag";
    }
  }

  if (!asset) {
    const serialMatches = await db.asset.findMany({
      where: { serialNumber: { equals: q, mode: "insensitive" } },
      take: 2,
      select: assetSelect,
    });
    if (serialMatches.length === 1) {
      asset = serialMatches[0];
      matchedBy = "serialNumber";
    }
  }

  if (!asset) {
    return Response.json({ error: "not_found", query: q }, { status: 404 });
  }

  return Response.json({ asset: shape(asset), matchedBy });
}
