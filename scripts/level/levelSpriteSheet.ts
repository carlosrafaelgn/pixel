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

"use strict";

class LevelSpriteSheet {
	// Must be in sync with the vertex shader in scripts/gl/webGL.ts
	public static readonly TextureWidth = 128;
	public static readonly TextureHeight = 128;

	public static readonly CursorCenterSize = 25;
	public static readonly CursorTargetSize = 25;

	public static LevelSpriteSheetPtr = 0;

	// Must be in sync with lib/gl.c
	private static readonly BackgroundCount = 15;
	public static readonly BackgroundScale = 0.5;
	public static readonly BackgroundScaleRightShift = 1;
	public static LevelModelCoordinates: ModelCoordinates = null;
	public static FullTextureCoordinates: TextureCoordinates = null;
	public static FramebufferTextureCoordinates: TextureCoordinates = null;
	private static readonly BackgroundModelCoordinates: ModelCoordinates[] = new Array(LevelSpriteSheet.BackgroundCount);
	private static readonly BackgroundTextureCoordinates: TextureCoordinates[] = new Array(8);
	private static LevelObjectModelCoordinates: ModelCoordinates = null;
	private static readonly LevelObjectTextureCoordinatesByType: TextureCoordinates[] = new Array(LevelObject.TypeCount);
	public static FullViewModelCoordinates: ModelCoordinates = null;
	private static ExplosionBgTextureCoordinates: TextureCoordinates = null;
	private static FadeBgModelCoordinates: ModelCoordinates = null;
	private static FadeBgTextureCoordinates: TextureCoordinates = null;
	private static FadeBgSadTextureCoordinates: TextureCoordinates = null;
	private static readonly FragmentModelCoordinates: ModelCoordinates[] = new Array(8);
	private static readonly FragmentTextureCoordinates: TextureCoordinates[] = new Array(16);
	private static CursorCenterModelCoordinates: ModelCoordinates = null;
	private static CursorCenterTextureCoordinates: TextureCoordinates = null;
	private static CursorTargetModelCoordinates: ModelCoordinates = null;
	private static CursorTargetTextureCoordinates: TextureCoordinates = null;
	private static FaceModelCoordinates: ModelCoordinates = null;
	private static SadFaceTextureCoordinates: TextureCoordinates = null;
	private static HappyFaceTextureCoordinates: TextureCoordinates = null;

	private static image: HTMLImageElement = null;
	private static scaleFactor = 0;

	private static allocateCoordinates(): void {
		const ptrInc = (4 * 4); // sizeof(float) * 4 (left, top, right, bottom)

		// Must be in sync with lib/gl.c
		let ptr = cLib._initLevelSpriteSheet();

		LevelSpriteSheet.LevelSpriteSheetPtr = ptr;

		LevelSpriteSheet.LevelModelCoordinates = new ModelCoordinates(ptr);
		ptr += ptrInc;

		LevelSpriteSheet.FullTextureCoordinates = new TextureCoordinates(ptr);
		ptr += ptrInc;

		LevelSpriteSheet.FramebufferTextureCoordinates = new TextureCoordinates(ptr);
		ptr += ptrInc;

		for (let i = 0; i < LevelSpriteSheet.BackgroundModelCoordinates.length; i++) {
			LevelSpriteSheet.BackgroundModelCoordinates[i] = new ModelCoordinates(ptr);
			ptr += ptrInc;
		}
		for (let i = 0; i < LevelSpriteSheet.BackgroundTextureCoordinates.length; i++) {
			LevelSpriteSheet.BackgroundTextureCoordinates[i] = new TextureCoordinates(ptr);
			ptr += ptrInc;
		}
		
		LevelSpriteSheet.LevelObjectModelCoordinates = new ModelCoordinates(ptr);
		ptr += ptrInc;
		for (let i = 0; i < LevelSpriteSheet.LevelObjectTextureCoordinatesByType.length; i++) {
			LevelSpriteSheet.LevelObjectTextureCoordinatesByType[i] = new TextureCoordinates(ptr);
			ptr += ptrInc;
		}

		LevelSpriteSheet.FullViewModelCoordinates = new ModelCoordinates(ptr);
		ptr += ptrInc;
		LevelSpriteSheet.ExplosionBgTextureCoordinates = new TextureCoordinates(ptr);
		ptr += ptrInc;
		LevelSpriteSheet.FadeBgModelCoordinates = new ModelCoordinates(ptr);
		ptr += ptrInc;
		LevelSpriteSheet.FadeBgTextureCoordinates = new TextureCoordinates(ptr);
		ptr += ptrInc;
		LevelSpriteSheet.FadeBgSadTextureCoordinates = new TextureCoordinates(ptr);
		ptr += ptrInc;

		for (let i = 0; i < LevelSpriteSheet.FragmentModelCoordinates.length; i++) {
			LevelSpriteSheet.FragmentModelCoordinates[i] = new ModelCoordinates(ptr);
			ptr += ptrInc;
		}
		for (let i = 0; i < LevelSpriteSheet.FragmentTextureCoordinates.length; i++) {
			LevelSpriteSheet.FragmentTextureCoordinates[i] = new TextureCoordinates(ptr);
			ptr += ptrInc;
		}

		LevelSpriteSheet.CursorCenterModelCoordinates = new ModelCoordinates(ptr);
		ptr += ptrInc;
		LevelSpriteSheet.CursorCenterTextureCoordinates = new TextureCoordinates(ptr);
		ptr += ptrInc;
	
		LevelSpriteSheet.CursorTargetModelCoordinates = new ModelCoordinates(ptr);
		ptr += ptrInc;
		LevelSpriteSheet.CursorTargetTextureCoordinates = new TextureCoordinates(ptr);
		ptr += ptrInc;

		LevelSpriteSheet.FaceModelCoordinates = new ModelCoordinates(ptr);
		ptr += ptrInc;
		LevelSpriteSheet.SadFaceTextureCoordinates = new TextureCoordinates(ptr);
		ptr += ptrInc;
		LevelSpriteSheet.HappyFaceTextureCoordinates = new TextureCoordinates(ptr);
		ptr += ptrInc;
	}

	private static setupFixedCoordinates(): void {
		LevelSpriteSheet.FullTextureCoordinates.setCoordinates(0, 0, LevelSpriteSheet.TextureWidth, LevelSpriteSheet.TextureHeight);

		const backgroundScale = LevelSpriteSheet.BackgroundScale;
		const backgroundScaleRightShift = LevelSpriteSheet.BackgroundScaleRightShift;
		const backgroundWidth = (baseWidth << 1) >> backgroundScaleRightShift;
		const backgroundHeight = Math.ceil(Math.sqrt(2) * (baseWidth >> backgroundScaleRightShift));

		LevelSpriteSheet.BackgroundModelCoordinates[0].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 20 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundModelCoordinates[1].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 19 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundModelCoordinates[2].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 18 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundModelCoordinates[3].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 17 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundModelCoordinates[4].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 16 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundModelCoordinates[5].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 15 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundModelCoordinates[6].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 14 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundModelCoordinates[7].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 13 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundModelCoordinates[8].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 12 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundModelCoordinates[9].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 10 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundModelCoordinates[10].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 8 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundModelCoordinates[11].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 6 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundModelCoordinates[12].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 4 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundModelCoordinates[13].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 2 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundModelCoordinates[14].setCoordinates(backgroundWidth >> backgroundScaleRightShift, -0.02 * 0 * backgroundScale * baseWidth, backgroundWidth, backgroundHeight);
		LevelSpriteSheet.BackgroundTextureCoordinates[0].setCoordinates(3, 53, 2, 72);
		LevelSpriteSheet.BackgroundTextureCoordinates[1].setCoordinates(9, 53, 2, 72);
		LevelSpriteSheet.BackgroundTextureCoordinates[2].setCoordinates(15, 53, 2, 72);
		LevelSpriteSheet.BackgroundTextureCoordinates[3].setCoordinates(21, 53, 2, 72);
		LevelSpriteSheet.BackgroundTextureCoordinates[4].setCoordinates(27, 53, 2, 72);
		LevelSpriteSheet.BackgroundTextureCoordinates[5].setCoordinates(33, 53, 2, 72);
		LevelSpriteSheet.BackgroundTextureCoordinates[6].setCoordinates(39, 53, 2, 72);
		LevelSpriteSheet.BackgroundTextureCoordinates[7].setCoordinates(45, 53, 2, 72);

		LevelSpriteSheet.LevelObjectTextureCoordinatesByType[LevelObject.TypeBall].setCoordinates(2, 2, iconSize, iconSize);
		LevelSpriteSheet.LevelObjectTextureCoordinatesByType[LevelObject.TypeGoal].setCoordinates(18, 2, iconSize, iconSize);
		LevelSpriteSheet.LevelObjectTextureCoordinatesByType[LevelObject.TypeBomb].setCoordinates(34, 2, iconSize, iconSize);
		LevelSpriteSheet.LevelObjectTextureCoordinatesByType[LevelObject.TypeCucumber].setCoordinates(50, 2, iconSize, iconSize);

		LevelSpriteSheet.ExplosionBgTextureCoordinates.setCoordinates(36, 20, 8, 8);
		LevelSpriteSheet.FadeBgTextureCoordinates.setCoordinates(52, 20, 8, 8);
		LevelSpriteSheet.FadeBgSadTextureCoordinates.setCoordinates(52, 36, 8, 8);

		LevelSpriteSheet.FragmentTextureCoordinates[0].setCoordinates(2, 17, 3, 3);
		LevelSpriteSheet.FragmentTextureCoordinates[1].setCoordinates(7, 17, 3, 3);
		LevelSpriteSheet.FragmentTextureCoordinates[2].setCoordinates(12, 17, 3, 4);
		LevelSpriteSheet.FragmentTextureCoordinates[3].setCoordinates(2, 22, 3, 3);
		LevelSpriteSheet.FragmentTextureCoordinates[4].setCoordinates(7, 22, 3, 4);
		LevelSpriteSheet.FragmentTextureCoordinates[5].setCoordinates(12, 23, 3, 4);
		LevelSpriteSheet.FragmentTextureCoordinates[6].setCoordinates(2, 27, 3, 4);
		LevelSpriteSheet.FragmentTextureCoordinates[7].setCoordinates(7, 28, 3, 3);
		LevelSpriteSheet.FragmentTextureCoordinates[8].setCoordinates(16 + 2, 17, 3, 3);
		LevelSpriteSheet.FragmentTextureCoordinates[9].setCoordinates(16 + 7, 17, 3, 3);
		LevelSpriteSheet.FragmentTextureCoordinates[10].setCoordinates(16 + 12, 17, 3, 4);
		LevelSpriteSheet.FragmentTextureCoordinates[11].setCoordinates(16 + 2, 22, 3, 3);
		LevelSpriteSheet.FragmentTextureCoordinates[12].setCoordinates(16 + 7, 22, 3, 4);
		LevelSpriteSheet.FragmentTextureCoordinates[13].setCoordinates(16 + 12, 23, 3, 4);
		LevelSpriteSheet.FragmentTextureCoordinates[14].setCoordinates(16 + 2, 27, 3, 4);
		LevelSpriteSheet.FragmentTextureCoordinates[15].setCoordinates(16 + 7, 28, 3, 3);

		LevelSpriteSheet.CursorCenterTextureCoordinates.setCoordinates(66, 2, LevelSpriteSheet.CursorCenterSize, LevelSpriteSheet.CursorCenterSize);
	
		LevelSpriteSheet.CursorTargetTextureCoordinates.setCoordinates(98, 2, LevelSpriteSheet.CursorTargetSize, LevelSpriteSheet.CursorTargetSize);

		LevelSpriteSheet.SadFaceTextureCoordinates.setCoordinates(96, 32, 31, 31);
		LevelSpriteSheet.HappyFaceTextureCoordinates.setCoordinates(96, 80, 31, 31);
	}

	public static recreateIfNecessary(): void {
		const s = scaleFactor,
			w = baseWidth * s,
			h = baseHeight * s;

		if (LevelSpriteSheet.scaleFactor === scaleFactor && LevelSpriteSheet.LevelModelCoordinates) {
			LevelSpriteSheet.FullViewModelCoordinates.setCoordinates(0, 0, w, h);
			return;
		}

		LevelSpriteSheet.scaleFactor = scaleFactor;

		if (!LevelSpriteSheet.LevelModelCoordinates) {
			LevelSpriteSheet.allocateCoordinates();
			LevelSpriteSheet.setupFixedCoordinates();
		}

		LevelSpriteSheet.LevelObjectModelCoordinates.setCoordinates(iconRadius * s, iconRadius * s, iconSize * s, iconSize * s);

		LevelSpriteSheet.FullViewModelCoordinates.setCoordinates(0, 0, w, h);
		LevelSpriteSheet.FadeBgModelCoordinates.setCoordinates(0, 0, 8 * s, 8 * s);

		LevelSpriteSheet.FragmentModelCoordinates[0].setCoordinates(1 * s, 1 * s, 3 * s, 3 * s);
		LevelSpriteSheet.FragmentModelCoordinates[1].setCoordinates(1 * s, 1 * s, 3 * s, 3 * s);
		LevelSpriteSheet.FragmentModelCoordinates[2].setCoordinates(1 * s, 2 * s, 3 * s, 4 * s);
		LevelSpriteSheet.FragmentModelCoordinates[3].setCoordinates(1 * s, 1 * s, 3 * s, 3 * s);
		LevelSpriteSheet.FragmentModelCoordinates[4].setCoordinates(1 * s, 2 * s, 3 * s, 4 * s);
		LevelSpriteSheet.FragmentModelCoordinates[5].setCoordinates(1 * s, 2 * s, 3 * s, 4 * s);
		LevelSpriteSheet.FragmentModelCoordinates[6].setCoordinates(1 * s, 2 * s, 3 * s, 4 * s);
		LevelSpriteSheet.FragmentModelCoordinates[7].setCoordinates(1 * s, 1 * s, 3 * s, 3 * s);

		LevelSpriteSheet.CursorCenterModelCoordinates.setCoordinates((LevelSpriteSheet.CursorCenterSize * 0.5 * s) | 0, (LevelSpriteSheet.CursorCenterSize * 0.5 * s) | 0, LevelSpriteSheet.CursorCenterSize * s, LevelSpriteSheet.CursorCenterSize * s);

		LevelSpriteSheet.CursorTargetModelCoordinates.setCoordinates((LevelSpriteSheet.CursorTargetSize * 0.5 * s) | 0, (LevelSpriteSheet.CursorTargetSize * 0.5 * s) | 0, LevelSpriteSheet.CursorTargetSize * s, LevelSpriteSheet.CursorTargetSize * s);

		LevelSpriteSheet.FaceModelCoordinates.setCoordinates(15 * s, 15 * s, 31 * s, 31 * s);
	}

	public static async preload(): Promise<void> {
		if (!LevelSpriteSheet.image)
			LevelSpriteSheet.image = await loadImage("assets/images/sheet.png");
	}

	public static createTexture(gl: WebGL): Texture {
		return new Texture(gl, LevelSpriteSheet.image);
	}
}
