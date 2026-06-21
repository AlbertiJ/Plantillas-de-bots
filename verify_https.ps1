# ============================================
# verify_https.ps1 — Verifica HTTPS end-to-end (Windows)
# ============================================
# Uso: .\verify_https.ps1 -Url https://bot.example.com

[CmdletBinding()]
param(
    [string]$Url = "https://localhost"
)

$ErrorActionPreference = "Stop"
$ok = $true

Write-Host "Verificando $Url ..."
Write-Host ""

# 1. Health check
Write-Host -NoNewline "[1/4] GET /api/status/health ... "
try {
    $r = Invoke-WebRequest -Uri "$Url/api/status/health" -UseBasicParsing -TimeoutSec 5
    if ($r.StatusCode -eq 200) { Write-Host "OK (200)" -ForegroundColor Green }
    else { Write-Host "FAIL ($($r.StatusCode))" -ForegroundColor Red; $ok = $false }
} catch {
    Write-Host "FAIL ($($_.Exception.Message))" -ForegroundColor Red; $ok = $false
}

# 2. HTTP -> HTTPS redirect
Write-Host -NoNewline "[2/4] HTTP -> HTTPS redirect ... "
$httpUrl = $Url -replace '^https://', 'http://'
try {
    $r = Invoke-WebRequest -Uri "$httpUrl/api/status/health" -UseBasicParsing -TimeoutSec 5 -MaximumRedirection 0 -ErrorAction SilentlyContinue
    if ($r.Headers.Location -and $r.Headers.Location.StartsWith("https://")) {
        Write-Host "OK (redirect a $($r.Headers.Location))" -ForegroundColor Green
    } else {
        Write-Host "FAIL (no redirect)" -ForegroundColor Red; $ok = $false
    }
} catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    if ($resp.StatusCode -eq 301 -or $resp.StatusCode -eq 308) {
        $loc = $resp.Headers.Location
        if ($loc.StartsWith("https://")) {
            Write-Host "OK (redirect a $loc)" -ForegroundColor Green
        } else {
            Write-Host "FAIL (redirect a $loc, no es https)" -ForegroundColor Red; $ok = $false
        }
    } else {
        Write-Host "FAIL ($($resp.StatusCode))" -ForegroundColor Red; $ok = $false
    }
}

# 3. Cert TLS
Write-Host -NoNewline "[3/4] Cert TLS ... "
$host = ($Url -replace '^https://', '') -replace '/.*$', ''
try {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
    $tcp = New-Object System.Net.Sockets.TcpClient($host, 443)
    $ssl = New-Object System.Net.Security.SslStream($tcp.GetStream(), $false)
    $ssl.AuthenticateAsClient($host)
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($ssl.RemoteCertificate)
    Write-Host "OK (Subject: $($cert.Subject))" -ForegroundColor Green
    $ssl.Close(); $tcp.Close()
} catch {
    Write-Host "FAIL ($($_.Exception.Message))" -ForegroundColor Red; $ok = $false
}

# 4. Headers de seguridad
Write-Host -NoNewline "[4/4] Security headers ... "
try {
    $r = Invoke-WebRequest -Uri "$Url/api/status/health" -UseBasicParsing -TimeoutSec 5
    $missing = @()
    foreach ($h in @("Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options")) {
        if (-not $r.Headers.ContainsKey($h)) { $missing += $h }
    }
    if ($missing.Count -eq 0) {
        Write-Host "OK (HSTS, X-CTO, X-Frame-Options presentes)" -ForegroundColor Green
    } else {
        Write-Host "FAIL (faltan: $($missing -join ', '))" -ForegroundColor Red; $ok = $false
    }
} catch {
    Write-Host "FAIL ($($_.Exception.Message))" -ForegroundColor Red; $ok = $false
}

Write-Host ""
if ($ok) { Write-Host "HTTPS OK." -ForegroundColor Green; exit 0 }
else { Write-Host "HTTPS FAIL." -ForegroundColor Red; exit 1 }
