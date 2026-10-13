import { getCollectStatus } from "@/server/device-collect";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.toUpperCase();
  if (!token) {
    return Response.json({ status: "expired" }, { status: 400 });
  }
  const status = getCollectStatus(token);
  if (status.status === "ready") {
    return Response.json(
      { status: "ready", device: status.device },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
  return Response.json(status, {
    headers: { "Cache-Control": "no-store" },
  });
}
