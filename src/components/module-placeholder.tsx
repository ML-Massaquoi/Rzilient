import { ConstructionIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ModulePlaceholder({
  title,
  description,
  phase,
  features = [],
}: {
  title: string;
  description: string;
  phase: string;
  features?: string[];
}) {
  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-status-maintenance/15 text-status-maintenance grid size-10 shrink-0 place-items-center rounded-lg">
              <ConstructionIcon className="size-5" />
            </span>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <Badge variant="outline" className="mt-1.5">
                Under development
              </Badge>
            </div>
          </div>
        </div>
        <CardDescription className="mt-2 text-sm leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {features.length > 0 ? (
          <div>
            <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">
              Planned capabilities
            </p>
            <ul className="space-y-1.5">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="text-muted-foreground flex items-start gap-2 text-sm"
                >
                  <span
                    className="bg-muted mt-1.5 size-1.5 shrink-0 rounded-full"
                    aria-hidden
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-muted-foreground border-border border-t pt-4 text-xs leading-relaxed">
          This module is scheduled for {phase}. It will work with real
          database data when complete — no demo or placeholder actions will be
          enabled before then.
        </p>
      </CardContent>
    </Card>
  );
}
