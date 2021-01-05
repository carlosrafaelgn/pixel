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

#include <emscripten.h>
#include <stdlib.h>
#include "math_fix_sincos.h"
#include <memory.h>

#include "shared.h"

// Must be in sync with scripts/gl/modelCoordinates.ts
typedef struct GLModelCoordinatesStruct {
	float left, top, right, bottom;
} GLModelCoordinates;

// Must be in sync with scripts/gl/textureCoordinates.ts
typedef struct GLTextureCoordinatesStruct {
	float leftTop, leftBottom, rightTop, rightBottom;
} GLTextureCoordinates;

// Must be in sync with scripts/level/levelSpriteSheet.ts
#define BackgroundCount 15
#define BackgroundScale 0.5f
#define BackgroundScaleRightShift 1

// Must be in sync with scripts/level/levelSpriteSheet.ts and scripts/gl/webGL.ts
typedef struct LevelSpriteSheetStruct {
	// Total count: 68
	const GLModelCoordinates levelModelCoordinates;

	const GLTextureCoordinates fullTextureCoordinates;
	const GLTextureCoordinates framebufferTextureCoordinates;

	const GLModelCoordinates backgroundModelCoordinates[BackgroundCount];
	const GLTextureCoordinates backgroundTextureCoordinates[8];

	const GLModelCoordinates levelObjectModelCoordinates;
	const GLTextureCoordinates levelObjectTextureCoordinatesByType[TypeCount];

	const GLModelCoordinates fullViewModelCoordinates;
	const GLTextureCoordinates explosionBgTextureCoordinates;
	const GLModelCoordinates fadeBgModelCoordinates;
	const GLTextureCoordinates fadeBgTextureCoordinates;
	const GLTextureCoordinates fadeBgSadTextureCoordinates;

	const GLModelCoordinates fragmentModelCoordinates[8];
	const GLTextureCoordinates fragmentTextureCoordinates[16];

	const GLModelCoordinates cursorCenterModelCoordinates;
	const GLTextureCoordinates cursorCenterTextureCoordinates;

	const GLModelCoordinates cursorTargetModelCoordinates;
	const GLTextureCoordinates cursorTargetTextureCoordinates;

	const GLModelCoordinates faceModelCoordinates;
	const GLTextureCoordinates sadFaceTextureCoordinates;
	const GLTextureCoordinates happyFaceTextureCoordinates;

	const GLTextureCoordinates clearBackgroundTextureCoordinates;

	float backgroundLastTime;
	float backgroundSpeed[BackgroundCount];
	float backgroundAngle[BackgroundCount];
} LevelSpriteSheet;

void draw(float* vertices, const GLModelCoordinates* modelCoordinates, float alpha, const GLTextureCoordinates* textureCoordinates, float viewX, float viewY) {
	// Apply all the transforms manually, which is equivalent to the following operations:
	//
	// Destination = Translation matrix * Source
	//
	// Order inside vertices:
	// Point 0 x (left)
	// Point 0 y (top)
	// Point 1 x (left)
	// Point 1 y (bottom)
	// Point 2 x (right)
	// Point 2 y (top)
	// Point 3 x (right)
	// Point 3 y (bottom)

	const float left = modelCoordinates->left + viewX;
	const float top = modelCoordinates->top + viewY;
	const float right = modelCoordinates->right + viewX;
	const float bottom = modelCoordinates->bottom + viewY;

	vertices[0 ] = left;
	vertices[1 ] = top;
	vertices[2 ] = textureCoordinates->leftTop + alpha;

	vertices[3 ] = left;
	vertices[4 ] = bottom;
	vertices[5 ] = textureCoordinates->leftBottom + alpha;

	vertices[6 ] = right;
	vertices[7 ] = top;
	vertices[8 ] = textureCoordinates->rightTop + alpha;

	vertices[9 ] = right;
	vertices[10] = bottom;
	vertices[11] = textureCoordinates->rightBottom + alpha;
}

void drawScale(float* vertices, const GLModelCoordinates* modelCoordinates, float alpha, const GLTextureCoordinates* textureCoordinates, float scale, float viewX, float viewY) {
	// Apply all the transforms manually, which is equivalent to the following operations:
	//
	// Destination = Translation matrix * Scale matrix * Source
	//
	// Order inside vertices:
	// Point 0 x (left)
	// Point 0 y (top)
	// Point 1 x (left)
	// Point 1 y (bottom)
	// Point 2 x (right)
	// Point 2 y (top)
	// Point 3 x (right)
	// Point 3 y (bottom)

	const float left = (modelCoordinates->left * scale) + viewX;
	const float top = (modelCoordinates->top * scale) + viewY;
	const float right = (modelCoordinates->right * scale) + viewX;
	const float bottom = (modelCoordinates->bottom * scale) + viewY;

	vertices[0 ] = left;
	vertices[1 ] = top;
	vertices[2 ] = textureCoordinates->leftTop + alpha;

	vertices[3 ] = left;
	vertices[4 ] = bottom;
	vertices[5 ] = textureCoordinates->leftBottom + alpha;

	vertices[6 ] = right;
	vertices[7 ] = top;
	vertices[8 ] = textureCoordinates->rightTop + alpha;

	vertices[9 ] = right;
	vertices[10] = bottom;
	vertices[11] = textureCoordinates->rightBottom + alpha;
}

void drawRotate(float* vertices, const GLModelCoordinates* modelCoordinates, float alpha, const GLTextureCoordinates* textureCoordinates, float radians, float viewX, float viewY) {
	// Apply all the transforms manually, which is equivalent to the following operations:
	//
	// Destination = Translation matrix * Rotation matrix * Source
	//
	// Order inside vertices:
	// Point 0 x (left)
	// Point 0 y (top)
	// Point 1 x (left)
	// Point 1 y (bottom)
	// Point 2 x (right)
	// Point 2 y (top)
	// Point 3 x (right)
	// Point 3 y (bottom)

	const float cosv = cosf(radians);
	const float sinv = sinf(radians);

	const float left = modelCoordinates->left;
	const float top = modelCoordinates->top;
	const float right = modelCoordinates->right;
	const float bottom = modelCoordinates->bottom;

	// The correct would be:
	// Destination x = (cos * Source x) - (sin * Source y)
	// Destination y = (sin * Source x) + (cos * Source y)
	// But, since positive y points downwards in the bitmap, but points upwards
	// in OpenGL/WebGL, we invert the sign of sin to make up for the difference.

	vertices[0 ] = (cosv * left) + (sinv * top) + viewX;
	vertices[1 ] = (cosv * top) - (sinv * left) + viewY;
	vertices[2 ] = textureCoordinates->leftTop + alpha;

	vertices[3 ] = (cosv * left) + (sinv * bottom) + viewX;
	vertices[4 ] = (cosv * bottom) - (sinv * left) + viewY;
	vertices[5 ] = textureCoordinates->leftBottom + alpha;

	vertices[6 ] = (cosv * right) + (sinv * top) + viewX;
	vertices[7 ] = (cosv * top) - (sinv * right) + viewY;
	vertices[8 ] = textureCoordinates->rightTop + alpha;

	vertices[9 ] = (cosv * right) + (sinv * bottom) + viewX;
	vertices[10] = (cosv * bottom) - (sinv * right) + viewY;
	vertices[11] = textureCoordinates->rightBottom + alpha;
}

void drawScaleRotate(float* vertices, const GLModelCoordinates* modelCoordinates, float alpha, const GLTextureCoordinates* textureCoordinates, float scale, float radians, float viewX, float viewY) {
	// Apply all the transforms manually, which is equivalent to the following operations:
	//
	// Destination = Translation matrix * Rotation matrix * Scale matrix * Source
	//
	// Order inside vertices:
	// Point 0 x (left)
	// Point 0 y (top)
	// Point 1 x (left)
	// Point 1 y (bottom)
	// Point 2 x (right)
	// Point 2 y (top)
	// Point 3 x (right)
	// Point 3 y (bottom)

	const float cosv = cosf(radians);
	const float sinv = sinf(radians);

	const float left = modelCoordinates->left * scale;
	const float top = modelCoordinates->top * scale;
	const float right = modelCoordinates->right * scale;
	const float bottom = modelCoordinates->bottom * scale;

	// The correct would be:
	// Destination x = (cos * Source x) - (sin * Source y)
	// Destination y = (sin * Source x) + (cos * Source y)
	// But, since positive y points downwards in the bitmap, but points upwards
	// in OpenGL/WebGL, we invert the sign of sin to make up for the difference.

	vertices[0 ] = (cosv * left) + (sinv * top) + viewX;
	vertices[1 ] = (cosv * top) - (sinv * left) + viewY;
	vertices[2 ] = textureCoordinates->leftTop + alpha;

	vertices[3 ] = (cosv * left) + (sinv * bottom) + viewX;
	vertices[4 ] = (cosv * bottom) - (sinv * left) + viewY;
	vertices[5 ] = textureCoordinates->leftBottom + alpha;

	vertices[6 ] = (cosv * right) + (sinv * top) + viewX;
	vertices[7 ] = (cosv * top) - (sinv * right) + viewY;
	vertices[8 ] = textureCoordinates->rightTop + alpha;

	vertices[9 ] = (cosv * right) + (sinv * bottom) + viewX;
	vertices[10] = (cosv * bottom) - (sinv * right) + viewY;
	vertices[11] = textureCoordinates->rightBottom + alpha;
}

// IntelliSense does not like this... :(
EM_JS(void, call_drawNative, (int rectangleCount), { drawNative(rectangleCount) });

#define incrementSmallRectangleCount() rectangleCount++; vertices += FloatsPerRectangle

#define flushRectangleCount() call_drawNative(rectangleCount); rectangleCount = 0; vertices = verticesOriginal

#define incrementRectangleCount() if (rectangleCount >= RectangleCapacity) { flushRectangleCount(); } incrementSmallRectangleCount()

LevelSpriteSheet* initLevelSpriteSheet() {
	LevelSpriteSheet* levelSpriteSheet = (LevelSpriteSheet*)malloc(sizeof(LevelSpriteSheet));
	memset(levelSpriteSheet, 0, sizeof(LevelSpriteSheet));

	levelSpriteSheet->backgroundSpeed[0] = -0.323448710595f;
	levelSpriteSheet->backgroundSpeed[1] = -0.25284227489f;
	levelSpriteSheet->backgroundSpeed[2] = -0.10375589028f;
	levelSpriteSheet->backgroundSpeed[3] = 0.083438027429f;
	levelSpriteSheet->backgroundSpeed[4] = 0.421777038452f;
	levelSpriteSheet->backgroundSpeed[5] = -0.08010490255f;
	levelSpriteSheet->backgroundSpeed[6] = 0.09233965204f;
	levelSpriteSheet->backgroundSpeed[7] = 0.11111773056f;
	levelSpriteSheet->backgroundSpeed[8] = -0.0986772336f;
	levelSpriteSheet->backgroundSpeed[9] = 0.34906371698f;
	levelSpriteSheet->backgroundSpeed[10] = -0.159196784014f;
	levelSpriteSheet->backgroundSpeed[11] = 0.077594377037f;
	levelSpriteSheet->backgroundSpeed[12] = 0.26219446536f;
	levelSpriteSheet->backgroundSpeed[13] = -0.48731208284f;
	levelSpriteSheet->backgroundSpeed[14] = -0.20998237505f;

	levelSpriteSheet->backgroundAngle[0] = 2.6801005635637623f;
	levelSpriteSheet->backgroundAngle[1] = 3.123733790682447f;
	levelSpriteSheet->backgroundAngle[2] = 4.688789377081845f;
	levelSpriteSheet->backgroundAngle[3] = 4.565122887861444f;
	levelSpriteSheet->backgroundAngle[4] = 4.849217466363887f;
	levelSpriteSheet->backgroundAngle[5] = 1.6958008847711774f;
	levelSpriteSheet->backgroundAngle[6] = 5.2925753510581925f;
	levelSpriteSheet->backgroundAngle[7] = 5.410561473565799f;
	levelSpriteSheet->backgroundAngle[8] = 4.092381111475114f;
	levelSpriteSheet->backgroundAngle[9] = 0.6224345811245753f;
	levelSpriteSheet->backgroundAngle[10] = 3.712125640626676f;
	levelSpriteSheet->backgroundAngle[11] = 5.199928075083743f;
	levelSpriteSheet->backgroundAngle[12] = 0.07661908925381677f;
	levelSpriteSheet->backgroundAngle[13] = 1.650516844887934f;
	levelSpriteSheet->backgroundAngle[14] = 3.3930304275987373f;

	return levelSpriteSheet;
}

void renderBackground(float* vertices, Level* level, LevelSpriteSheet* levelSpriteSheet, float baseHeight, float time, int animate) {
	float deltaMilliseconds = (animate ? (time - levelSpriteSheet->backgroundLastTime) : 0);
	if (deltaMilliseconds >= 33.0f)
		deltaMilliseconds = 33.0f;
	const float deltaSeconds = deltaMilliseconds * 0.001f;
	float* const backgroundAngle = levelSpriteSheet->backgroundAngle;
	float* const backgroundSpeed = levelSpriteSheet->backgroundSpeed;
	const GLModelCoordinates* const backgroundModelCoordinates = levelSpriteSheet->backgroundModelCoordinates;
	const GLTextureCoordinates* const backgroundTextureCoordinates = levelSpriteSheet->backgroundTextureCoordinates;
	const float centerX = baseWidth * (BackgroundScale * 0.5f);
	const float centerY = truncf(baseHeight * (BackgroundScale * 0.5f));

	levelSpriteSheet->backgroundLastTime = time;

	int rectangleCount = 0;
	vertices -= FloatsPerRectangle;

	incrementSmallRectangleCount();
	draw(vertices, &(levelSpriteSheet->fullViewModelCoordinates), 1.0f, &(levelSpriteSheet->clearBackgroundTextureCoordinates), 0, 0);

	for (int i = BackgroundCount - 1; i >= 0; i--) {
		float a = backgroundAngle[i] + (backgroundSpeed[i] * deltaSeconds * 0.25f);
		if (a >= 6.283185307f)
			a -= 6.283185307f;
		else if (a <= -6.283185307f)
			a += 6.283185307f;
		backgroundAngle[i] = a;

		incrementSmallRectangleCount();
		drawRotate(vertices, &(backgroundModelCoordinates[i]), 0.3f, &(backgroundTextureCoordinates[i & 7]), a, centerX, centerY);
	}

	if (level) {
		level->deltaMilliseconds = (int)deltaMilliseconds;
		level->deltaSeconds = (cpFloat)deltaSeconds;

		if (level->finished) {
			float fadeBgAlpha = level->fadeBgAlpha;
			fadeBgAlpha += (2.0f * level->deltaSeconds);
			if (fadeBgAlpha > 1.0f)
				fadeBgAlpha = 1.0f;
			level->fadeBgAlpha = fadeBgAlpha;
			fadeBgAlpha = smoothStepF(fadeBgAlpha);
			level->globalAlpha = 1.0f - (fadeBgAlpha * 0.8f);

			incrementSmallRectangleCount();
			draw(vertices, &(levelSpriteSheet->fullViewModelCoordinates), fadeBgAlpha, (level->finished & FinishedVictory) ? &(levelSpriteSheet->fadeBgTextureCoordinates) : &(levelSpriteSheet->fadeBgSadTextureCoordinates), 0, 0);
		}

		if (level->explosionBgAlpha != 0.0f) {
			incrementSmallRectangleCount();
			draw(vertices, &(levelSpriteSheet->fullViewModelCoordinates), level->explosionBgAlpha, &(levelSpriteSheet->explosionBgTextureCoordinates), 0, 0);
		}
	}

	call_drawNative(rectangleCount);
}

void renderCompactBackground(float* vertices, Level* level, LevelSpriteSheet* levelSpriteSheet, float time) {
	float deltaMilliseconds = time - levelSpriteSheet->backgroundLastTime;
	if (deltaMilliseconds >= 33.0f)
		deltaMilliseconds = 33.0f;
	const float deltaSeconds = deltaMilliseconds * 0.001f;

	levelSpriteSheet->backgroundLastTime = time;

	int rectangleCount = 0;
	vertices -= FloatsPerRectangle;

	incrementSmallRectangleCount();
	draw(vertices, &(levelSpriteSheet->fullViewModelCoordinates), 1.0f, (level->finished & FinishedVictory) ? &(levelSpriteSheet->fadeBgTextureCoordinates) : &(levelSpriteSheet->fadeBgSadTextureCoordinates), 0, 0);

	level->deltaMilliseconds = (int)deltaMilliseconds;
	level->deltaSeconds = (cpFloat)deltaSeconds;
	if (level->explosionBgAlpha != 0.0f) {
		incrementSmallRectangleCount();
		draw(vertices, &(levelSpriteSheet->fullViewModelCoordinates), level->explosionBgAlpha, &(levelSpriteSheet->explosionBgTextureCoordinates), 0, 0);
	}

	call_drawNative(rectangleCount);
}

int render(float* vertices, Level* level, const LevelSpriteSheet* levelSpriteSheet, float scaleFactor) {
	const GLModelCoordinates* const levelObjectModelCoordinates = &(levelSpriteSheet->levelObjectModelCoordinates);
	const GLTextureCoordinates* const levelObjectTextureCoordinatesByType = levelSpriteSheet->levelObjectTextureCoordinatesByType;
	const int* const objectType = level->objectType;
	const int* const objectVisibility = level->objectVisibility;
	const cpFloat* const objectX = level->objectX;
	const cpFloat* const objectY = level->objectY;
	const float viewY = (float)level->viewY * scaleFactor;
	const float globalAlpha = level->globalAlpha;

	int rectangleCount = 0;
	vertices -= FloatsPerRectangle;
	float* const verticesOriginal = vertices;

	int finishedThisFrame = 0;

	if (level->finished && !level->finishedFading) {
		if (level->fadeBgAlpha >= 2.0f) {
			level->fadeBgAlpha = 0.0f;
			level->finishedFading = (level->preview ? FinishedPreview : FinishedGame);
		} else if (level->fadeBgAlpha >= 1.0f) {
			// We need one extra frame to be sure the victory fragments
			// are only rendered when renderCompactBackground() is called
			// (for performance reasons on low-end browsers/devices)
			level->fadeBgAlpha = 2.0f;
			finishedThisFrame = FinishedThisFrame;
		}
	}

	if (level->cucumbersAnimating) {
		for (int i = level->objectCount - 1; i >= 0; i--) {
			const int visibility = objectVisibility[i];
			if ((visibility & VisibilityVisible) && !(visibility & 0xff00)) {
				incrementRectangleCount();
				draw(vertices, levelObjectModelCoordinates, globalAlpha, &(levelObjectTextureCoordinatesByType[objectType[i]]), truncf((objectX[i] * scaleFactor) + 0.5), truncf((objectY[i] * scaleFactor) + 0.5) - viewY);
			}
		}

		for (int c = level->countByType[TypeCucumber], i = level->firstIndexByType[TypeCucumber] + c - 1; c > 0; c--, i--) {
			const int visibility = objectVisibility[i];
			if ((visibility & VisibilityVisible)) {
				const int alphaI = visibility >> 8;
				if (alphaI) {
					const float alpha = (float)alphaI * 0.00390625f; // 1 / 256 = 0.00390625
					incrementRectangleCount();
					drawScale(vertices, levelObjectModelCoordinates, alpha, &(levelObjectTextureCoordinatesByType[objectType[i]]), 1.0f + ((1.0f - alpha) * 4.0f), truncf((objectX[i] * scaleFactor) + 0.5), truncf((objectY[i] * scaleFactor) + 0.5) - viewY);
				} else {
					incrementRectangleCount();
					draw(vertices, levelObjectModelCoordinates, globalAlpha, &(levelObjectTextureCoordinatesByType[objectType[i]]), truncf((objectX[i] * scaleFactor) + 0.5), truncf((objectY[i] * scaleFactor) + 0.5) - viewY);
				}
			}
		}
	} else {
		for (int i = level->objectCount - 1; i >= 0; i--) {
			if ((objectVisibility[i] & VisibilityVisible)) {
				incrementRectangleCount();
				draw(vertices, levelObjectModelCoordinates, globalAlpha, &(levelObjectTextureCoordinatesByType[objectType[i]]), truncf((objectX[i] * scaleFactor) + 0.5), truncf((objectY[i] * scaleFactor) + 0.5) - viewY);
			}
		}
	}

	if (level->fragmentsAlive) {
		const int ballCount = level->countByType[TypeBall];
		float* const fragmentTime = level->fragmentTime;
		int* const fragmentSaved = level->fragmentSaved;
		float* const fragmentX = level->fragmentX;
		float* const fragmentY = level->fragmentY;
		const GLModelCoordinates* const fragmentModelCoordinates = levelSpriteSheet->fragmentModelCoordinates;
		const GLTextureCoordinates* const fragmentTextureCoordinates = levelSpriteSheet->fragmentTextureCoordinates;

		float max = 0.0f;
		for (int f = ballCount - 1; f >= 0; f--) {
			if (max < fragmentTime[f] && !fragmentSaved[f])
				max = fragmentTime[f];
		}
		max = 2.0f * ((max / FragmentsMaxTime) - 0.5f);
		level->explosionBgAlpha = (max <= 0.0f ? 0.0f : max);

		for (int f = ballCount - 1; f >= 0; f--) {
			if (fragmentTime[f] != 0.0f) {
				const float alpha = smoothStepF(fragmentTime[f] / (fragmentSaved[f] ? FragmentsMaxTimeSaved : FragmentsMaxTime));
				const int j = (fragmentSaved[f] ? 8 : 0);
				for (int i = (f * FragmentsPerBall), c = FragmentsPerBall - 1; c >= 0; i++, c--) {
					incrementRectangleCount();
					draw(vertices, &(fragmentModelCoordinates[i & 7]), alpha, &(fragmentTextureCoordinates[j + (i & 7)]), /*truncf*/(fragmentX[i] * scaleFactor), /*truncf*/(fragmentY[i] * scaleFactor) - viewY);
				}
			}
		}
	}

	if (level->pointerCursorAttached) {
		incrementRectangleCount();
		draw(vertices, &(levelSpriteSheet->cursorCenterModelCoordinates), globalAlpha, &(levelSpriteSheet->cursorCenterTextureCoordinates), level->pointerCursorCenterX * scaleFactor, level->pointerCursorCenterY * scaleFactor);
		incrementRectangleCount();
		draw(vertices, &(levelSpriteSheet->cursorTargetModelCoordinates), globalAlpha, &(levelSpriteSheet->cursorTargetTextureCoordinates), truncf(level->pointerCursorX * scaleFactor), truncf(level->pointerCursorY * scaleFactor));
	}

	if (level->finishedFading == FinishedGame) {
		flushRectangleCount();

		float fadeBgAlpha = level->fadeBgAlpha;
		if (fadeBgAlpha < 1.0f) {
			fadeBgAlpha += (2.0f * level->deltaSeconds);
			if (fadeBgAlpha > 1.0f)
				fadeBgAlpha = 1.0f;
			level->fadeBgAlpha = fadeBgAlpha;
			fadeBgAlpha = smoothStepF(fadeBgAlpha);
		}

		if ((level->finished & FinishedVictory)) {
			const int* const fragmentSaved = level->fragmentSaved;
			float* const fragmentX = level->fragmentX;
			float* const fragmentY = level->fragmentY;
			const GLModelCoordinates* const fragmentModelCoordinates = levelSpriteSheet->fragmentModelCoordinates;
			const GLTextureCoordinates* const fragmentTextureCoordinates = levelSpriteSheet->fragmentTextureCoordinates;
			const float limitY = (float)level->viewHeight + 4.0f;

			for (int i = level->countByType[TypeBall], j = i * FragmentsPerBall, c = VictoryFragmentCount - 1; c >= 0; i++, j++, c--) {
				if (fragmentSaved[i]) {
					const float x = fragmentX[j];
					if (x <= -4.0f || x >= ((float)baseWidth + 4.0f))
						continue;
					const float y = fragmentY[j];
					if (y >= limitY)
						continue;
					incrementRectangleCount();
					draw(vertices, &(fragmentModelCoordinates[j & 7]), 1.0f, &(fragmentTextureCoordinates[8 + (j & 7)]), /*truncf*/(x * scaleFactor), /*truncf*/(y * scaleFactor));
				}
			}

			float victoryTime = level->victoryTime;
			victoryTime += (2.0f * level->deltaSeconds);
			while (victoryTime >= 2.0f)
				victoryTime -= 2.0f;
			level->victoryTime = victoryTime;

			incrementRectangleCount();
			draw(vertices, &(levelSpriteSheet->faceModelCoordinates), fadeBgAlpha, &(levelSpriteSheet->happyFaceTextureCoordinates), truncf((((float)baseWidth * 0.5f) + (((victoryTime > 1.0f ? (2.0f - victoryTime) : victoryTime) - 0.5f) * 20.0f)) * scaleFactor), truncf((75.0f - fabsf(sinf(3.1415926535f * victoryTime) * 25.0f)) * scaleFactor));
		} else {
			incrementRectangleCount();
			draw(vertices, &(levelSpriteSheet->faceModelCoordinates), fadeBgAlpha, &(levelSpriteSheet->sadFaceTextureCoordinates), truncf((float)baseWidth * scaleFactor * 0.5f), 50.0f * scaleFactor);
		}
	}

	call_drawNative(rectangleCount);

	return finishedThisFrame;
}
