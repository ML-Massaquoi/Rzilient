import QRCode from "qrcode";
import { QrActions } from "@/components/assets/qr-actions";
import { qrPayloadForAsset } from "@/lib/asset-codes";
import { db } from "@/lib/db";

export async function QrPanel({ assetTag }: { assetTag: string }) {
  const asset = await db.asset.findUnique({
    where: { assetTag },
    select: {
      assetTag: true,
      name: true,
      status: true,
      condition: true,
      activeAssignment: {
        select: {
          employee: {
            select: {
              fullName: true,
              department: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const payload = qrPayloadForAsset({
    assetTag,
    name: asset?.name,
    status: asset?.status,
    condition: asset?.condition,
    custodian: asset?.activeAssignment?.employee.fullName ?? null,
    department: asset?.activeAssignment?.employee.department.name ?? null,
  });

  const dataUrl = await QRCode.toDataURL(payload, {
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={`QR code for ${assetTag}`}
        className="border-border size-44 rounded-lg border bg-white p-2"
      />
      <div className="text-center">
        <p className="font-mono text-sm font-medium">{assetTag}</p>
        <p className="text-muted-foreground mt-0.5 max-w-[16rem] text-xs">
          Scan with any phone camera — shows the tag, status, condition and
          holder instantly, no login needed. Re-print after custody changes to
          keep it current.
        </p>
      </div>
      <QrActions dataUrl={dataUrl} assetTag={assetTag} />
    </div>
  );
}
