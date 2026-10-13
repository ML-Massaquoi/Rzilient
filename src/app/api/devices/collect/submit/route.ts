import { z } from "zod";
import { putCollectDevice } from "@/server/device-collect";

const SubmitBody = z.object({
  token: z.string().min(8).max(64),
  device: z.object({
    hostName: z.string().max(200).optional(),
    serialNumber: z.string().max(200).optional(),
    manufacturer: z.string().max(200).optional(),
    model: z.string().max(200).optional(),
    osCaption: z.string().max(200).optional(),
    ethernetMac: z.string().max(50).optional(),
    wifiMac: z.string().max(50).optional(),
    cpu: z.string().max(300).optional(),
    memoryGB: z.number().max(10000).optional(),
    ip: z.string().max(50).optional(),
  }),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = SubmitBody.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const result = putCollectDevice(parsed.data.token, parsed.data.device);
  if (result === "expired") {
    return Response.json({ error: "expired" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
