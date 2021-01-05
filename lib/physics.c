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
//
// References:
// https://chipmunk-physics.net/documentation.php
// https://chipmunk-physics.net/release/ChipmunkLatest-Docs/
// https://chipmunk-physics.net/release/ChipmunkLatest-Docs/examples.html#CollisionCallbacks
// https://chipmunk-physics.net/release/ChipmunkLatest-API-Reference/
// https://github.com/slembcke/Chipmunk2D/tree/master/demo
//

#include <emscripten.h>
#include <stdlib.h>
#include <memory.h>

#include "shared.h"

cpFloat smoothStep(cpFloat input) {
	// Hermite interpolation (GLSL's smoothstep)
	// https://www.opengl.org/sdk/docs/man/html/smoothstep.xhtml
	return (input * input * ((cpFloat)3.0 - ((cpFloat)2.0 * input)));
}

#if CP_USE_DOUBLES
float smoothStepF(float input) {
	// Hermite interpolation (GLSL's smoothstep)
	// https://www.opengl.org/sdk/docs/man/html/smoothstep.xhtml
	return (input * input * (3.0f - (2.0f * input)));
}
#endif

cpBool beginCollision(cpArbiter* arb, struct cpSpace* space, cpDataPointer data) {
	// For this handler type A is CollisionBall and type B is CollisionObject
	cpShape* ball;
	cpShape* object;
	cpArbiterGetShapes(arb, &ball, &object);

	Level* const level = (Level*)cpSpaceGetUserData(space);
	int* const objectDestroyedThisFrame = level->objectDestroyedThisFrame;
	int* const objectVisibility = level->objectVisibility;
	const int ballIndex = (int)cpShapeGetUserData(ball);
	const int objectIndex = (int)cpShapeGetUserData(object);

	switch (level->objectType[objectIndex]) {
		case TypeBomb:
			if ((objectVisibility[ballIndex] & VisibilityAlive)) {
				objectDestroyedThisFrame[level->thisFrameDestroyedCount++] = ballIndex;
				objectVisibility[ballIndex] = VisibilityNone;
				level->ballsDestroyed++;
			}
			if ((objectVisibility[objectIndex] & VisibilityAlive)) {
				objectDestroyedThisFrame[level->thisFrameDestroyedCount++] = objectIndex;
				objectVisibility[objectIndex] = VisibilityNone;
			}
			// Prevent the rest of the collision handling because the bomb has been destroyed
			// as well as the first ball which touched it.
			return 0;
		case TypeCucumber:
			if ((objectVisibility[objectIndex] & VisibilityAlive)) {
				objectDestroyedThisFrame[level->thisFrameDestroyedCount++] = objectIndex;
				objectVisibility[objectIndex] = (255 << 8) | VisibilityVisible;
				level->cucumbersCollected++;
				level->cucumbersAnimating = 1;
				if (level->cucumbersCollected >= level->countByType[TypeCucumber])
					level->thisFrameAllCucumbersCollected = 1;
			}
			// Let the rest of the collision be processed because balls should bounce on cucumbers.
			return 1;
		default:
			if ((objectVisibility[ballIndex] & VisibilityAlive)) {
				objectDestroyedThisFrame[level->thisFrameDestroyedCount++] = 0x80000000 | ballIndex;
				objectVisibility[ballIndex] = VisibilityNone;
				level->ballsSaved++;
			}
			// Prevent the rest of the collision handling because the ball has been saved.
			return 0;
	}
}

Level* init(cpFloat height, cpFloat viewWidth, cpFloat viewHeight, int wallCount, const cpFloat* wallX0, const cpFloat* wallY0, const cpFloat* wallX1, const cpFloat* wallY1, int objectCount, const int* objectType, const cpFloat* objectX, const cpFloat* objectY, const cpFloat* objectRadius, int preview) {
	// For most of the structures you will use, Chipmunk uses a more or less standard and straightforward set of memory management functions. Take the cpSpace struct for example:
	//
	// cpSpaceNew() – Allocates and initializes a cpSpace struct. It calls cpSpaceAlloc() then cpSpaceInit().
	// cpSpaceFree(cpSpace *space) – Destroys and frees the cpSpace struct.
	// You are responsible for freeing any structs that you allocate. Chipmunk does not do reference counting or garbage collection. If you call a new function, you must call the matching free function or you will leak memory.
	//
	// Additionally if you need more control over allocation and initialization because you are allocating temporary structs on the stack, writting a language binding, or working in a low memory environment you can also use the following functions. Most people will never have any need to use these functions.
	//
	// cpSpaceAlloc() – Allocates but does not initialize a cpSpace struct. All allocation functions look more or less like this: return (cpSpace *)cpcalloc(1, sizeof(cpSpace)); You can write your own allocation functions if you want. It is not a requirement that the memory be zeroed.
	// cpSpaceInit(cpSpace *space) – Initializes a cpSpace struct.
	// cpSpaceDestroy(cpSpace *space) – Frees all memory allocated by cpSpaceInit(), but does not free the cpSpace struct itself.
	// Like calls to the new and free functions. Any memory allocated by an alloc function must be freed by cpfree() or similar. Any call to an init function must be matched with its destroy function.

	int firstIndexByType[TypeCount], countByType[TypeCount];

	for (int i = TypeCount - 1; i >= 0; i--) {
		firstIndexByType[i] = -1;
		countByType[i] = 0;
	}

	for (int i = 0; i < objectCount; i++) {
		if (firstIndexByType[objectType[i]] < 0)
			firstIndexByType[objectType[i]] = i;
		countByType[objectType[i]]++;
	}

	for (int i = TypeCount - 1; i >= 0; i--) {
		if (firstIndexByType[i] < 0)
			firstIndexByType[i] = 0;
	}

	if (!countByType[TypeBall])
		countByType[TypeBall]++;

	const int ballCount = countByType[TypeBall];

	// Create a single huge shared buffer instead of several unique smaller buffers.
	const unsigned int bufferSize = sizeof(Level) +
		(sizeof(cpShape*) * wallCount) + // wall
		(sizeof(cpShape*) * objectCount) + // objectShape
		(sizeof(cpBody*) * objectCount) + // objectBody
		(sizeof(int) * objectCount) + // objectType
		(sizeof(int) * objectCount) + // objectDestroyedThisFrame
		(sizeof(int) * objectCount) + // objectVisibility
		(sizeof(cpFloat) * objectCount) + // objectX
		(sizeof(cpFloat) * objectCount) + // objectY
		(sizeof(float) * ballCount) + // fragmentTime
		(sizeof(int) * (ballCount + VictoryFragmentCount)) + // fragmentSaved
		(sizeof(float) * ((ballCount * FragmentsPerBall) + VictoryFragmentCount)) + // fragmentX
		(sizeof(float) * ((ballCount * FragmentsPerBall) + VictoryFragmentCount)) + // fragmentY
		(sizeof(float) * ((ballCount * FragmentsPerBall) + VictoryFragmentCount)) + // fragmentVX
		(sizeof(float) * ((ballCount * FragmentsPerBall) + VictoryFragmentCount)) + // fragmentVY
		(15 * 16) // for the alignment
	;

	unsigned char* buffer = malloc(bufferSize);
	memset(buffer, 0, bufferSize);

	Level* const level = (Level*)alignBuffer(buffer, 0);
	level->actualPtr = buffer;
	buffer = alignBuffer((unsigned char*)level, sizeof(Level));

	level->wall = (cpShape**)buffer;
	buffer = alignBuffer(buffer, sizeof(cpShape*) * wallCount);

	level->objectShape = (cpShape**)buffer;
	buffer = alignBuffer(buffer, sizeof(cpShape*) * objectCount);

	level->objectBody = (cpBody**)buffer;
	buffer = alignBuffer(buffer, sizeof(cpShape*) * objectCount);

	level->objectType = (int*)buffer;
	buffer = alignBuffer(buffer, sizeof(int) * objectCount);

	level->objectDestroyedThisFrame = (int*)buffer;
	buffer = alignBuffer(buffer, sizeof(int) * objectCount);

	level->objectVisibility = (int*)buffer;
	buffer = alignBuffer(buffer, sizeof(int) * objectCount);

	level->objectX = (cpFloat*)buffer;
	buffer = alignBuffer(buffer, sizeof(cpFloat) * objectCount);

	level->objectY = (cpFloat*)buffer;
	buffer = alignBuffer(buffer, sizeof(cpFloat) * objectCount);

	level->fragmentTime = (float*)buffer;
	buffer = alignBuffer(buffer, sizeof(float) * ballCount);

	level->fragmentSaved = (int*)buffer;
	buffer = alignBuffer(buffer, sizeof(int) * (ballCount + VictoryFragmentCount));

	level->fragmentX = (float*)buffer;
	buffer = alignBuffer(buffer, sizeof(float) * ((ballCount * FragmentsPerBall) + VictoryFragmentCount));

	level->fragmentY = (float*)buffer;
	buffer = alignBuffer(buffer, sizeof(float) * ((ballCount * FragmentsPerBall) + VictoryFragmentCount));

	level->fragmentVX = (float*)buffer;
	buffer = alignBuffer(buffer, sizeof(float) * ((ballCount * FragmentsPerBall) + VictoryFragmentCount));

	level->fragmentVY = (float*)buffer;
	buffer = alignBuffer(buffer, sizeof(float) * ((ballCount * FragmentsPerBall) + VictoryFragmentCount));

	cpSpace* const space = cpSpaceNew();

	cpSpaceSetGravity(space, cpv(0, 0));
	cpSpaceSetDamping(space, (cpFloat)0.5);
	cpSpaceSetCollisionSlop(space, (cpFloat)0.5);
	cpSpaceSetUserData(space, (cpDataPointer)level);

	level->space = space;
	level->height = height;
	level->viewWidth = viewWidth;
	level->viewHeight = viewHeight;
	level->wallCount = wallCount;
	level->objectCount = objectCount;
	level->preview = preview;
	level->globalAlpha = 1.0f;
	memcpy(level->firstIndexByType, firstIndexByType, sizeof(int) * TypeCount);
	memcpy(level->countByType, countByType, sizeof(int) * TypeCount);

	cpShape* shape;
	cpBody* body;
	cpBody* staticBody = cpSpaceGetStaticBody(space);

	for (int i = 0; i < wallCount; i++) {
		shape = cpSegmentShapeNew(staticBody, cpv(wallX0[i] + (cpFloat)0.5, wallY0[i] + (cpFloat)0.5), cpv(wallX1[i] + (cpFloat)0.5, wallY1[i] + (cpFloat)0.5), (cpFloat)0.5);

		cpShapeSetElasticity(shape, (cpFloat)0.5);
		cpShapeSetFriction(shape, (cpFloat)0);
		cpShapeSetCollisionType(shape, CollisionWall);

		cpSpaceAddShape(space, shape);
		level->wall[i] = shape;
	}

	memcpy(level->objectType, objectType, sizeof(int) * objectCount);
	memcpy(level->objectX, objectX, sizeof(cpFloat) * objectCount);
	memcpy(level->objectY, objectY, sizeof(cpFloat) * objectCount);

	int* const objectVisibility = level->objectVisibility;
	const int cucumberCount = level->countByType[TypeCucumber];

	for (int i = objectCount - 1; i >= 0; i--) {
		switch (objectType[i]) {
			case TypeBall:
			case TypeBomb:
			case TypeCucumber:
				objectVisibility[i] = VisibilityAll;
				break;
			default:
				objectVisibility[i] = (cucumberCount ? VisibilityNone : VisibilityAll);
				break;
		}
	}

	for (int i = 0; i < objectCount; i++) {
		switch (objectType[i]) {
			case TypeBall:
				body = cpBodyNew(1, cpMomentForCircle(1, 0, objectRadius[i], cpvzero));
				cpSpaceAddBody(space, body);
				cpBodySetPosition(body, cpv(objectX[i], objectY[i]));
				shape = cpCircleShapeNew(body, objectRadius[i], cpvzero);
				cpShapeSetCollisionType(shape, CollisionBall);
				break;
			default:
				body = 0;//cpBodyNewStatic();
				shape = cpCircleShapeNew(staticBody, objectRadius[i], cpv(objectX[i], objectY[i]));
				cpShapeSetCollisionType(shape, CollisionObject);
				break;
		}

		cpShapeSetUserData(shape, (cpDataPointer)i);
		cpShapeSetElasticity(shape, (cpFloat)0.5);
		cpShapeSetFriction(shape, (cpFloat)0.5);

		if ((objectVisibility[i] & VisibilityAlive))
			cpSpaceAddShape(space, shape);

		level->objectShape[i] = shape;
		level->objectBody[i] = body;
	}

	cpCollisionHandler* const collisionHandler = cpSpaceAddCollisionHandler(space, CollisionBall, CollisionObject);
	collisionHandler->beginFunc = beginCollision;

	return level;
}

cpFloat* getViewYPtr(Level* level) {
	return &(level->viewY);
}

void* getFirstPropertyPtr(Level* level) {
	return &(level->pointerCursorAttached);
}

void viewResized(Level* level, cpFloat viewWidth, cpFloat viewHeight) {
	level->viewWidth = viewWidth;
	level->viewHeight = viewHeight;
}

void addFragments(int f, cpFloat baseX, cpFloat baseY, int saved, float* fragmentTime, float* fragmentX, float* fragmentY, float* fragmentVX, float* fragmentVY) {
	fragmentTime[f] = (saved ? FragmentsMaxTimeSaved : FragmentsMaxTime);
	for (int i = (f * FragmentsPerBall), c = FragmentsPerBall - 1; c >= 0; i++, c--) {
		fragmentX[i] = (float)baseX + ((float)rand() * 5.0f / (float)RAND_MAX);
		fragmentY[i] = (float)baseY + ((float)rand() * 5.0f / (float)RAND_MAX);
		const float a = (saved ?
			// Spread the fragments in a 45-degree cone when the ball is saved
			// (Since we want the fragments to go up, this means vy must be < 0,
			// therefore we make the angle vary between 270 +- (45 / 2))
			(4.3196898987f + ((float)rand() * 0.7853981634f / (float)RAND_MAX)) :
			((float)rand() * 6.2831853072f / (float)RAND_MAX)
		);
		const float v = 45.0f + ((float)rand() * 125.0f / (float)RAND_MAX);
		fragmentVX[i] = cosf(a) * v;
		fragmentVY[i] = sinf(a) * v;
	}
}

void prepareVictoryFragments(float viewWidth, float viewHeight, int turn, int ballCount, int* fragmentSaved, float* fragmentX, float* fragmentY, float* fragmentVX, float* fragmentVY) {
	const int first = turn * (VictoryFragmentCount >> 2);
	const float baseX = (float)(turn + 1) * (viewWidth / 5.0f);
	for (int i = ballCount + first, j = (ballCount * FragmentsPerBall) + first, c = (VictoryFragmentCount >> 2) - 1; c >= 0; i++, j++, c--) {
		fragmentSaved[i] = 1;
		fragmentX[j] = baseX + ((float)rand() * 5.0f / (float)RAND_MAX);
		fragmentY[j] = viewHeight + ((float)rand() * 5.0f / (float)RAND_MAX);
		const float a =
			// Spread the fragments in a 45-degree cone when the ball is saved
			// (Since we want the fragments to go up, this means vy must be < 0,
			// therefore we make the angle vary between 270 +- (45 / 2))
			4.3196898987f + ((float)rand() * 0.7853981634f / (float)RAND_MAX)
		;
		const float v = 25.0 + ((float)rand() * 150.0f / (float)RAND_MAX);
		fragmentVX[j] = cosf(a) * v;
		fragmentVY[j] = sinf(a) * v * 2.0f;
	}
}

void step(Level* level, cpFloat gravityX, cpFloat gravityY, int mode, int paused) {
	cpSpace* const space = level->space;

	const cpFloat deltaSeconds = level->deltaSeconds;
#if CP_USE_DOUBLES
	const float deltaSecondsF = (float)level->deltaSeconds;
#else
	#define deltaSecondsF deltaSeconds
#endif

	level->thisFrameAllCucumbersCollected = 0;
	level->thisFrameDestroyedCount = 0;

	if (!paused && !level->finished) {
		if (mode == Pointer) {
			if (level->pointerCursorAttached) {
				float dx = level->pointerCursorX - level->pointerCursorCenterX,
					dy = level->pointerCursorY - level->pointerCursorCenterY,
					d = (dx * dx) + (dy * dy);

				// Avoid using sqrt needlessly...
				// 4096 = 64 * 64
				if (d > 4096.0f) {
					// Faster than using atan, sin and cos ;)
					d = 64.0f / sqrtf(d);
					dx *= d;
					dy *= d;
					level->pointerCursorX = level->pointerCursorCenterX + dx;
					level->pointerCursorY = level->pointerCursorCenterY + dy;
					//d = 64; // Not necessary because we are simplifying the math below
				}
				// const maxAcc = 360;
				// gravityX = maxAcc * (d / 64) * (dx / d);
				// gravityY = maxAcc * (d / 64) * (dy / d);
				// Simplifying:
				// gravityX = maxAcc / 64 * dx;
				// gravityY = maxAcc / 64 * dy;
				// maxAcc / 64 = 5.625;
				gravityX = (cpFloat)(5.625f * dx);
				gravityY = (cpFloat)(5.625f * dy);
			} else {
				gravityX = (cpFloat)0.0;
				gravityY = (cpFloat)0.0;
			}
		} else {
			cpFloat d = (gravityX * gravityX) + (gravityY * gravityY);

			// Avoid using sqrt needlessly...
			// 25 = 5 * 5
			if (d > (cpFloat)25.0) {
				// Faster than using atan, sin and cos ;)
				d = (cpFloat)5.0 / cpfsqrt(d);
				gravityX *= d;
				gravityY *= d;
				//d = (cpFloat)5.0; // Not necessary because we are simplifying the math below
			}
			// const maxAcc = 360;
			// gravityX = maxAcc * (d / 5) * (gravityX / d);
			// gravityY = maxAcc * (d / 5) * (gravityY / d);
			// Simplifying:
			// gravityX = maxAcc / 5 * gravityX;
			// gravityY = maxAcc / 5 * gravityY;
			// maxAcc / 5 = 72;
			gravityX *= (cpFloat)72.0;
			gravityY *= (cpFloat)72.0;
		}
		cpSpaceSetGravity(space, cpv(gravityX, gravityY));
		cpSpaceStep(space, deltaSeconds);
	}

	cpShape** const objectShape = level->objectShape;
	cpBody** const objectBody = level->objectBody;
	const int* const objectType = level->objectType;
	int* const objectDestroyedThisFrame = level->objectDestroyedThisFrame;
	int* const objectVisibility = level->objectVisibility;
	cpFloat* const objectX = level->objectX;
	cpFloat* const objectY = level->objectY;
	float* const fragmentTime = level->fragmentTime;
	int* const fragmentSaved = level->fragmentSaved;
	float* const fragmentX = level->fragmentX;
	float* const fragmentY = level->fragmentY;
	float* const fragmentVX = level->fragmentVX;
	float* const fragmentVY = level->fragmentVY;

	for (int d = level->thisFrameDestroyedCount - 1; d >= 0; d--) {
		const int o = objectDestroyedThisFrame[d];
		const int i = o & 0x7fffffff;
		const int saved = o & 0x80000000;

		if (!cpSpaceContainsShape(space, objectShape[i]))
			continue;

		cpSpaceRemoveShape(space, objectShape[i]);
		if (objectBody[i])
			cpSpaceRemoveBody(space, objectBody[i]);

		const cpFloat x = objectX[i], y = objectY[i];

		switch (objectType[i]) {
			case TypeBall:
				// Look for an empty slot and add the fragments
				for (int f = level->countByType[TypeBall] - 1; f >= 0; f--) {
					if (fragmentTime[f] == 0.0f) {
						level->fragmentsAlive = 1;
						fragmentSaved[f] = saved;
						addFragments(f, x, y, saved, fragmentTime, fragmentX, fragmentY, fragmentVX, fragmentVY);
						break;
					}
				}
				break;

			case TypeBomb:
				// Add an impulse to all balls nearby
				for (int c = level->countByType[TypeBall], b = level->firstIndexByType[TypeBall]; c > 0; c--, b++) {
					if (!objectVisibility[b])
						continue;

					const cpVect p = cpBodyGetPosition(objectBody[b]);
					const cpFloat dx = p.x - x;
					const cpFloat dy = p.y - y;
					// Do not use sqrt just yet, because the extra velocity
					// we are adding is proportional to the square of the distance
					cpFloat dv = (dx * dx) + (dy * dy);
					if (dv < (cpFloat)0.1)
						dv = (cpFloat)0.1;
					const cpFloat d = cpfsqrt(dv);
					dv = 40000 / dv;
					// Faster than using atan, sin and cos ;)
					cpBodyApplyImpulseAtLocalPoint(objectBody[b], cpv(
						dv * dx / d,
						dv * dy / d
					), cpvzero);
				}
				break;
		}
	}

	if (level->fragmentsAlive) {
		level->fragmentsAlive = 0;
		const float dv = 150.0f * deltaSecondsF;
		for (int f = level->countByType[TypeBall] - 1; f >= 0; f--) {
			if (fragmentTime[f] != 0.0f) {
				fragmentTime[f] -= deltaSecondsF;
				if (fragmentTime[f] <= 0.0f) {
					fragmentTime[f] = 0.0f;
				} else {
					level->fragmentsAlive = 1;
					for (int i = (f * FragmentsPerBall), c = FragmentsPerBall - 1; c >= 0; i++, c--) {
						fragmentX[i] += fragmentVX[i] * deltaSecondsF;
						fragmentY[i] += fragmentVY[i] * deltaSecondsF;
					}
					if (fragmentSaved[f]) {
						for (int i = (f * FragmentsPerBall), c = FragmentsPerBall - 1; c >= 0; i++, c--)
							fragmentVY[i] += dv;
					}
				}
			}
		}
	}

	if (level->cucumbersAnimating) {
		level->cucumbersAnimating = 0;

		for (int c = level->countByType[TypeCucumber], i = level->firstIndexByType[TypeCucumber]; c > 0; c--, i++) {
			if ((objectVisibility[i] & 0xff00)) {
				const int alpha = (objectVisibility[i] >> 8) - 4;
				if (alpha <= 0) {
					objectVisibility[i] = VisibilityNone;
				} else {
					objectVisibility[i] = (alpha << 8) | VisibilityVisible;
					level->cucumbersAnimating = 1;
				}
			}
		}
	}

	if (level->thisFrameAllCucumbersCollected) {
		level->goalBlinkCount = 8;
		level->goalBlinkFrames = 0;

		for (int c = level->countByType[TypeGoal], i = level->firstIndexByType[TypeGoal]; c > 0; c--, i++) {
			objectVisibility[i] = VisibilityAll;

			if (objectBody[i])
				cpSpaceAddBody(space, objectBody[i]);
			cpSpaceAddShape(space, objectShape[i]);
		}
	} else if (level->goalBlinkCount) {
		level->goalBlinkFrames++;

		if (level->goalBlinkFrames >= 4) {
			level->goalBlinkCount--;
			level->goalBlinkFrames = 0;

			for (int c = level->countByType[TypeGoal], i = level->firstIndexByType[TypeGoal]; c > 0; c--, i++)
				objectVisibility[i] ^= VisibilityVisible;
		}
	}

	if (!level->finished) {
		if (!paused)
			level->totalElapsedMilliseconds += level->deltaMilliseconds;

		if ((level->ballsDestroyed + level->ballsSaved) >= level->countByType[TypeBall]) {
			if (level->ballsSaved > (level->countByType[TypeBall] >> 1)) {
				level->finished = FinishedVictory;
				level->victory = FinishedVictory;
				prepareVictoryFragments((float)level->viewWidth, (float)level->viewHeight, 0, level->countByType[TypeBall], fragmentSaved, fragmentX, fragmentY, fragmentVX, fragmentVY);
			} else {
				level->finished = FinishedLoss;
				level->victory = 0;
			}
		} else {
			cpFloat smallestBallY = (cpFloat)0x7fffffff, largestBallY = (cpFloat)0.0;
			for (int c = level->countByType[TypeBall], i = level->firstIndexByType[TypeBall]; c > 0; c--, i++) {
				if (!objectVisibility[i])
					continue;

				cpVect p = cpBodyGetPosition(objectBody[i]);
				objectX[i] = p.x;
				if (smallestBallY > p.y)
					smallestBallY = p.y;
				if (largestBallY < p.y)
					largestBallY = p.y;
				objectY[i] = p.y;

				p = cpBodyGetVelocity(objectBody[i]);
				cpFloat v = (p.x * p.x) + (p.y * p.y);
				// Avoid using sqrt needlessly...
				// 32400 = 180 * 180
				if (v > (cpFloat)32400.0) {
					// Faster than using atan, sin and cos ;)
					v = (cpFloat)180.0 / cpfsqrt(v);
					p.x *= v;
					p.y *= v;
					cpBodySetVelocity(objectBody[i], p);
				}
			}

			if (smallestBallY > largestBallY)
				smallestBallY = largestBallY;

			const cpFloat levelHeight = level->height, viewHeight = level->viewHeight;
			if (levelHeight <= viewHeight) {
				level->viewY = (cpFloat)0.0;
			} else {
				const cpFloat lastGravityYDirection = (gravityY ? gravityY : level->lastGravityYDirection),
					deadzone = (viewHeight * (cpFloat)0.125),
					ballY = (smallestBallY + largestBallY) * (cpFloat)0.5;

				cpFloat viewY = level->viewY,
					initialViewY = level->initialViewY,
					desiredViewY = level->desiredViewY,
					viewYStep = level->viewYStep,
					viewYDirection = level->viewYDirection;

				if (lastGravityYDirection <= (cpFloat)0.0) {
					if (ballY < (viewY + deadzone) || ballY > (viewY + viewHeight)) {
						if (viewYDirection > (cpFloat)-1.0) {
							viewYStep = (cpFloat)0.0;
							viewYDirection = (cpFloat)-1.0;
							initialViewY = viewY;
							desiredViewY = ballY - (deadzone * (cpFloat)6.0);
							if (desiredViewY < 0)
								desiredViewY = (cpFloat)0.0;
							else if ((desiredViewY + viewHeight) > levelHeight)
								desiredViewY = levelHeight - viewHeight;
						}
					}
				} else {
					if (ballY > (viewY + viewHeight - deadzone) || ballY < viewY) {
						if (viewYDirection < (cpFloat)1.0) {
							viewYStep = (cpFloat)0.0;
							viewYDirection = (cpFloat)1.0;
							initialViewY = viewY;
							desiredViewY = ballY - (deadzone * (cpFloat)2.0);
							if (desiredViewY < 0)
								desiredViewY = (cpFloat)0.0;
							else if ((desiredViewY + viewHeight) > levelHeight)
								desiredViewY = levelHeight - viewHeight;
						}
					}
				}

				if (viewYDirection) {
					viewYStep += deltaSeconds * (cpFloat)1.5;
					if (viewYStep >= (cpFloat)1.0) {
						viewY = desiredViewY;
						viewYStep = (cpFloat)0.0;
						viewYDirection = (cpFloat)0.0;
					} else {
						viewY = initialViewY + (smoothStep(viewYStep) * (desiredViewY - initialViewY));
					}
				}
				level->initialViewY = initialViewY;
				level->desiredViewY = desiredViewY;
				level->viewYDirection = viewYDirection;
				level->lastGravityYDirection = lastGravityYDirection;
				level->viewY = viewY;
				level->viewYStep = viewYStep;
			}
		}
	} else if (level->finishedFading == FinishedGame) {
		if ((level->finished & FinishedVictory)) {
			const float maxY = (float)level->viewHeight + 10.0f;
			const float dv = 150.0f * deltaSecondsF;
			for (int i = level->countByType[TypeBall], j = i * FragmentsPerBall, c = VictoryFragmentCount - 1; c >= 0; i++, j++, c--) {
				if (!fragmentSaved[i])
					continue;
				fragmentX[j] += fragmentVX[j] * deltaSecondsF;
				fragmentY[j] += fragmentVY[j] * deltaSecondsF;
				fragmentVY[j] += dv;
				if (fragmentY[j] > maxY)
					fragmentSaved[i] = 0;
			}

			const int frames = (1 + (level->finished >> 8)) & 0xFF;
			level->finished &= ~0xFF00;
			if (frames >= 15) {
				int turn = (1 + (level->finished >> 16)) & 0xFF;
				if (turn >= 18)
					turn = 0;
				level->finished = (level->finished & ~0xFF0000) | (turn << 16);
				if (turn < 4)
					prepareVictoryFragments((float)level->viewWidth, (float)level->viewHeight, turn, level->countByType[TypeBall], fragmentSaved, fragmentX, fragmentY, fragmentVX, fragmentVY);					
			} else {
				level->finished |= (frames << 8);
			}
		}
	}
}

void destroy(Level* level) {
	if (!level)
		return;

	cpSpace* const space = level->space;
	cpShape** const wall = level->wall;
	cpShape** const objectShape = level->objectShape;
	cpBody** const objectBody = level->objectBody;
	const int* const objectVisibility = level->objectVisibility;
	cpShape* shape;
	cpBody* body;

	for (int i = level->wallCount - 1; i >= 0; i--) {
		shape = wall[i];
		cpSpaceRemoveShape(space, shape);
		cpShapeFree(shape);
	}

	for (int i = level->objectCount - 1; i >= 0; i--) {
		shape = objectShape[i];

		if (shape) {
			if ((objectVisibility[i] & VisibilityAlive) && cpSpaceContainsShape(space, shape))
				cpSpaceRemoveShape(space, shape);
			cpShapeFree(shape);
		}

		body = objectBody[i];

		if (body) {
			if ((objectVisibility[i] & VisibilityAlive) && cpSpaceContainsBody(space, body))
				cpSpaceRemoveBody(space, body);
			cpBodyFree(body);
		}
	}

	cpSpaceFree(space);

	free(level->actualPtr);
}
