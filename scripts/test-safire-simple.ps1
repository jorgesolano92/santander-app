# Script simple para probar endpoints Safire y ver respuestas XML completas

param(
    [string]$IP = "192.168.1.117",
    [string]$Username = "ceroideas",
    [string]$Password = "12345678"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRUEBA SIMPLE DE ENDPOINTS SAFIRE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Crear credenciales Base64
$credentials = "$Username`:$Password"
$bytes = [System.Text.Encoding]::ASCII.GetBytes($credentials)
$base64 = [Convert]::ToBase64String($bytes)
$authHeader = "Basic $base64"

# Función para probar endpoint y mostrar respuesta completa
function Test-EndpointSimple {
    param(
        [string]$Path,
        [string]$Method = "GET",
        [string]$BaseUrl,
        [string]$AuthHeader = $null,
        [switch]$NoAuth
    )
    
    $url = "$BaseUrl$Path"
    Write-Host "`n========================================" -ForegroundColor Yellow
    Write-Host "Probando: $Method $Path" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    
    try {
        $headers = @{
            "Accept" = "application/xml, text/xml, application/json, text/html, */*"
        }
        
        if (-not $NoAuth -and $AuthHeader) {
            $headers["Authorization"] = $AuthHeader
        }
        
        $response = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -TimeoutSec 5 -ErrorAction Stop
        
        Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Content-Type: $($response.Headers['Content-Type'])" -ForegroundColor Cyan
        Write-Host "`nContenido completo:" -ForegroundColor White
        Write-Host $response.Content -ForegroundColor Gray
        
        return $response.Content
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "❌ Status: $statusCode" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        
        # Intentar leer el cuerpo de la respuesta de error usando WebException
        $webException = $_.Exception
        if ($webException -is [System.Net.WebException] -and $webException.Response) {
            try {
                $responseStream = $webException.Response.GetResponseStream()
                if ($responseStream) {
                    $reader = New-Object System.IO.StreamReader($responseStream)
                    $errorBody = $reader.ReadToEnd()
                    $reader.Close()
                    $responseStream.Close()
                    
                    if ($errorBody) {
                        Write-Host "`nContenido de la respuesta de error:" -ForegroundColor Yellow
                        Write-Host $errorBody -ForegroundColor Gray
                        return $errorBody
                    }
                }
            } catch {
                Write-Host "No se pudo leer el cuerpo de la respuesta: $($_.Exception.Message)" -ForegroundColor DarkGray
            }
        }
        
        # Método alternativo: usar WebRequest directamente para capturar el cuerpo de error
        try {
            $request = [System.Net.HttpWebRequest]::Create($url)
            $request.Method = $Method
            $request.Timeout = 5000
            $request.Accept = "application/xml, text/xml, application/json, text/html, */*"
            
            if (-not $NoAuth -and $AuthHeader) {
                $request.Headers.Add("Authorization", $AuthHeader)
            }
            
            try {
                $response = $request.GetResponse()
                $stream = $response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $body = $reader.ReadToEnd()
                $reader.Close()
                $stream.Close()
                $response.Close()
                
                Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
                Write-Host "`nContenido completo:" -ForegroundColor White
                Write-Host $body -ForegroundColor Gray
                return $body
            } catch [System.Net.WebException] {
                $webEx = $_.Exception
                $statusCode = [int]$webEx.Response.StatusCode
                Write-Host "❌ Status: $statusCode" -ForegroundColor Red
                
                $errorStream = $webEx.Response.GetResponseStream()
                $errorReader = New-Object System.IO.StreamReader($errorStream)
                $errorBody = $errorReader.ReadToEnd()
                $errorReader.Close()
                $errorStream.Close()
                $webEx.Response.Close()
                
                if ($errorBody) {
                    Write-Host "`nContenido de la respuesta de error:" -ForegroundColor Yellow
                    Write-Host $errorBody -ForegroundColor Gray
                    return $errorBody
                }
            }
        } catch {
            Write-Host "Error alternativo: $($_.Exception.Message)" -ForegroundColor DarkGray
        }
        
        return $null
    }
}

$baseUrl = "http://${IP}:80"

# Probar diferentes combinaciones
Write-Host "`n1. /ISAPI SIN autenticación:" -ForegroundColor Cyan
Test-EndpointSimple -Path "/ISAPI" -BaseUrl $baseUrl -NoAuth

Write-Host "`n2. /ISAPI CON autenticación ONVIF:" -ForegroundColor Cyan
Test-EndpointSimple -Path "/ISAPI" -BaseUrl $baseUrl -AuthHeader $authHeader

Write-Host "`n3. /cgi-bin SIN autenticación:" -ForegroundColor Cyan
Test-EndpointSimple -Path "/cgi-bin" -BaseUrl $baseUrl -NoAuth

Write-Host "`n4. /cgi-bin CON autenticación ONVIF:" -ForegroundColor Cyan
Test-EndpointSimple -Path "/cgi-bin" -BaseUrl $baseUrl -AuthHeader $authHeader

# Probar con credenciales admin
$adminCred = [Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("admin:Santander@Notoca"))
$adminAuthHeader = "Basic $adminCred"

Write-Host "`n5. /ISAPI CON credenciales admin:" -ForegroundColor Cyan
Test-EndpointSimple -Path "/ISAPI" -BaseUrl $baseUrl -AuthHeader $adminAuthHeader

Write-Host "`n6. /cgi-bin CON credenciales admin:" -ForegroundColor Cyan
Test-EndpointSimple -Path "/cgi-bin" -BaseUrl $baseUrl -AuthHeader $adminAuthHeader

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  FIN DE PRUEBAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

