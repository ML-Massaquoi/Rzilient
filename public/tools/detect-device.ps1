#Requires -Version 5.1
<#
  Avci - device detector
  ------------------------------------------------------------------
  Run this on the PC you are about to register. It collects the
  serial number, hostname, MAC addresses, model and OS, prints a
  single paste-code, and copies it to your clipboard.

  Then, in the Avci "Register asset" wizard, paste the code into the
  "Detect from this PC" box - every field is filled automatically.

  One-line usage from the wizard (runs this script from the server):
      irm <server>/tools/detect-device.ps1 | iex
#>

$ErrorActionPreference = "SilentlyContinue"

$cs   = Get-CimInstance Win32_ComputerSystem
$bios = Get-CimInstance Win32_BIOS
$os   = Get-CimInstance Win32_OperatingSystem
$cpu  = Get-CimInstance Win32_Processor | Select-Object -First 1

$adapters = @(Get-CimInstance Win32_NetworkAdapterConfiguration |
    Where-Object { $_.IPEnabled -and $_.MACAddress })

$wifi = $adapters |
    Where-Object { $_.Description -match 'wireless|wi-?fi|wlan|802\.11' } |
    Select-Object -First 1
$wired = $adapters |
    Where-Object { $_.Description -notmatch 'wireless|wi-?fi|wlan|802\.11' } |
    Select-Object -First 1

function Get-FirstIPv4($adapter) {
    if (-not $adapter) { return "" }
    $found = @($adapter.IPAddress) | Where-Object { $_ -match '^\d{1,3}(\.\d{1,3}){3}$' } | Select-Object -First 1
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

$json  = $payload | ConvertTo-Json -Compress
$bytes = [Text.Encoding]::UTF8.GetBytes($json)
$line  = "AVCI1:" + [Convert]::ToBase64String($bytes)

Write-Host ""
Write-Host "Detected:" -ForegroundColor Green
Write-Host ("  {0} {1}" -f $payload.manufacturer, $payload.model)
Write-Host ("  Serial  {0}" -f $payload.serialNumber)
Write-Host ("  Host    {0}" -f $payload.hostName)
Write-Host ("  OS      {0}" -f $payload.osCaption)
Write-Host ""
Write-Host "Avci device code - paste it into the Register asset wizard:" -ForegroundColor Green
Write-Host $line -ForegroundColor Cyan
Write-Host ""

$script:clipped = $false
try {
    Set-Clipboard -Value $line
    $script:clipped = $true
    Write-Host "Copied to clipboard. Click into the wizard's paste box and press Ctrl+V." -ForegroundColor Green
} catch {
    Write-Host "Select the code above, copy it (Ctrl+C), then paste it in the wizard." -ForegroundColor Yellow
}

# Keep the window open when double-clicked; skip when piped (irm | iex).
if ($MyInvocation.InvocationName -ne '.') {
    try {
        if ([Console]::IsInputRedirected -eq $false) {
            Read-Host "Press Enter to close"
        }
    } catch { }
}
