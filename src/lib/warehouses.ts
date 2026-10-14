/** Shared warehouse constants (seed + app queries). */

/** Code of the parent Location that groups all warehouses. */
export const WAREHOUSE_ROOT_CODE = "WH";
export const WAREHOUSE_ROOT_NAME = "Warehouses";

/** Code of the default warehouse devices are placed in. */
export const DEFAULT_WAREHOUSE_CODE = "WH-IT";

export const WAREHOUSES: { name: string; code: string }[] = [
  { name: "I.T Warehouse", code: "WH-IT" },
  { name: "Camp Warehouse", code: "WH-CAMP" },
  { name: "Camp WareHouse New", code: "WH-CAMP-NEW" },
];
