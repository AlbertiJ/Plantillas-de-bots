# ============================================
# install_caddy.ps1 — Instala Caddy en Windows
# ============================================
# Requiere: PowerShell 5+ ejecutado como Administrador
# Uso: .\install_caddy.ps1 -Domain bot.example.com

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$Domain,
    [string]$AppDir = "C:\plantillas-de-bots",
    [string]$CaddyDir = "C:\caddy"
)

$ErrorActionPreference = "Stop"

# Verificar admin
if (-not (New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Ejecutar PowerShell como Administrador"
    exit 1
}

# Sanitizar el dominio: solo letras, digitos, puntos y guiones
if ($Domain -notmatch '^[a-zA-Z0-9.-]+$') {
    Write-Error "Dominio invalido. Solo letras, digitos, puntos y guiones."
    exit 1
}

Write-Host "[1/5] Descargando Caddy..." -ForegroundColor Cyan
$caddyZip = "$env:TEMP\caddy.zip"
$caddyVersion = "2.7.6"
$caddyUrl = "https://github.com/caddyserver/caddy/releases/download/v$caddyVersion/caddy_${caddyVersion}_windows_amd64.zip"
Invoke-WebRequest -Uri $caddyUrl -OutFile $caddyZip -UseBasicParsing
Expand-Archive -Path $caddyZip -DestinationPath $CaddyDir -Force

# Agregar al PATH si no esta
$path = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($path -notlike "*$CaddyDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$path;$CaddyDir", "Machine")
    $env:Path = "$env:Path;$CaddyDir"
}

Write-Host "[2/5] Creando directorios..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $AppDir | Out-Null
New-Item -ItemType Directory -Force -Path "$CaddyDir\data" | Out-Null
New-Item -ItemType Directory -Force -Path "$CaddyDir\config" | Out-Null

Write-Host "[3/5] Copiando Caddyfile..." -ForegroundColor Cyan
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Copy-Item "$scriptDir\Caddyfile.bare" "$CaddyDir\Caddyfile" -Force
(Get-Content "$CaddyDir\Caddyfile") -replace "yourdomain.com", $Domain | Set-Content "$CaddyDir\Caddyfile"

Write-Host "[4/5] Validando config..." -ForegroundColor Cyan
& "$CaddyDir\caddy.exe" validate --config "$CaddyDir\Caddyfile" --adapter caddyfile
if ($LASTEXITCODE -ne 0) {
    Write-Error "Caddyfile invalido"
    exit 1
}

Write-Host "[5/5] Registrando Caddy como servicio de Windows..." -ForegroundColor Cyan
& sc.exe create caddy binPath= "$CaddyDir\caddy.exe run --config $CaddyDir\Caddyfile" start= auto | Out-Null
& sc.exe description caddy "Caddy web server para plantillas-de-bots" | Out-Null
& sc.exe start caddy | Out-Null

Write-Host ""
Write-Host "OK. Caddy instalado para $Domain" -ForegroundColor Green
Write-Host "Verificar: curl.exe -I https://$Domain/api/status/health"
Write-Host "Logs: Get-EventLog -LogName Application -Source caddy"
