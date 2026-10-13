import { cn } from "cn";
import { SearchXIcon } from "lucide-react";

export function EmptyState({
  icon: Icon = SearchXIcon,
  title,
  description,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center",
        className
      )}
    >
      <span className="bg-muted grid size-10 place-items-center rounded-full">
        <Icon className="text-muted-foreground size-5" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
