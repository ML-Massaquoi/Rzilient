import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export function ListPagination({
  page,
  pageCount,
  total,
  search,
  basePath,
  noun = "assets",
}: {
  page: number;
  pageCount: number;
  total: number;
  search: string;
  basePath: string;
  noun?: string;
}) {
  if (total === 0) return null;

  const pageHref = (target: number) => {
    const params = new URLSearchParams(search);
    if (target > 1) params.set("page", String(target));
    else params.delete("page");
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const from = (page - 1) * 20 + 1;
  const to = Math.min(page * 20, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <p className="text-muted-foreground text-xs">
        Showing <span className="text-foreground font-medium">{from}–{to}</span>{" "}
        of <span className="text-foreground font-medium">{total}</span> {noun}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={pageHref(page - 1)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            rel="prev"
          >
            <ArrowLeftIcon />
            Previous
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "pointer-events-none opacity-40"
            )}
            aria-disabled
          >
            <ArrowLeftIcon />
            Previous
          </span>
        )}
        <span className="text-muted-foreground text-xs tabular-nums">
          {page} / {pageCount}
        </span>
        {page < pageCount ? (
          <Link
            href={pageHref(page + 1)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            rel="next"
          >
            Next
            <ArrowRightIcon />
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "pointer-events-none opacity-40"
            )}
            aria-disabled
          >
            Next
            <ArrowRightIcon />
          </span>
        )}
      </div>
    </div>
  );
}
