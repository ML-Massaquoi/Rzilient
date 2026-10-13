import { getCollectStatus } from "@/server/device-collect";

/** Returns a PowerShell script with a one-time token baked in. The script
 *  collects this PC's hardware info and posts it back to the server, where
 *  the waiting wizard picks it up. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.toUpperCase();
  if (!token || getCollectStatus(token).status === "expired") {
    return new Response("Unknown or expired token.", { status: 404 });
  }
  const server = url.origin;

  const script = `$ErrorActionPreference = "SilentlyContinue"
$server = '${server.replace(/'/g, "''")}'
$token  = '${token.replace(/'/g, "''")}'

$cs   = Get-CimInstance Win32_ComputerSystem
$bios = Get-CimInstance Win32_BIOS
$os   = Get-CimInstance Win32_OperatingSystem
$cpu  = Get-CimInstance Win32_Processor | Select-Object -First 1

$adapters = @(Get-CimInstance Win32_NetworkAdapterConfiguration |
    Where-Object { $_.IPEnabled -and $_.MACAddress })
$wifi = $adapters |
    Where-Object { $_.Description -match 'wireless|wi-?fi|wlan|802\\.11' } |
    Select-Object -First 1
$wired = $adapters |
    Where-Object { $_.Description -notmatch 'wireless|wi-?fi|wlan|802\\.11' } |
    Select-Object -First 1

function Get-FirstIPv4($adapter) {
    if (-not $adapter) { return "" }
    $found = @($adapter.IPAddress) | Where-Object { $_ -match '^\\d{1,3}(\\.\\d{1,3}){3}$' } | Select-Object -First 1
    if ($found) { return $found }
    return ""
}

$ip = Get-FirstIPv4 $wired
if (-not $ip) { $ip = Get-FirstIPv4 $wifi }

$memoryGB = 0
if ($cs.TotalPhysicalMemory) {
    $memoryGB = [math]::Round(($cs.TotalPhysicalMemory / 1GB), 1)
}

$payload = [ordered]@{
    hostName     = "$($env:COMPUTERNAME)".Trim()
    serialNumber = "$($bios.SerialNumber)".Trim()
    manufacturer = "$($cs.Manufacturer)".Trim()
    model        = "$($cs.Model)".Trim()
    osCaption    = ("$($os.Caption) $($os.Version)").Trim()
    ethernetMac  = "$($wired.MACAddress)".Trim()
    wifiMac      = "$($wifi.MACAddress)".Trim()
    cpu          = "$($cpu.Name)".Trim()
    memoryGB     = $memoryGB
    ip           = "$ip"
}

$body = @{ token = $token; device = $payload } | ConvertTo-Json -Compress -Depth 5

try {
    Invoke-RestMethod -Uri "$server/api/devices/collect/submit" -Method Post -ContentType "application/json" -Body $body | Out-Null
    Write-Host ""
    Write-Host "Sent to Avci. Switch back to the browser - the form fills automatically." -ForegroundColor Green
    Write-Host ("  {0} {1}  (SN {2})" -f $payload.manufacturer, $payload.model, $payload.serialNumber)
} catch {
    $json  = $payload | ConvertTo-Json -Compress
    $line  = "AVCI1:" + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
    Write-Host ""
    Write-Host "Could not reach the server. Paste this code in the wizard instead:" -ForegroundColor Yellow
    Write-Host $line -ForegroundColor Cyan
    try { Set-Clipboard -Value $line; Write-Host "(copied to clipboard)" } catch { }
}

Write-Host ""
try {
    if ([Console]::IsInputRedirected -eq $false) {
        Read-Host "Press Enter to close"
    }
} catch { }
`;

  return new Response(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="avci-collect.ps1"',
      "Cache-Control": "no-store",
    },
  });
}
