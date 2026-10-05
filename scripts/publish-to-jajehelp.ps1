# Builds the app and mirrors it into jajehelp/public/messe/ (served as jajehelp.com/messe/).
# Deploying stays a separate, manual step from the jajehelp repo:
#   cd ..\jajehelp; firebase deploy --only hosting
param(
  [string]$Jajehelp = (Join-Path $PSScriptRoot '..\..\jajehelp')
)
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..'
Push-Location $root
try {
  $ErrorActionPreference = 'Continue'
  & npm.cmd run build
  $ErrorActionPreference = 'Stop'
  if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
} finally { Pop-Location }

$src = Join-Path $root 'dist'
$dest = Join-Path $Jajehelp 'public\messe'
if (-not (Test-Path (Join-Path $Jajehelp 'firebase.json'))) { throw "jajehelp repo not found at $Jajehelp" }
robocopy $src $dest /MIR /NJH /NJS /NFL /NDL | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed (code $LASTEXITCODE)" }
$count = (Get-ChildItem $dest -Recurse -File | Measure-Object).Count
Write-Host "messe ok  $count files -> $dest"
$global:LASTEXITCODE = 0
