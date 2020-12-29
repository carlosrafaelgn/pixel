@ECHO OFF

DEL assets\js\scripts.min.js
DEL assets\js\scripts.es6.min.js
DEL assets\js\scripts.es5.min.js

REM We are specifying the target here and not at tsconfig.json
REM https://www.typescriptlang.org/docs/handbook/compiler-options.html (--target section)

REM ECMASCRIPT_2015 and ES6 are the same thing...
REM https://github.com/google/closure-compiler/wiki/Flags-and-Options
REM We need ECMASCRIPT_2015 (without async/await support) because of a few old Android devices...

CALL tsc --target ES2017
java -jar D:\Tools\closure-compiler.jar --js assets\js\scripts.js --js_output_file assets\js\scripts.min.js --language_in ECMASCRIPT_2017 --language_out ECMASCRIPT_2017 --strict_mode_input --compilation_level SIMPLE
DEL assets\js\scripts.js

CALL tsc --target ES2015
java -jar D:\Tools\closure-compiler.jar --js assets\js\scripts.js --js_output_file assets\js\scripts.es6.min.js --language_in ECMASCRIPT_2015 --language_out ECMASCRIPT_2015 --strict_mode_input --compilation_level SIMPLE
DEL assets\js\scripts.js

CALL tsc --target ES5
java -jar D:\Tools\closure-compiler.jar --js assets\js\scripts.js --js_output_file assets\js\scripts.es5.min.js --language_in ECMASCRIPT5_STRICT --language_out ECMASCRIPT5_STRICT --strict_mode_input --compilation_level SIMPLE
DEL assets\js\scripts.js
