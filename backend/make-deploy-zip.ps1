# Builds feazimove-backend-PRODUCTION.zip for AppSail upload.
# Excludes the real .env; bundles a minimal fallback .env instead (AppSail
# Configuration env vars always override it — dotenv never overwrites
# variables that already exist in the environment).
# Paystack keys are copied from the local .env at zip time so they never
# live in git. Run:  powershell -File make-deploy-zip.ps1

$ErrorActionPreference = 'Stop'
$backend = $PSScriptRoot
$stage   = Join-Path $env:TEMP 'feazimove-backend-stage'
$zip     = Join-Path $backend 'feazimove-backend-PRODUCTION.zip'

if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
robocopy $backend $stage /MIR /XF .env *.zip make-deploy-zip.ps1 /NFL /NDL /NJH /NJS | Out-Null

# Fallback env for Catalyst — non-secret URLs + Paystack keys from local .env
$local = Get-Content (Join-Path $backend '.env')
$payKeys = $local | Where-Object { $_ -match '^PAYSTACK_(PUBLIC|SECRET)_KEY=' }
@(
  '# Fallback config bundled for Catalyst AppSail.'
  '# Env vars set in the AppSail Configuration UI always take precedence.'
  'NODE_ENV=production'
  'APP_URL=https://www.feazimove.com/app'
  'PAYSTACK_CALLBACK_URL=https://www.feazimove.com/app/wallet?funded=1'
) + $payKeys | Set-Content (Join-Path $stage '.env') -Encoding utf8NoBOM

if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip)
Write-Host "Built $zip ($([math]::Round((Get-Item $zip).Length/1MB,1)) MB)"
