# Comprehensive Subtask Testing Script
Write-Host "=== EyeTask Subtask Complete Diagnosis ===" -ForegroundColor Yellow

# Test 1: Check service key configuration
Write-Host "`n1. Testing Service Key Configuration..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Host "   Server Status: $($healthData.data.status)" -ForegroundColor Green
    Write-Host "   Timestamp: $($healthData.data.timestamp)" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: Server not responding" -ForegroundColor Red
    exit 1
}

# Test 2: Login and get admin token
Write-Host "`n2. Testing Admin Authentication..." -ForegroundColor Cyan
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    $loginData = $loginResponse.Content | ConvertFrom-Json
    
    if ($loginData.success) {
        $token = $loginData.token
        Write-Host "   Login Success: Token length $($token.Length)" -ForegroundColor Green
    } else {
        Write-Host "   Login Failed: $($loginData.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   Login Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Get tasks to find a test task
Write-Host "`n3. Getting Tasks..." -ForegroundColor Cyan
try {
    $tasksResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/tasks" -Headers @{Authorization="Bearer $token"} -UseBasicParsing
    $tasksData = $tasksResponse.Content | ConvertFrom-Json
    
    if ($tasksData.success) {
        $testTask = $tasksData.tasks[0]
        $taskId = $testTask.id
        Write-Host "   Found test task: $($testTask.title) (ID: $taskId)" -ForegroundColor Green
    } else {
        Write-Host "   No tasks found" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   Tasks Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Get existing subtasks
Write-Host "`n4. Getting Existing Subtasks..." -ForegroundColor Cyan
try {
    $subtasksResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/tasks/$taskId/subtasks" -Headers @{Authorization="Bearer $token"} -UseBasicParsing
    $subtasksData = $subtasksResponse.Content | ConvertFrom-Json
    
    Write-Host "   Response format: success=$($subtasksData.success)" -ForegroundColor Yellow
    Write-Host "   Raw response: $($subtasksResponse.Content)" -ForegroundColor Gray
    
    if ($subtasksData.success) {
        $existingSubtasks = $subtasksData.data.subtasks
        Write-Host "   Found $($existingSubtasks.Count) existing subtasks" -ForegroundColor Green
        foreach ($subtask in $existingSubtasks) {
            Write-Host "     - $($subtask.title) (ID: $($subtask.id))" -ForegroundColor White
        }
    } else {
        Write-Host "   Failed to fetch subtasks: $($subtasksData.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   Subtasks Fetch Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Create a new subtask
Write-Host "`n5. Creating New Subtask..." -ForegroundColor Cyan
$subtaskBody = @{
    taskId = $taskId
    title = "Test Subtask - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    subtitle = "Created by comprehensive test script"
    datacoNumber = "TEST-$(Get-Random -Minimum 1000 -Maximum 9999)"
    type = "events"
    amountNeeded = 5
    labels = @("test", "automated")
    targetCar = @("EQ")
    weather = "Clear"
    scene = "Urban"
} | ConvertTo-Json

try {
    $createResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/subtasks" -Method POST -Body $subtaskBody -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -UseBasicParsing
    $createData = $createResponse.Content | ConvertFrom-Json
    
    Write-Host "   Create response: $($createResponse.Content)" -ForegroundColor Gray
    
    if ($createData.success) {
        $newSubtaskId = $createData.subtask.id
        Write-Host "   SUCCESS: Created subtask with ID: $newSubtaskId" -ForegroundColor Green
    } else {
        Write-Host "   FAILED: $($createData.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   Create Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# Test 6: Verify creation by fetching subtasks again
Write-Host "`n6. Verifying Creation..." -ForegroundColor Cyan
try {
    $verifyResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/tasks/$taskId/subtasks" -Headers @{Authorization="Bearer $token"} -UseBasicParsing
    $verifyData = $verifyResponse.Content | ConvertFrom-Json
    
    if ($verifyData.success) {
        $currentSubtasks = $verifyData.data.subtasks
        Write-Host "   Now have $($currentSubtasks.Count) total subtasks" -ForegroundColor Green
        Write-Host "   Latest subtasks:" -ForegroundColor White
        foreach ($subtask in $currentSubtasks | Select-Object -Last 3) {
            Write-Host "     - $($subtask.title) (ID: $($subtask.id))" -ForegroundColor White
        }
    }
} catch {
    Write-Host "   Verification Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Check if service key is being used (look for RLS errors in logs)
Write-Host "`n7. Service Key Validation..." -ForegroundColor Cyan
Write-Host "   Check server logs for 'SUPABASE_SERVICE_KEY not provided' warnings" -ForegroundColor Yellow
Write-Host "   If you see those warnings, the service key is not being loaded properly" -ForegroundColor Yellow

Write-Host "`n=== Test Complete ===" -ForegroundColor Yellow
Write-Host "Check the server console for detailed logs and any RLS policy errors" -ForegroundColor Cyan 