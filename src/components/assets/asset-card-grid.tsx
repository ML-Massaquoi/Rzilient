"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { LaptopIcon, MapPinIcon, UserRoundIcon } from "lucide-react";
import { StatusBadge } from "@/components/assets/status-badge";
import { CONDITION_LABELS } from "@/lib/labels";
import type { AssetListItem } from "@/server/queries/assets";

export function AssetCardGrid({ items }: { items: AssetListItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((asset, index) => {
        const photo = asset.attachments[0];
        const custodian = asset.activeAssignment?.employee;
        const custodianPhoto = custodian?.attachments[0];
        return (
          <motion.div
            key={asset.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
            whileHover={{ y: -3 }}
            className="bg-card group rounded-xl border shadow-xs transition-shadow hover:shadow-md"
          >
            <Link
              href={`/assets/${asset.id}`}
              className="flex flex-col focus-visible:ring-2 focus-visible:ring-ring rounded-xl outline-none"
            >
              <div className="bg-muted relative flex h-36 items-center justify-center overflow-hidden rounded-t-xl">
                {photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`/api/files/${photo.id}`}
                    alt={asset.name}
                    className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                ) : (
                  <LaptopIcon className="text-muted-foreground/40 size-10" />
                )}
                <div className="absolute top-2.5 right-2.5">
                  <StatusBadge status={asset.status} />
                </div>
              </div>

              <div className="flex flex-col gap-2.5 p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{asset.name}</p>
                  <p className="text-muted-foreground truncate font-mono text-xs">
                    {asset.assetTag}
                    {asset.brand || asset.model
                      ? ` · ${[asset.brand, asset.model].filter(Boolean).join(" ")}`
                      : ""}
                  </p>
                </div>

                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span>{asset.category.name}</span>
                  <span>{CONDITION_LABELS[asset.condition]}</span>
                </div>

                <div className="border-border mt-0.5 flex items-center justify-between gap-2 border-t pt-2.5">
                  {custodian ? (
                    <span className="flex min-w-0 items-center gap-1.5 text-xs">
                      {custodianPhoto ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`/api/files/${custodianPhoto.id}`}
                          alt=""
                          className="border-border size-5 shrink-0 rounded-full border object-cover"
                        />
                      ) : (
                        <UserRoundIcon className="text-muted-foreground size-3.5 shrink-0" />
                      )}
                      <span className="truncate">{custodian.fullName}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <UserRoundIcon className="size-3.5" />
                      In store
                    </span>
                  )}
                  {asset.location ? (
                    <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                      <MapPinIcon className="size-3" />
                      <span className="max-w-24 truncate">
                        {asset.location.name}
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
