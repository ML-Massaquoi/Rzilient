"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  InfoIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

export type SweetAlertType = "success" | "error" | "warning" | "info";

const CIRCLE: Record<SweetAlertType, string> = {
  success: "bg-[#22c55e]",
  error: "bg-[#ef4444]",
  warning: "bg-[#f59e0b]",
  info: "bg-[#0ea5e9]",
};

/**
 * SweetAlert-style centered modal used for `?just=…` confirmations.
 * Pops in with a spring, animated checkmark, and strips the query flag
 * so a refresh does not re-show it.
 */
export function SweetAlert({
  title,
  description,
  type = "success",
  confirmLabel = "OK",
  onConfirm,
}: {
  title: string;
  description?: string;
  type?: SweetAlertType;
  confirmLabel?: string;
  onConfirm?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of ["just", "maintenance"]) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) window.history.replaceState(null, "", url.toString());
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDismissed(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (dismissed) return null;

  const close = () => {
    setDismissed(true);
    onConfirm?.();
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        onClick={close}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 26 }}
        className="bg-background border-border relative w-full max-w-md rounded-2xl border px-7 pt-8 pb-6 text-center shadow-2xl"
      >
        <div className="flex justify-center">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 520, damping: 24 }}
            className={cn(
              "flex size-16 items-center justify-center rounded-full text-white",
              CIRCLE[type]
            )}
          >
            {type === "success" ? (
              <svg viewBox="0 0 52 52" className="size-9" aria-hidden>
                <motion.path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 27 L23 38 L40 17"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.3, duration: 0.35, ease: "easeOut" }}
                />
              </svg>
            ) : type === "error" ? (
              <XIcon className="size-8" strokeWidth={3} />
            ) : type === "warning" ? (
              <TriangleAlertIcon className="size-8" />
            ) : (
              <InfoIcon className="size-8" />
            )}
          </motion.span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.22 }}
        >
          <h2 className="mt-5 text-xl font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed">
              {description}
            </p>
          ) : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.22 }}
        >
          <Button
            autoFocus
            onClick={close}
            className="mt-6 h-10 min-w-36 rounded-xl px-8 shadow-sm"
          >
            {confirmLabel}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
