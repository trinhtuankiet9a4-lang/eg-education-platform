@echo off
chcp 65001 >nul
setlocal EnableExtensions

cd /d "%~dp0"

echo ========================================================
echo   EG EDUCATION PLATFORM - PRODUCTION LAUNCHER
echo ========================================================

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Khong tim thay Node.js! Vui long cai dat Node.js v22+ tro len.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [1/4] Cai dat thu vien phu thuoc...
    if exist "package-lock.json" (
        call npm.cmd ci
    ) else (
        call npm.cmd install
    )
    if errorlevel 1 (
        echo [ERROR] Cai dat thu vien that bai!
        pause
        exit /b 1
    )
) else (
    echo [1/4] Da co node_modules, bo qua cai dat lai.
)

echo [2/4] Dang build giao dien Production ^(npm run build^)...
call npm.cmd run build
if errorlevel 1 (
    echo [ERROR] Build frontend that bai! Vui long kiem tra lai ma nguon.
    pause
    exit /b 1
)

if exist "server\eg_education.db" (
    echo [3/4] Dang sao luu co so du lieu SQLite...
    call node server/backup_db.js
    if errorlevel 1 (
        echo [WARN] Sao luu DB gap canh bao, van tiep tuc khoi dong server...
    )
) else (
    echo [3/4] Chua co eg_education.db, he thong se tu khoi tao khi chay.
)

if exist ".env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
        if not "%%~A"=="" set "%%~A=%%~B"
    )
)

if "%NODE_ENV%"=="" set "NODE_ENV=production"
if "%PORT%"=="" set "PORT=5000"

echo [4/4] Khoi dong Unified Production Server tai http://localhost:%PORT%
echo       Nhan Ctrl+C de dung may chu.
echo ========================================================
node server/index.js
