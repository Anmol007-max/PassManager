@echo off
set "TOOL_MVN=%~dp0..\tools\apache-maven-3.9.9\bin\mvn.cmd"
if exist "%TOOL_MVN%" (
  "%TOOL_MVN%" %*
) else (
  mvn %*
)
