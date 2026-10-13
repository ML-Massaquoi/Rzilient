import { getCurrentUser } from "@/server/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ assets: [], employees: [] });
  }

  const [assets, employees] = await Promise.all([
    db.asset.findMany({
      where: {
        archivedAt: null,
        OR: [
          { assetTag: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { serialNumber: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { model: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        assetTag: true,
        name: true,
        status: true,
      },
    }),
    db.employee.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { fiaNumber: { contains: q, mode: "insensitive" } },
          { employeeNo: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 6,
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        fiaNumber: true,
        department: { select: { name: true } },
      },
    }),
  ]);

  return Response.json({ assets, employees });
}
