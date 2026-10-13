/** Standard accessory set offered at check-out (§22). */
export const ACCESSORY_OPTIONS = [
  "Charger",
  "Mouse",
  "Keyboard",
  "Laptop bag",
  "HDMI adapter",
  "Docking station",
] as const;

export const TRANSFER_REASONS = [
  "Role change",
  "Department transfer",
  "Device swap",
  "Project assignment",
  "Other",
] as const;

/** Split accessories at return: everything checked stays returned, the rest is missing. */
export function partitionAccessories(
  accessoriesOut: string[],
  returnedInput: string[]
): { returned: string[]; missing: string[] } {
  const returnedSet = new Set(returnedInput);
  const returned = accessoriesOut.filter((a) => returnedSet.has(a));
  const missing = accessoriesOut.filter((a) => !returnedSet.has(a));
  return { returned, missing };
}
