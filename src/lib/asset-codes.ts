import { CONDITION_LABELS, STATUS_LABELS } from "@/lib/labels";

/** Builds the asset-registration URL for a scanned/typed code.
 *  FIA-IT-* codes are treated as asset tags; anything else as a serial number. */
export function registerHrefForCode(code: string): string {
  const trimmed = code.trim();
  const encoded = encodeURIComponent(trimmed);
  return /^FIA-IT-/i.test(trimmed)
    ? `/assets/new?assetTag=${encoded}`
    : `/assets/new?serialNumber=${encoded}`;
}

/** The public lookup URL baked into printed QR labels. */
export function scanUrlForTag(tag: string, origin: string): string {
  return `${origin.replace(/\/+$/, "")}/scan?tag=${encodeURIComponent(tag.trim())}`;
}

export type QrAssetInfo = {
  assetTag: string;
  name?: string;
  status?: string;
  condition?: string;
  custodian?: string | null;
  department?: string | null;
};

/** Self-contained QR payload: any phone camera shows the important info
 *  instantly — no login, no server access needed. First line always starts
 *  with the asset tag so the in-app scanner can still look the asset up. */
export function qrPayloadForAsset(info: QrAssetInfo): string {
  const lines: string[] = [];
  lines.push(
    info.name ? `${info.assetTag} | ${info.name}` : info.assetTag
  );
  const bits: string[] = [];
  if (info.status) {
    bits.push(`Status: ${STATUS_LABELS[info.status as keyof typeof STATUS_LABELS] ?? info.status}`);
  }
  if (info.condition) {
    bits.push(
      `Condition: ${CONDITION_LABELS[info.condition as keyof typeof CONDITION_LABELS] ?? info.condition}`
    );
  }
  if (bits.length > 0) lines.push(bits.join(" · "));
  lines.push(
    info.custodian
      ? `Held by: ${info.custodian}${info.department ? ` (${info.department})` : ""}`
      : "Held by: In store"
  );
  lines.push("Avci · FIA IT Department");
  return lines.join("\n");
}

/** Accepts a raw asset tag, a rich QR payload (first line = tag),
 *  or a /scan URL — returns the bare tag for lookups. */
export function extractAssetTagFromScan(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const tag = url.searchParams.get("tag");
      if (tag) return tag.trim();
      const match = /\/scan\/([^/?#]+)/.exec(url.pathname);
      if (match) return decodeURIComponent(match[1]);
      return "";
    } catch {
      return "";
    }
  }
  const firstLine = trimmed.split(/\r?\n/)[0] ?? "";
  return firstLine.split("|")[0]!.trim();
}
