//
// MIT License
//
// Copyright (c) 2020 Carlos Rafael Gimenes das Neves
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// https://github.com/carlosrafaelgn/pixel
//

#include <chipmunk/chipmunk.h>

// Must be in sync with scripts/constants.ts
#define baseWidth 420
#define maxHeight (baseWidth << 1)

// Must be in sync with scripts/ui/controlMode.ts
#define Pointer 0
#define AccelerometerH 1
#define AccelerometerV 2

// Must be in sync with scripts/level/levelObject.ts
#define TypeBall 0
#define TypeGoal 1
#define TypeBomb 2
#define TypeCucumber 3
#define TypeCount 4
#define VisibilityNone 0
#define VisibilityVisible 1
#define VisibilityAlive 2
#define VisibilityAll (VisibilityVisible | VisibilityAlive)
#define FragmentsPerBall 64
#define FragmentsMaxTime 1.5f
#define FragmentsMaxTimeSaved 3.5f
#define VictoryFragmentCount 500

// Must be in sync with scripts/view/gameView.ts
#define FinishedThisFrame 1
#define FinishedVictory 2
#define FinishedLoss 4

// Finish behaviors
#define FinishedGame 1
#define FinishedPreview 2

// Collision types
#define CollisionBall 1
#define CollisionWall 2
#define CollisionObject 3

// Must be in sync with scripts/gl/webGL.ts
#define RectangleCapacity 512

// Each vertex has 3 attributes: position x, position y, (mix of alpha, texture x and texture y)
// Each attribute has 4 bytes (1 = 4 bytes)
#define FloatsPerPosition 2
#define FloatsPerAlphaTextureCoordinates 1

#define FloatsPerVertex (FloatsPerPosition + FloatsPerAlphaTextureCoordinates)
#define BytesPerVertex (4 * FloatsPerVertex)

#define FloatsPerRectangle (4 * FloatsPerVertex)
#define BytesPerRectangle (4 * FloatsPerRectangle)

// In order to improve the performance in passing data from here to JS,
// let's use a structure of arrays, instead of an array of structures.
typedef struct LevelStruct {
	// viewY must be in sync with scripts/view/gameView.ts
	cpFloat height, viewWidth, viewHeight, viewY, initialViewY, desiredViewY,
		viewYStep, viewYDirection, lastGravityYDirection, deltaSeconds;

	void* actualPtr;
	cpSpace* space;
	cpShape** wall;
	cpShape** objectShape;
	cpBody** objectBody;
	int* objectType;
	int* objectDestroyedThisFrame;
	int* objectVisibility;
	cpFloat* objectX;
	cpFloat* objectY;
	float* fragmentTime;
	int* fragmentSaved;
	float* fragmentX;
	float* fragmentY;
	float* fragmentVX;
	float* fragmentVY;

	int wallCount, objectCount, goalBlinkCount, goalBlinkFrames, cucumbersCollected,
		thisFrameAllCucumbersCollected, thisFrameDestroyedCount, ballsDestroyed,
		ballsSaved, deltaMilliseconds, cucumbersAnimating, finished, finishedFading,
		fragmentsAlive, firstIndexByType[TypeCount], countByType[TypeCount], preview;

	float fadeBgAlpha, explosionBgAlpha, victoryTime;

	// Must be in sync with scripts/view/gameView.ts
	int pointerCursorAttached, totalElapsedMilliseconds, victory;
	float pointerCursorCenterX, pointerCursorCenterY, pointerCursorX, pointerCursorY, globalAlpha;
} Level;

cpFloat smoothStep(cpFloat input);
#if CP_USE_DOUBLES
float smoothStepF(float input);
#else
#define smoothStepF smoothStep
#endif
unsigned char* alignBuffer(unsigned char* buffer, int skipCount);
float* allocateFloatBuffer(int floatCount);
void freeFloatBuffer(float* buffer);
