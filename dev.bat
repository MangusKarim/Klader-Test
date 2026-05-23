@echo off
set PATH=%~dp0.node-portable;%PATH%
echo Starting Klader Business Control Dashboard...
start http://localhost:3000
npm run dev
