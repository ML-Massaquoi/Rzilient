export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export function failure(error: string): ActionResult<never> {
  return { ok: false, error };
}

/** Logs a technical error server-side; users only ever see friendly messages. */
export function logActionError(scope: string, error: unknown): void {
  console.error(`[action:${scope}]`, error);
}

/** Accepts only safe internal paths (starts with single "/"). */
export function safeRedirectTarget(value: string | null | undefined): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}
