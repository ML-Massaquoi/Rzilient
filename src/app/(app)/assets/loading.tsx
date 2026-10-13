import { Skeleton } from "@/components/ui/skeleton";

export default function AssetsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <Skeleton className="h-9 w-full lg:max-w-md" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-[150px]" />
          <Skeleton className="h-9 w-[150px]" />
          <Skeleton className="h-9 w-[150px]" />
        </div>
      </div>

      <div className="border-border rounded-lg border">
        <div className="border-border border-b px-4 py-3">
          <Skeleton className="h-4 w-2/3" />
        </div>
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="border-border flex items-center gap-6 border-b px-4 py-3 last:border-b-0"
          >
            <div className="min-w-[220px] space-y-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="hidden h-4 w-24 sm:block" />
            <Skeleton className="hidden h-5 w-24 sm:block" />
            <Skeleton className="hidden h-4 w-20 lg:block" />
            <Skeleton className="hidden h-4 w-28 lg:block" />
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-40" />
      </div>
    </div>
  );
}
