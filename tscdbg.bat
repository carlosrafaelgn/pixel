@ECHO OFF

DEL assets\js\scripts.min.js

REM Refer to tscmin.bat for an explanation of the final script file

CALL tsc

MOVE assets\js\scripts.js assets\js\scripts.min.js
