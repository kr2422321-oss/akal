@echo off
setlocal enabledelayedexpansion

:: =============================================================================
:: =                    AUTO BUILD TOOLS SETUP SCRIPT                         =
:: =============================================================================
:: Bu script Visual Studio Build Tools'u otomatik olarak başlatır ve
:: projeyi derler. Developer Command Prompt'a manuel olarak girmenize gerek yok.

echo Checking for Visual Studio Build Tools...

:: Visual Studio Build Tools yollarını kontrol et
set "VS_PATHS[0]=%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat"
set "VS_PATHS[1]=%ProgramFiles%\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat"
set "VS_PATHS[2]=%ProgramFiles%\Microsoft Visual Studio\2022\Professional\Common7\Tools\VsDevCmd.bat"
set "VS_PATHS[3]=%ProgramFiles%\Microsoft Visual Studio\2022\Enterprise\Common7\Tools\VsDevCmd.bat"
set "VS_PATHS[4]=%ProgramFiles(x86)%\Microsoft Visual Studio\2019\BuildTools\Common7\Tools\VsDevCmd.bat"
set "VS_PATHS[5]=%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Community\Common7\Tools\VsDevCmd.bat"
set "VS_PATHS[6]=%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Professional\Common7\Tools\VsDevCmd.bat"
set "VS_PATHS[7]=%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Enterprise\Common7\Tools\VsDevCmd.bat"

set "VSDEVCMD_PATH="

:: Mevcut Visual Studio yollarını kontrol et
for /L %%i in (0,1,7) do (
    call set "current_path=%%VS_PATHS[%%i]%%"
    if exist "!current_path!" (
        set "VSDEVCMD_PATH=!current_path!"
        echo Found Visual Studio at: !current_path!
        goto :found_vs
    )
)

:: Visual Studio bulunamadı
echo.
echo ERROR: Visual Studio Build Tools bulunamadi!
echo.
echo Lutfen asagidakilerden birini yukleyin:
echo - Visual Studio 2019/2022 Community/Professional/Enterprise
echo - Visual Studio Build Tools 2019/2022
echo.
echo Indirme linki: https://visualstudio.microsoft.com/downloads/
echo.
pause
exit /b 1

:found_vs
echo.
echo Visual Studio Build Tools baslatiliyor...
echo.

:: Visual Studio Developer Command Prompt'u başlat ve make.bat'i çalıştır
:: x64 mimarisini zorla (proje x86 desteklemiyor)
if "%~1"=="" (
    call "%VSDEVCMD_PATH%" -arch=x64 && call make.bat
) else (
    call "%VSDEVCMD_PATH%" -arch=x64 && call make.bat %*
)

if %errorlevel% neq 0 (
    echo.
    echo Build basarisiz oldu!
    pause
    exit /b %errorlevel%
)

echo.
echo Build basariyla tamamlandi!
echo.
pause
exit /b 0