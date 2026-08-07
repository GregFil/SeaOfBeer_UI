param(
  [string]$ProjectPath = "C:\Projects\SeaOfBeer_UI",
  [string]$SiteName = "filimosg-001-site1",
  [string]$ServiceUrl = "https://win1141.site4now.net:8172/MsDeploy.axd?site=filimosg-001-site1",
  [string]$UserName = "filimosg-001",
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

function ConvertTo-PlainText([Security.SecureString]$SecureValue) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

$msdeploy = "C:\Program Files\IIS\Microsoft Web Deploy V3\msdeploy.exe"
if (-not (Test-Path $msdeploy)) {
  $msdeploy = "C:\Program Files (x86)\IIS\Microsoft Web Deploy V3\msdeploy.exe"
}
if (-not (Test-Path $msdeploy)) {
  throw "msdeploy.exe not found."
}

Set-Location $ProjectPath

if (-not $SkipBuild) {
  Write-Host "Building project..." -ForegroundColor Cyan
  npm.cmd run build
}

if (-not (Test-Path "$ProjectPath\dist")) {
  throw "Build output not found: $ProjectPath\dist"
}

$secure = Read-Host "Enter Web Deploy password" -AsSecureString
$plain = ConvertTo-PlainText $secure

Write-Host "Deploying dist via Web Deploy..." -ForegroundColor Cyan

& $msdeploy `
  -verb:sync `
  -source:contentPath="$ProjectPath\dist" `
  -dest:contentPath="$SiteName",computerName="$ServiceUrl",userName="$UserName",password="$plain",authType="Basic" `
  -allowUntrusted

Write-Host "Deployment command finished." -ForegroundColor Green