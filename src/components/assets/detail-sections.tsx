import Link from "next/link";
import {
  CalendarIcon,
  CircleCheckIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/assets/status-badge";
import { CustodianAssign } from "@/components/assets/custodian-assign";
import { QrPanel } from "@/components/assets/qr-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MaintenanceStatusBadge } from "@/components/maintenance/status-badge";
import { MaintenanceDocuments } from "@/components/attachments/maintenance-documents";
import { RecordActions } from "@/components/maintenance/record-actions";
import { CONDITION_LABELS } from "@/lib/labels";
import { formatDate, formatDateTime, daysUntil, isPast } from "@/lib/datetime";
import type { AssetDetail } from "@/server/queries/assets";

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:grid sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd
        className={
          value
            ? `text-sm break-words ${mono ? "font-mono" : ""}`
            : "text-muted-foreground text-sm"
        }
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function WarrantyBadge({ endsAt }: { endsAt: Date | null }) {
  if (!endsAt) {
    return (
      <span className="text-muted-foreground text-sm">No warranty recorded</span>
    );
  }
  const daysLeft = daysUntil(endsAt);
  if (daysLeft < 0) {
    return (
      <Badge variant="outline" className="bg-status-damaged/15 text-status-damaged">
        Expired {formatDate(endsAt)}
      </Badge>
    );
  }
  if (daysLeft <= 30) {
    return (
      <Badge variant="outline" className="bg-status-maintenance/15 text-status-maintenance">
        Expiring soon · {formatDate(endsAt)}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-status-available/15 text-status-available">
      Active until {formatDate(endsAt)}
    </Badge>
  );
}

function CustodianCard({
  asset,
  canWrite,
}: {
  asset: AssetDetail;
  canWrite: boolean;
}) {
  const assignment = asset.activeAssignment;
  const overdue =
    assignment?.expectedReturnAt && isPast(assignment.expectedReturnAt);
  const canAssign =
    canWrite && !assignment && asset.status === "AVAILABLE";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <UserRoundIcon className="size-4" />
          Current custodian
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignment ? (
          <div className="space-y-3">
            <Link
              href={`/employees/${assignment.employee.id}`}
              className="group flex items-start gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {assignment.employee.attachments[0] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`/api/files/${assignment.employee.attachments[0].id}`}
                  alt={assignment.employee.fullName}
                  className="border-border size-14 shrink-0 rounded-lg border object-cover"
                />
              ) : (
                <div className="bg-muted border-border text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-lg border">
                  <UserRoundIcon className="size-6" />
                </div>
              )}
              <div className="min-w-0">
                <p className="group-hover:underline text-base font-semibold">
                  {assignment.employee.fullName}
                </p>
                <p className="text-muted-foreground text-sm">
                  {assignment.employee.position ?? assignment.employee.unit ?? ""}
                  {assignment.employee.position || assignment.employee.unit
                    ? " · "
                    : ""}
                  {assignment.employee.department.name}
                </p>
                {assignment.employee.phone ? (
                  <p className="text-muted-foreground text-sm">
                    {assignment.employee.phone}
                  </p>
                ) : null}
              </div>
            </Link>
            <dl className="divide-border border-t text-sm">
              <div className="flex justify-between gap-3 pt-2.5">
                <dt className="text-muted-foreground text-xs">Checked out</dt>
                <dd>{formatDate(assignment.assignedAt)}</dd>
              </div>
              <div className="flex justify-between gap-3 pt-2">
                <dt className="text-muted-foreground text-xs">
                  Expected return
                </dt>
                <dd>
                  {assignment.expectedReturnAt ? (
                    <span className={overdue ? "text-destructive font-medium" : ""}>
                      {formatDate(assignment.expectedReturnAt)}
                      {overdue ? " · overdue" : ""}
                    </span>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
            {canWrite ? (
              <CustodianAssign
                mode="transfer"
                assetId={asset.id}
                assetTag={asset.assetTag}
                assignmentId={assignment.id}
                currentEmployeeId={assignment.employee.id}
              />
            ) : null}
          </div>
        ) : (
          <>
            <EmptyState
              icon={CircleCheckIcon}
              title="Not assigned"
              description="This asset is in store and ready to be checked out to an employee."
              className="border-0 px-2 py-6"
            />
            {canAssign ? (
              <div className="flex justify-center">
                <CustodianAssign
                  mode="checkout"
                  assetId={asset.id}
                  assetTag={asset.assetTag}
                  condition={asset.condition}
                />
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AssetOverview({
  asset,
  canWrite,
}: {
  asset: AssetDetail;
  canWrite: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Asset information
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-border divide-y">
          <dl>
            <InfoRow label="Category" value={asset.category.name} />
            {asset.parent ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">Part of</span>
                <Link
                  href={`/assets/${asset.parent.id}`}
                  className="w-fit rounded-sm text-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {asset.parent.assetTag} · {asset.parent.name}
                </Link>
              </div>
            ) : null}
            <InfoRow label="Condition" value={CONDITION_LABELS[asset.condition]} />
            <InfoRow label="Brand" value={asset.brand} />
            <InfoRow label="Model" value={asset.model} />
            <InfoRow label="Serial number" value={asset.serialNumber} mono />
            <InfoRow label="Location" value={asset.location?.name} />
            <InfoRow label="Operating system" value={asset.os} />
            <InfoRow label="Hostname (FQDN)" value={asset.fqdn} mono />
            <InfoRow label="Ethernet MAC" value={asset.ethernetMac} mono />
            <InfoRow label="Wi-Fi MAC" value={asset.wifiMac} mono />
            <InfoRow label="Description" value={asset.description} />
            <InfoRow label="Notes" value={asset.notes} />
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4" />
                Purchase & warranty
              </span>
              <StatusBadge status={asset.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground text-xs">
                Purchase date
              </span>
              <span>{formatDate(asset.purchaseDate)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground text-xs">Cost</span>
              <span>
                {asset.purchaseCost != null
                  ? `SLE ${asset.purchaseCost.toString()}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground text-xs">Supplier</span>
              <span>{asset.supplier || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs">Warranty</span>
              <WarrantyBadge endsAt={asset.warrantyEndsAt} />
            </div>
            <div className="border-border flex justify-between gap-3 border-t pt-2.5">
              <span className="text-muted-foreground text-xs">Registered</span>
              <span className="flex items-center gap-1">
                <CalendarIcon className="text-muted-foreground size-3.5" />
                {formatDate(asset.createdAt)}
              </span>
            </div>
          </CardContent>
        </Card>

        <CustodianCard asset={asset} canWrite={canWrite} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">QR label</CardTitle>
          </CardHeader>
          <CardContent>
            <QrPanel assetTag={asset.assetTag} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AssetHistory({
  transactions,
}: {
  transactions: AssetDetail["transactions"];
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={CalendarIcon}
        title="No history yet"
        description="Every change to this asset will appear here as an immutable timeline entry."
      />
    );
  }

  return (
    <ol className="relative space-y-5 border-border border-l pl-5 ml-2">
      {transactions.map((tx) => (
        <li key={tx.id} className="relative">
          <span className="bg-primary absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-background" />
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-semibold">
              {tx.notes ?? tx.action.replaceAll("_", " ")}
            </span>
            <span className="text-muted-foreground text-xs">
              {tx.performedBy.name}
            </span>
            <span
              className="text-muted-foreground ml-auto text-xs"
              title={formatDateTime(tx.createdAt)}
            >
              {formatDateTime(tx.createdAt)}
            </span>
          </div>
          {(tx.fromStatus && tx.toStatus) ||
          (tx.conditionBefore && tx.conditionAfter) ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              {tx.fromStatus && tx.toStatus ? (
                <>
                  <Badge variant="outline">{tx.fromStatus}</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="outline">{tx.toStatus}</Badge>
                </>
              ) : null}
              {tx.conditionBefore && tx.conditionAfter ? (
                <span className="text-muted-foreground">
                  Condition: {CONDITION_LABELS[tx.conditionBefore]} →{" "}
                  {CONDITION_LABELS[tx.conditionAfter]}
                </span>
              ) : null}
            </div>
          ) : null}
          {tx.fromEmployee || tx.toEmployee ? (
            <p className="text-muted-foreground mt-1 text-xs">
              {[tx.fromEmployee?.fullName, tx.toEmployee?.fullName]
                .filter(Boolean)
                .join(" → ")}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function AssetMaintenance({
  records,
  assetId,
  canWrite,
  assetMeta,
}: {
  records: AssetDetail["maintenanceRecords"];
  assetId: string;
  canWrite: boolean;
  assetMeta?: {
    brand: string | null;
    model: string | null;
    serialNumber: string | null;
  } | null;
}) {
  const returnUrl = `/assets/${assetId}`;
  const newRecordButton = canWrite ? (
    <Button
      variant="outline"
      size="sm"
      render={<Link href={`/maintenance/new?assetId=${assetId}`} />}
    >
      <PlusIcon />
      New record
    </Button>
  ) : null;

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <EmptyState
          icon={ShieldCheckIcon}
          title="No maintenance records"
          description="Repairs, preventive servicing and warranty work for this asset will be listed here."
        />
        {newRecordButton}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">{newRecordButton}</div>
      {records.map((record) => (
        <Card key={record.id}>
          <CardContent className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{record.title}</p>
              <p className="text-muted-foreground text-xs">
                {record.type.replaceAll("_", " ")}
                {record.technician ? ` · ${record.technician}` : ""}
                {record.completedAt
                  ? ` · completed ${formatDate(record.completedAt)}`
                  : record.startedAt
                    ? ` · started ${formatDate(record.startedAt)}`
                    : ""}
              </p>
              {record.issue ? (
                <p className="text-muted-foreground mt-1 text-sm">
                  {record.issue}
                </p>
              ) : null}
              {record.actionTaken ? (
                <p className="text-muted-foreground mt-1 text-sm">
                  Action: {record.actionTaken}
                  {record.partsReplaced ? ` · Parts: ${record.partsReplaced}` : ""}
                </p>
              ) : null}
              {canWrite &&
              (record.status === "OPEN" || record.status === "IN_PROGRESS") ? (
                <div className="mt-2.5">
                  <RecordActions recordId={record.id} status={record.status} compact />
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <MaintenanceDocuments
                recordId={record.id}
                recordTitle={record.title}
                assetMeta={assetMeta}
                documents={record.attachments}
                canWrite={canWrite}
                returnUrl={returnUrl}
                triggerOnly
              />
              {record.cost != null ? (
                <span className="text-muted-foreground text-xs">
                  SLE {record.cost.toString()}
                </span>
              ) : null}
              <MaintenanceStatusBadge status={record.status} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
