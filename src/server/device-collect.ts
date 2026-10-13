import { randomBytes } from "crypto";

/** One-time short-lived sessions for the "Detect this PC" flow:
 *  wizard creates a token → generated PowerShell script posts the hardware
 *  info back with that token → wizard polls and auto-fills. */

type CollectEntry = {
  expiresAt: number;
  device: Record<string, unknown> | null;
};

const TTL_MS = 10 * 60 * 1000;

function store(): Map<string, CollectEntry> {
  const g = globalThis as typeof globalThis & {
    __avciCollectTokens?: Map<string, CollectEntry>;
  };
  if (!g.__avciCollectTokens) g.__avciCollectTokens = new Map();
  return g.__avciCollectTokens;
}

function prune() {
  const now = Date.now();
  for (const [key, entry] of store()) {
    if (entry.expiresAt < now) store().delete(key);
  }
}

export function createCollectToken(): { token: string; expiresInSec: number } {
  prune();
  const token = randomBytes(6).toString("hex").toUpperCase();
  store().set(token, { expiresAt: Date.now() + TTL_MS, device: null });
  return { token, expiresInSec: TTL_MS / 1000 };
}

export function putCollectDevice(
  token: string,
  device: Record<string, unknown>
): "stored" | "already" | "expired" {
  prune();
  const entry = store().get(token.toUpperCase());
  if (!entry) return "expired";
  if (entry.device) return "already";
  entry.device = device;
  return "stored";
}

export function getCollectStatus(token: string): {
  status: "pending" | "ready" | "expired";
  device?: Record<string, unknown>;
} {
  prune();
  const entry = store().get(token.toUpperCase());
  if (!entry) return { status: "expired" };
  return entry.device
    ? { status: "ready", device: entry.device }
    : { status: "pending" };
}
