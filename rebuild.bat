@ECHO OFF

SET LIB_DIR=lib
SET OUT_DIR=assets\js
SET CHIP_SRC=%LIB_DIR%\Chipmunk2D\src
SET CHIP_INC=%LIB_DIR%\Chipmunk2D\include

SET SRCS=^
	%CHIP_SRC%\chipmunk.c %CHIP_SRC%\cpArbiter.c %CHIP_SRC%\cpArray.c ^
	%CHIP_SRC%\cpBBTree.c %CHIP_SRC%\cpBody.c %CHIP_SRC%\cpCollision.c ^
	%CHIP_SRC%\cpConstraint.c %CHIP_SRC%\cpDampedRotarySpring.c ^
	%CHIP_SRC%\cpDampedSpring.c %CHIP_SRC%\cpGearJoint.c ^
	%CHIP_SRC%\cpGrooveJoint.c %CHIP_SRC%\cpHashSet.c ^
	%CHIP_SRC%\cpHastySpace.c %CHIP_SRC%\cpMarch.c %CHIP_SRC%\cpPinJoint.c ^
	%CHIP_SRC%\cpPivotJoint.c %CHIP_SRC%\cpPolyShape.c ^
	%CHIP_SRC%\cpPolyline.c %CHIP_SRC%\cpRatchetJoint.c ^
	%CHIP_SRC%\cpRobust.c %CHIP_SRC%\cpRotaryLimitJoint.c ^
	%CHIP_SRC%\cpShape.c %CHIP_SRC%\cpSimpleMotor.c ^
	%CHIP_SRC%\cpSlideJoint.c %CHIP_SRC%\cpSpace.c ^
	%CHIP_SRC%\cpSpaceComponent.c %CHIP_SRC%\cpSpaceDebug.c ^
	%CHIP_SRC%\cpSpaceHash.c %CHIP_SRC%\cpSpaceQuery.c ^
	%CHIP_SRC%\cpSpaceStep.c %CHIP_SRC%\cpSpatialIndex.c ^
	%CHIP_SRC%\cpSweep1D.c ^
	%LIB_DIR%\memory.c %LIB_DIR%\physics.c %LIB_DIR%\gl.c %LIB_DIR%\imageProcessing.c

REM General options: https://emscripten.org/docs/tools_reference/emcc.html
REM -s flags: https://github.com/emscripten-core/emscripten/blob/master/src/settings.js
REM
REM Extra:
REM https://emscripten.org/docs/porting/Debugging.html
REM https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#interacting-with-code-ccall-cwrap
REM -s EXTRA_EXPORTED_RUNTIME_METHODS=['cwrap']
REM
REM Debugging:
REM https://emscripten.org/docs/porting/Debugging.html#debugging-debug-information-g
REM https://emscripten.org/docs/tools_reference/emcc.html
REM -s ASSERTIONS=2
REM -s STACK_OVERFLOW_CHECK=2
REM -g4
REM --source-map-base '/pixel/'
REM
REM As of August 2020, WASM=2 does not work properly, even if loading the correct file
REM manually during runtime... That's why I'm compiling it twice...
REM
REM 8388608 bytes (2097152 stack + 6291456 heap) is enough to hold even the largest
REM structure, ImageInfo, which has a total of 4719244 bytes.

DEL %OUT_DIR%\lib.js
DEL %OUT_DIR%\lib.js.mem
DEL %OUT_DIR%\lib.wasm
DEL %OUT_DIR%\lib-nowasm.js

CALL emcc ^
	-I%CHIP_INC% ^
	-s WASM=0 ^
	-s PRECISE_F32=0 ^
	-s DYNAMIC_EXECUTION=0 ^
	-s EXPORTED_FUNCTIONS="['_allocateImageInfo', '_getImageInfoData', '_getImageInfoPoints', '_freeImageInfo', '_processImage', '_allocateBuffer', '_freeBuffer', '_draw', '_drawScale', '_drawRotate', '_drawScaleRotate', '_init', '_getViewYPtr', '_getFirstPropertyPtr', '_viewResized', '_step', '_destroy', '_initLevelSpriteSheet', '_renderBackground', '_render']" ^
	-s EXTRA_EXPORTED_RUNTIME_METHODS="[stackSave, stackAlloc, stackRestore]" ^
	-s ALLOW_MEMORY_GROWTH=0 ^
	-s INITIAL_MEMORY=8388608 ^
	-s MAXIMUM_MEMORY=8388608 ^
	-s TOTAL_STACK=2097152 ^
	-s SUPPORT_LONGJMP=0 ^
	-s MINIMAL_RUNTIME=0 ^
	-s ASSERTIONS=0 ^
	-s STACK_OVERFLOW_CHECK=0 ^
	-s EXPORT_NAME=CLib ^
	-s MODULARIZE=1 ^
	-s ENVIRONMENT='web,webview' ^
	-Os ^
	-DNDEBUG ^
	-DCP_USE_DOUBLES=0 ^
	-o %OUT_DIR%\lib.js ^
	%SRCS%

MOVE %OUT_DIR%\lib.js %OUT_DIR%\lib-nowasm.js

CALL emcc ^
	-I%CHIP_INC% ^
	-s WASM=1 ^
	-s DYNAMIC_EXECUTION=0 ^
	-s EXPORTED_FUNCTIONS="['_allocateImageInfo', '_getImageInfoData', '_getImageInfoPoints', '_freeImageInfo', '_processImage', '_allocateBuffer', '_freeBuffer', '_draw', '_drawScale', '_drawRotate', '_drawScaleRotate', '_init', '_getViewYPtr', '_getFirstPropertyPtr', '_viewResized', '_step', '_destroy', '_initLevelSpriteSheet', '_renderBackground', '_render']" ^
	-s EXTRA_EXPORTED_RUNTIME_METHODS="['stackSave', 'stackAlloc', 'stackRestore']" ^
	-s ALLOW_MEMORY_GROWTH=0 ^
	-s INITIAL_MEMORY=8388608 ^
	-s MAXIMUM_MEMORY=8388608 ^
	-s TOTAL_STACK=2097152 ^
	-s SUPPORT_LONGJMP=0 ^
	-s MINIMAL_RUNTIME=0 ^
	-s ASSERTIONS=0 ^
	-s STACK_OVERFLOW_CHECK=0 ^
	-s EXPORT_NAME=CLib ^
	-s MODULARIZE=1 ^
	-s ENVIRONMENT='web,webview' ^
	-Os ^
	-DNDEBUG ^
	-DCP_USE_DOUBLES=0 ^
	-o %OUT_DIR%\lib.js ^
	%SRCS%

cacls %OUT_DIR%\lib.js /E /P Todos:R
cacls %OUT_DIR%\lib.js.mem /E /P Todos:R
cacls %OUT_DIR%\lib.wasm /E /P Todos:R
cacls %OUT_DIR%\lib-nowasm.js /E /P Todos:R
