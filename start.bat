@echo off
title SIT - Sistem Informasi Terintegrasi
echo ========================================================
echo  Menjalankan SIT Backend & Frontend Server...
echo ========================================================

where py >nul 2>nul
if %errorlevel% equ 0 (
    py run.py
    goto end
)

if exist "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" (
    "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" run.py
    goto end
)

python run.py

:end
pause
