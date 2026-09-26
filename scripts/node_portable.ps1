# Descarga Node.js (LTS oficial de nodejs.org) en la carpeta del juego, para jugar.bat.
# Comprueba la suma SHA-256 publicada por nodejs.org antes de descomprimir.
# No necesita administrador ni toca nada fuera de -Destination.
param([Parameter(Mandatory = $true)][string]$Destination)

$ErrorActionPreference = 'Stop'
# Sin la barra de progreso de PowerShell, Invoke-WebRequest es muchísimo más rápido.
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

# Rama LTS que se descarga. Se actualiza sola dentro de la rama (parches de seguridad).
$base = 'https://nodejs.org/dist/latest-v22.x'

try {
    if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64') {
        $arch = 'arm64'
    } elseif ([Environment]::Is64BitOperatingSystem) {
        $arch = 'x64'
    } else {
        throw 'Node.js no está disponible para Windows de 32 bits.'
    }

    $work = Join-Path ([IO.Path]::GetTempPath()) ('forja_node_' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $work | Out-Null

    Write-Host 'Descargando Node.js desde nodejs.org (solo esta vez)…'
    $sums = Join-Path $work 'SHASUMS256.txt'
    Invoke-WebRequest -UseBasicParsing -Uri "$base/SHASUMS256.txt" -OutFile $sums
    $pattern = "^([0-9a-f]{64})\s+(node-v[0-9.]+-win-$arch\.zip)$"
    $line = Get-Content $sums | Where-Object { $_ -match $pattern } | Select-Object -First 1
    if (-not $line -or $line -notmatch $pattern) { throw "nodejs.org no ofrece Node.js para win-$arch." }
    $expected = $Matches[1]
    $file = $Matches[2]

    Write-Host "  $file"
    $zip = Join-Path $work $file
    Invoke-WebRequest -UseBasicParsing -Uri "$base/$file" -OutFile $zip
    $actual = (Get-FileHash -Algorithm SHA256 -Path $zip).Hash
    if ($actual -ne $expected) {
        throw 'La descarga de Node.js está dañada (la suma SHA-256 no coincide). Vuelve a intentarlo.'
    }

    Write-Host 'Descomprimiendo…'
    $extract = Join-Path $work 'extract'
    New-Item -ItemType Directory -Path $extract | Out-Null
    # tar.exe (Windows 10 1803 o posterior) es mucho más rápido que Expand-Archive.
    $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
    if (Test-Path $tar) {
        & $tar -xf $zip -C $extract
        if ($LASTEXITCODE -ne 0) { throw 'No se ha podido descomprimir Node.js.' }
    } else {
        Expand-Archive -Path $zip -DestinationPath $extract
    }
    $inner = Get-ChildItem -Path $extract -Directory | Select-Object -First 1
    if (-not $inner) { throw 'El archivo de Node.js no tiene el contenido esperado.' }

    if (Test-Path $Destination) { Remove-Item -Recurse -Force $Destination }
    Move-Item -Path $inner.FullName -Destination $Destination
    Remove-Item -Recurse -Force $work
    $version = & (Join-Path $Destination 'node.exe') -v
    Write-Host "Node.js $version listo en .forja_node\."
    Write-Host ''
    exit 0
} catch {
    Write-Host $_.Exception.Message
    if ($work -and (Test-Path $work)) { Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue }
    exit 1
}
