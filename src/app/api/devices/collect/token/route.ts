import { getCurrentUser } from "@/server/auth";
import { createCollectToken } from "@/server/device-collect";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (user.role === "VIEWER") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const { token, expiresInSec } = createCollectToken();
  return Response.json({ token, expiresInSec });
}
