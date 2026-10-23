@echo off
cd "%~dp0backend"
call mvn.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
pause
