# Builds feazimove-backend-PRODUCTION.zip for AppSail upload.
# Excludes the real .env; bundles a minimal fallback .env instead (AppSail
# Configuration env vars always override it — dotenv never overwrites
# variables that already exist in the environment).
# Secrets (DB, JWT, SMTP, Anchor) are copied from the local .env at zip time so they never
# live in git. Run:  powershell -File make-deploy-zip.ps1

$ErrorActionPreference = 'Stop'
$backend = $PSScriptRoot
$stage   = Join-Path $env:TEMP 'feazimove-backend-stage'
$zip     = Join-Path $backend 'feazimove-backend-PRODUCTION.zip'

if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
robocopy $backend $stage /MIR /XF .env *.zip make-deploy-zip.ps1 /NFL /NDL /NJH /NJS | Out-Null

# Fallback env for Catalyst — the full local .env with NODE_ENV forced to
# production. Needed because Catalyst promotions can leave the AppSail
# environment without its configured variables (Dev config replaces Prod's),
# which crash-loops the app at the startup guard.
$local = Get-Content (Join-Path $backend '.env') | ForEach-Object {
  if ($_ -match '^NODE_ENV=') { 'NODE_ENV=production' } else { $_ }
}
$lines = @(
  '# Fallback config bundled for Catalyst AppSail.'
  '# Env vars set in the AppSail Configuration UI always take precedence.'
) + $local
# UTF8 without BOM — works on both Windows PowerShell 5.1 and pwsh 7
[System.IO.File]::WriteAllLines((Join-Path $stage '.env'), $lines, (New-Object System.Text.UTF8Encoding($false)))

if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip)
Write-Host "Built $zip ($([math]::Round((Get-Item $zip).Length/1MB,1)) MB)"
