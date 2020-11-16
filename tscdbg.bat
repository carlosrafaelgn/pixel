@ECHO OFF

DEL assets\js\scripts.min.js

CALL tsc

MOVE assets\js\scripts.js assets\js\scripts.min.js
