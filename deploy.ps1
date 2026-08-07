param(
  [string]$ProjectPath = "C:\Projects\SeaOfBeer_UI",
  [string]$SiteName = "filimosg-001-site1",
  [string]$ServiceUrl = "https://win1141.site4now.net:8172/MsDeploy.axd?site=filimosg-001-site1",
  [string]$UserName = "filimosg-001"
)

$msdeploy = "C:\Program Files\IIS\Microsoft Web Deploy V3\msdeploy.exe"
if (-not (Test-Path $msdeploy)) {
  $msdeploy = "C:\Program Files (x86)\IIS\Microsoft Web Deploy V3\msdeploy.exe"
}
if (-not (Test-Path $msdeploy)) {
  throw "msdeploy.exe not found."
}

Set-Location $ProjectPath
npm.cmd run build

$secure = Read-Host "Enter Web Deploy password" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
)

& $msdeploy `
  -verb:sync `
  -source:contentPath="$ProjectPath\dist" `
  -dest:contentPath="$SiteName",computerName="$ServiceUrl",userName="$UserName",password="$plain",authType="Basic" `
  -allowUntrusted