import { Skeleton } from "@/components/ui/skeleton";

export default function DepartmentsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="border-border rounded-lg border">
        <div className="flex flex-col gap-3 p-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
