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

interface CLib {
	HEAP8: Uint8Array;
	HEAPF32: Float32Array;

	stackSave(): number;
	stackAlloc(size: number): number;
	stackRestore(stackPtr: number): void;

	_allocateImageInfo(width: number, height: number): number;
	_getImageInfoData(imageInfo: number): number;
	_getImageInfoPoints(imageInfo: number): number;
	_freeImageInfo(imageInfo: number): void;
	_processImage(imageInfo: number): number;

	_allocateBuffer(size: number): number;
	_freeBuffer(bufferPtr: number): void;

	_draw(verticesPtr: number, modelCoordinatesPtr: number, alpha: number, textureCoordinatesPtr: number, viewX: number, viewY: number): void;
	_drawScale(verticesPtr: number, modelCoordinatesPtr: number, alpha: number, textureCoordinatesPtr: number, scale: number, viewX: number, viewY: number): void;
	_drawRotate(verticesPtr: number, modelCoordinatesPtr: number, alpha: number, textureCoordinatesPtr: number, radians: number, viewX: number, viewY: number): void;
	_drawScaleRotate(verticesPtr: number, modelCoordinatesPtr: number, alpha: number, textureCoordinatesPtr: number, scale: number, radians: number, viewX: number, viewY: number): void;

	_init(height: number, viewWidth: number, viewHeight: number, wallCount: number, wallX0Ptr: number, wallY0Ptr: number, wallX1Ptr: number, wallY1Ptr: number, objectCount: number, objectTypePtr: number, objectXPtr: number, objectYPtr: number, objectRadiusPtr: number, preview: boolean): number;
	_getViewYPtr(levelPtr: number): number;
	_getFirstPropertyPtr(levelPtr: number): number;
	_viewResized(levelPtr: number, viewWidth: number, viewHeight: number): void;
	_step(levelPtr: number, gravityX: number, gravityY: number, mode: number, paused: boolean): void;
	_destroy(levelPtr: number): void;

	_initLevelSpriteSheet(): number;
	_renderBackground(verticesPtr: number, levelPtr: number, levelSpriteSheetPtr: number, baseHeight: number, time: number, animate: boolean): void;
	_renderCompactBackground(verticesPtr: number, levelPtr: number, levelSpriteSheetPtr: number, time: number): void;
	_render(verticesPtr: number, levelPtr: number, levelSpriteSheetPtr: number, scaleFactor: number): number;
}
