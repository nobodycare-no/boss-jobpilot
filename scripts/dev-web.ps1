Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")
corepack pnpm --filter "@boss-jobpilot/web" dev

