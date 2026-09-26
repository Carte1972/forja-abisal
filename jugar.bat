@echo off
rem Lanzador de Forja Abisal para Windows: haz doble clic en este archivo.
rem Toda la logica esta en scripts\node_portable.ps1 (Node.js) y scripts\launcher.mjs (el juego).
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Forja Abisal

set "FORJA_NODE_DIR=%~dp0.forja_node"
set "FORJA_NODE_URL=https://nodejs.org/es/download"

rem 1. Node.js del sistema, si cumple la versión mínima de package.json.
if "%FORJA_FORCE_PORTABLE%"=="1" goto portable
where node >nul 2>nul || goto missing
where npm >nul 2>nul || goto missing
node scripts\check_node.cjs >nul 2>nul && goto run
echo Tu Node.js es demasiado antiguo para el juego.
goto portable
:missing
echo No se ha encontrado Node.js en este equipo.

rem 2. Copia portátil de .forja_node\ (o 3. descargarla de nodejs.org).
:portable
if exist "%FORJA_NODE_DIR%\node.exe" (
  "%FORJA_NODE_DIR%\node.exe" scripts\check_node.cjs >nul 2>nul && goto useportable
)
echo Se usará una copia de Node.js solo para el juego, dentro de su carpeta.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\node_portable.ps1" -Destination "%FORJA_NODE_DIR%"
if errorlevel 1 goto nonode
"%FORJA_NODE_DIR%\node.exe" scripts\check_node.cjs >nul 2>nul || goto nonode
:useportable
set "PATH=%FORJA_NODE_DIR%;%PATH%"

:run
node scripts\launcher.mjs %*
if errorlevel 1 (
  echo.
  echo El juego se ha cerrado por un error.
  pause
  exit /b 1
)
exit /b 0

:nonode
echo.
echo No se ha podido preparar Node.js automáticamente.
echo Comprueba tu conexión a internet y vuelve a abrir el lanzador, o bien
rem La versión mínima es la de "engines" en package.json.
echo instala Node.js 22.12 o superior (versión LTS) desde:
echo   %FORJA_NODE_URL%
echo.
pause
exit /b 1
