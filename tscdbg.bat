@ECHO OFF

del assets\js\scripts.min.js

CALL tsc

move assets\js\scripts.js assets\js\scripts.min.js
