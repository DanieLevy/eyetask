# Test Service Key Configuration
Write-Host "=== Service Key Test ===" -ForegroundColor Yellow

# Test 1: Login to get token
Write-Host "`nLogging in..." -ForegroundColor Cyan
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    $loginData = $loginResponse.Content | ConvertFrom-Json
    
    if ($loginData.success) {
        $token = $loginData.token
        Write-Host "Login successful" -ForegroundColor Green
    } else {
        Write-Host "Login failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Login error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Try to create a subtask via the general API endpoint
Write-Host "`nTesting subtask creation..." -ForegroundColor Cyan
$subtaskPayload = @{
    taskId = "04402a7a-f8e4-4a6e-a6a8-ed9c4ef8f942"
    title = "Service Key Test"
    subtitle = "Testing if service key works"
    datacoNumber = "SK-TEST-$(Get-Random -Maximum 9999)"
    type = "events"
    amountNeeded = 1
    labels = @("test")
    targetCar = @("EQ")
    weather = "Clear"
    scene = "Urban"
} | ConvertTo-Json

Write-Host "Payload:" -ForegroundColor Gray
Write-Host $subtaskPayload -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/subtasks" -Method POST -Body $subtaskPayload -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -UseBasicParsing
    $responseData = $response.Content | ConvertFrom-Json
    
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Response:" -ForegroundColor Gray
    Write-Host $response.Content -ForegroundColor Gray
    
    if ($responseData.success) {
        Write-Host "SUCCESS: Subtask created!" -ForegroundColor Green
        Write-Host "Subtask ID: $($responseData.subtask.id)" -ForegroundColor Green
    } else {
        Write-Host "FAILED: $($responseData.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 500) {
            Write-Host "This is likely a service key / RLS policy issue" -ForegroundColor Yellow
            Write-Host "Check the server logs for RLS policy errors" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n=== End Test ===" -ForegroundColor Yellow 