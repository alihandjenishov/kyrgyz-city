@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
set "PYTHONUNBUFFERED=1"
echo Kyrgyz City - starting the game
echo Please keep this window open.
echo.
if not exist main.py goto incomplete
if not exist scripts\launch.py goto incomplete
if exist .venv\Scripts\python.exe goto checkenv
where py >nul 2>nul
if errorlevel 1 goto pythoncmd
py -3.12 -c "import sys" >nul 2>nul
if not errorlevel 1 goto py312
py -3 -c "import sys;sys.exit(not sys.version_info >= (3,11))" >nul 2>nul
if errorlevel 1 goto missingpython
set "KCY_PY=py -3"
goto createenv
:py312
set "KCY_PY=py -3.12"
goto createenv
:pythoncmd
python -c "import sys;sys.exit(not sys.version_info >= (3,11))" >nul 2>nul
if errorlevel 1 goto missingpython
set "KCY_PY=python"
:createenv
echo [1/3] Preparing Python environment...
%KCY_PY% -m venv .venv > setup.log 2>&1
if errorlevel 1 goto setupfail
:checkenv
.venv\Scripts\python.exe -c "import sys;sys.exit(not sys.version_info >= (3,11))" >nul 2>nul
if errorlevel 1 goto brokenenv
if exist .venv\.kyrgyz-city-installed goto frontend
echo [2/3] Installing libraries. The first run may take a few minutes...
.venv\Scripts\python.exe -m pip install -r requirements.txt >> setup.log 2>&1
if errorlevel 1 goto setupfail
type nul > .venv\.kyrgyz-city-installed
:frontend
if exist static\app\.vite\manifest.json goto serve
where npm >nul 2>nul
if errorlevel 1 goto missingfrontend
pushd frontend
echo Building the interface...
call npm ci >> ..\setup.log 2>&1
if errorlevel 1 goto buildfail
call npm run build >> ..\setup.log 2>&1
if errorlevel 1 goto buildfail
popd
:serve
echo [3/3] Starting the server. Your browser will open when it is ready.
.venv\Scripts\python.exe -X utf8 scripts\launch.py
set "KCY_EXIT=%ERRORLEVEL%"
echo.
if not "%KCY_EXIT%"=="0" echo The game stopped with an error. Send the launch.log file or a screenshot of this window.
if "%KCY_EXIT%"=="0" echo The game server has stopped.
echo Keep this window open while playing. Stop with Ctrl+C.
pause
endlocal & exit /b %KCY_EXIT%
:buildfail
popd
goto setupfail
:setupfail
echo.
echo Setup failed. Details are saved in setup.log:
type setup.log
goto fail
:missingpython
echo Python 3.11 or newer was not found.
echo Install Python 3.12 from https://www.python.org/downloads/
echo Enable "Add Python to PATH", then run start.bat again.
goto fail
:brokenenv
echo The Python environment cannot start.
echo Check that Python is installed. Rename the .venv folder and run start.bat again.
goto fail
:incomplete
echo Some game files are missing. Right-click the ZIP, choose "Extract all", and open start.bat from the extracted folder.
goto fail
:missingfrontend
echo The ready-to-use interface is missing. Please extract the complete game archive again.
echo Developers can install Node.js 22.12 or newer and rebuild the interface.
goto fail
:fail
echo.
echo This window will stay open so you can read or copy the error.
pause
endlocal
exit /b 1
