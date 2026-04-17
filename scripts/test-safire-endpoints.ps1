# Script para probar endpoints Safire directamente
# Usa las credenciales ONVIF proporcionadas

param(
    [string]$IP = "192.168.1.117",
    [string]$Username = "ceroideas",
    [string]$Password = "12345678",
    [int]$Port = 80
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRUEBA DE ENDPOINTS SAFIRE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IP: $IP" -ForegroundColor Yellow
Write-Host "Puerto: $Port" -ForegroundColor Yellow
Write-Host "Usuario: $Username" -ForegroundColor Yellow
Write-Host "Contraseña: [OCULTA]" -ForegroundColor Yellow
Write-Host ""

# Crear credenciales Base64
$credentials = "$Username`:$Password"
$bytes = [System.Text.Encoding]::ASCII.GetBytes($credentials)
$base64 = [Convert]::ToBase64String($bytes)
$authHeader = "Basic $base64"

# Lista de endpoints a probar
$endpoints = @(
    # Endpoints base
    @{ Path = "/ISAPI"; Method = "GET"; Description = "Endpoint base ISAPI" },
    @{ Path = "/cgi-bin"; Method = "GET"; Description = "Endpoint base CGI" },
    
    # Endpoints ISAPI System
    @{ Path = "/ISAPI/System"; Method = "GET"; Description = "ISAPI System" },
    @{ Path = "/ISAPI/System/deviceInfo"; Method = "GET"; Description = "ISAPI Device Info" },
    @{ Path = "/ISAPI/System/capabilities"; Method = "GET"; Description = "ISAPI Capabilities" },
    @{ Path = "/ISAPI/System/version"; Method = "GET"; Description = "ISAPI Version" },
    @{ Path = "/ISAPI/System/status"; Method = "GET"; Description = "ISAPI Status" },
    
    # Endpoints ISAPI Audio
    @{ Path = "/ISAPI/System/TwoWayAudio"; Method = "GET"; Description = "ISAPI Two-Way Audio" },
    @{ Path = "/ISAPI/System/TwoWayAudio/channels"; Method = "GET"; Description = "ISAPI Audio Channels" },
    @{ Path = "/ISAPI/System/TwoWayAudio/channels/1"; Method = "GET"; Description = "ISAPI Audio Channel 1" },
    
    # Endpoints ISAPI Video
    @{ Path = "/ISAPI/System/Video"; Method = "GET"; Description = "ISAPI Video" },
    @{ Path = "/ISAPI/System/Video/inputs"; Method = "GET"; Description = "ISAPI Video Inputs" },
    @{ Path = "/ISAPI/System/Video/inputs/channels"; Method = "GET"; Description = "ISAPI Video Channels" },
    
    # Endpoints CGI
    @{ Path = "/cgi-bin/device_info.cgi"; Method = "GET"; Description = "CGI Device Info" },
    @{ Path = "/cgi-bin/version.cgi"; Method = "GET"; Description = "CGI Version" },
    @{ Path = "/cgi-bin/status.cgi"; Method = "GET"; Description = "CGI Status" },
    @{ Path = "/cgi-bin/snapshot.cgi"; Method = "GET"; Description = "CGI Snapshot" },
    @{ Path = "/cgi-bin/snapshot.cgi?channel=1"; Method = "GET"; Description = "CGI Snapshot Channel 1" },
    
    # Endpoints CGI Audio
    @{ Path = "/cgi-bin/audio_config.cgi"; Method = "GET"; Description = "CGI Audio Config" },
    @{ Path = "/cgi-bin/audio_test.cgi"; Method = "GET"; Description = "CGI Audio Test" },
    @{ Path = "/cgi-bin/audio_send.cgi"; Method = "GET"; Description = "CGI Audio Send" },
    @{ Path = "/cgi-bin/audio_input.cgi"; Method = "GET"; Description = "CGI Audio Input" },
    @{ Path = "/cgi-bin/audio_stream.cgi"; Method = "GET"; Description = "CGI Audio Stream" },
    
    # Endpoints ONVIF
    @{ Path = "/onvif/device_service"; Method = "GET"; Description = "ONVIF Device Service" },
    @{ Path = "/onvif/device_service?wsdl"; Method = "GET"; Description = "ONVIF Device Service WSDL" },
    @{ Path = "/onvif/media_service"; Method = "GET"; Description = "ONVIF Media Service" },
    
    # Otros endpoints comunes
    @{ Path = "/"; Method = "GET"; Description = "Root" },
    @{ Path = "/index.html"; Method = "GET"; Description = "Index HTML" },
    @{ Path = "/web"; Method = "GET"; Description = "Web Interface" },
    @{ Path = "/api"; Method = "GET"; Description = "API Root" }
)

# Función para probar un endpoint
function Test-Endpoint {
    param(
        [string]$Path,
        [string]$Method,
        [string]$Description,
        [string]$BaseUrl,
        [string]$AuthHeader
    )
    
    $url = "$BaseUrl$Path"
    
    try {
        $headers = @{
            "Authorization" = $AuthHeader
            "Accept" = "application/xml, text/xml, application/json, text/html, */*"
        }
        
        $response = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -TimeoutSec 5 -ErrorAction Stop
        
        $statusCode = $response.StatusCode
        $contentType = $response.Headers["Content-Type"]
        $content = $response.Content
        
        # Parsear XML si es posible
        $xmlInfo = ""
        if ($contentType -like "*xml*" -or $content -match "^<\?xml") {
            try {
                [xml]$xmlDoc = $content
                $xmlInfo = " | XML válido"
                
                # Extraer información útil del XML
                if ($xmlDoc.config) {
                    $errorCode = $xmlDoc.config.errorCode
                    $loginFailNum = $xmlDoc.config.LoginFailNum
                    $version = $xmlDoc.config.version
                    
                    if ($errorCode) { $xmlInfo += " | errorCode=$errorCode" }
                    if ($loginFailNum) { $xmlInfo += " | LoginFailNum=$loginFailNum" }
                    if ($version) { $xmlInfo += " | version=$version" }
                }
            } catch {
                $xmlInfo = " | XML parse error"
            }
        }
        
        # Limitar contenido mostrado
        $contentPreview = if ($content.Length -gt 200) {
            $content.Substring(0, 200) + "..."
        } else {
            $content
        }
        
        return @{
            Success = $true
            StatusCode = $statusCode
            ContentType = $contentType
            Content = $content
            ContentPreview = $contentPreview
            XmlInfo = $xmlInfo
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = $_.Exception.Message
        
        # Intentar leer respuesta de error
        $errorContent = ""
        if ($_.Exception.Response) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $errorContent = $reader.ReadToEnd()
                $reader.Close()
                $stream.Close()
            } catch {
                $errorContent = "[No se pudo leer respuesta]"
            }
        }
        
        return @{
            Success = $false
            StatusCode = $statusCode
            ErrorMessage = $errorMessage
            ErrorContent = $errorContent
        }
    }
}

# Resultados
$results = @{
    Success = @()
    Unauthorized = @()
    NotFound = @()
    Other = @()
}

Write-Host "Probando endpoints..." -ForegroundColor Green
Write-Host ""

foreach ($endpoint in $endpoints) {
    $result = Test-Endpoint -Path $endpoint.Path -Method $endpoint.Method -Description $endpoint.Description -BaseUrl "http://${IP}:${Port}" -AuthHeader $authHeader
    
    $color = switch ($result.StatusCode) {
        200 { "Green"; $results.Success += $endpoint }
        401 { "Yellow"; $results.Unauthorized += $endpoint }
        403 { "Yellow"; $results.Unauthorized += $endpoint }
        404 { "Gray"; $results.NotFound += $endpoint }
        default { "Red"; $results.Other += $endpoint }
    }
    
    $statusIcon = switch ($result.StatusCode) {
        200 { "✅" }
        401 { "⚠️" }
        403 { "⚠️" }
        404 { "❌" }
        default { "❌" }
    }
    
    Write-Host "$statusIcon $($endpoint.Method) $($endpoint.Path)" -ForegroundColor $color -NoNewline
    Write-Host " - Status: $($result.StatusCode)" -ForegroundColor $color
    
    if ($result.Success -and $result.ContentType) {
        Write-Host "   Content-Type: $($result.ContentType)" -ForegroundColor DarkGray
    }
    
    if ($result.XmlInfo) {
        Write-Host "   $($result.XmlInfo)" -ForegroundColor DarkGray
    }
    
    # Mostrar contenido si es exitoso o si es una respuesta XML interesante
    if ($result.Success -or ($result.ErrorContent -and $result.ErrorContent -match "^<\?xml")) {
        Write-Host "   Contenido:" -ForegroundColor DarkGray
        $contentToShow = if ($result.Success) { $result.ContentPreview } else { $result.ErrorContent }
        if ($contentToShow.Length -gt 500) {
            Write-Host "   $($contentToShow.Substring(0, 500))..." -ForegroundColor DarkGray
        } else {
            Write-Host "   $contentToShow" -ForegroundColor DarkGray
        }
        Write-Host ""
    }
}

# Resumen
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Exitosos (200): $($results.Success.Count)" -ForegroundColor Green
Write-Host "⚠️  Requieren Auth (401/403): $($results.Unauthorized.Count)" -ForegroundColor Yellow
Write-Host "❌ No Encontrados (404): $($results.NotFound.Count)" -ForegroundColor Gray
Write-Host "❌ Otros Errores: $($results.Other.Count)" -ForegroundColor Red
Write-Host ""

# Mostrar endpoints exitosos
if ($results.Success.Count -gt 0) {
    Write-Host "Endpoints Exitosos:" -ForegroundColor Green
    foreach ($ep in $results.Success) {
        Write-Host "  ✅ $($ep.Method) $($ep.Path) - $($ep.Description)" -ForegroundColor Green
    }
    Write-Host ""
}

# Mostrar endpoints que requieren auth
if ($results.Unauthorized.Count -gt 0) {
    Write-Host "Endpoints que Requieren Autenticación:" -ForegroundColor Yellow
    foreach ($ep in $results.Unauthorized) {
        Write-Host "  ⚠️  $($ep.Method) $($ep.Path) - $($ep.Description)" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Guardar resultados en archivo
$outputFile = "safire-endpoints-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
$results | ConvertTo-Json -Depth 10 | Out-File $outputFile
Write-Host "Resultados guardados en: $outputFile" -ForegroundColor Cyan












