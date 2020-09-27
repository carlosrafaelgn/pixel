@echo off

del assets\js\scripts.min.js

call tsc

move assets\js\scripts.js assets\js\scripts.min.js
