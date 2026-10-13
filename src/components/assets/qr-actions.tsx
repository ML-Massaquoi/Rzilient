"use client";

import { DownloadIcon, PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QrActions({
  dataUrl,
  assetTag,
}: {
  dataUrl: string;
  assetTag: string;
}) {
  function printLabel() {
    const win = window.open("", "_blank", "width=480,height=600");
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><title>${assetTag}</title>` +
        `<style>body{font-family:ui-sans-serif,system-ui,sans-serif;display:grid;place-items:center;gap:10px;margin:32px}` +
        `img{width:340px;height:340px}p{margin:0;font-size:18px;font-weight:600;letter-spacing:.04em}</style>` +
        `</head><body><img src="${dataUrl}" alt="${assetTag}"/><p>${assetTag}</p></body></html>`
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button variant="outline" size="sm" render={<a download={`${assetTag}.png`} href={dataUrl} />}>
        <DownloadIcon />
        Download
      </Button>
      <Button variant="outline" size="sm" onClick={printLabel}>
        <PrinterIcon />
        Print label
      </Button>
    </div>
  );
}
