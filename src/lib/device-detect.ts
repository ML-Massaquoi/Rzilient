/** Parses the paste-code produced by public/tools/detect-device.ps1.
 *  Format: AVCI1:<base64 of a small JSON object with hardware fields>. */
export type DetectedDevice = {
  hostName?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  osCaption?: string;
  ethernetMac?: string;
  wifiMac?: string;
  cpu?: string;
  memoryGB?: number;
  ip?: string;
};

const PREFIX = "AVCI1:";

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function parseDetectPayload(input: string): DetectedDevice | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  try {
    const bytes = Uint8Array.from(atob(trimmed.slice(PREFIX.length)), (char) =>
      char.charCodeAt(0)
    );
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Record<
      string,
      unknown
    >;
    const device: DetectedDevice = {
      hostName: clean(parsed.hostName),
      serialNumber: clean(parsed.serialNumber),
      manufacturer: clean(parsed.manufacturer),
      model: clean(parsed.model),
      osCaption: clean(parsed.osCaption),
      ethernetMac: clean(parsed.ethernetMac),
      wifiMac: clean(parsed.wifiMac),
      cpu: clean(parsed.cpu),
      ip: clean(parsed.ip),
    };
    if (typeof parsed.memoryGB === "number" && parsed.memoryGB > 0) {
      device.memoryGB = parsed.memoryGB;
    }
    const useful =
      device.serialNumber || device.model || device.manufacturer || device.hostName;
    return useful ? device : null;
  } catch {
    return null;
  }
}

export function describeDetected(device: DetectedDevice): string {
  const parts: string[] = [];
  const name = [device.manufacturer, device.model].filter(Boolean).join(" ");
  if (name) parts.push(name);
  if (device.serialNumber) parts.push(`SN ${device.serialNumber}`);
  if (device.hostName) parts.push(device.hostName);
  return parts.length > 0 ? parts.join(" · ") : "Device info";
}
