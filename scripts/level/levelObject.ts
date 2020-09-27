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

class LevelObject {
	// Must be in sync with lib/shared.h
	public static readonly TypeBall = 0;
	public static readonly TypeGoal = 1;
	public static readonly TypeBomb = 2;
	public static readonly TypeCucumber = 3;
	public static readonly TypeCount = 4;
	public static readonly VisibilityNone = 0;
	public static readonly VisibilityVisible = 1;
	public static readonly VisibilityAlive = 2;
	public static readonly VisibilityAll = (LevelObject.VisibilityVisible | LevelObject.VisibilityAlive);
	public static readonly FragmentsPerBall = 64;
	public static readonly FragmentsMaxTime = 1.5;
	public static readonly FragmentsMaxTimeSaved = 3.5;
	public static readonly VictoryFragmentCount = 500;
	
	public static readonly LastType = LevelObject.TypeCucumber;
	public static readonly RadiusByType = [6, 5, 5, 6];
	public static readonly ImagesByType = [UISpriteSheet.Ball, UISpriteSheet.Goal, UISpriteSheet.Bomb, UISpriteSheet.Cucumber];

	public readonly type: number;
	public readonly radius: number;
	public x: number;
	public y: number;

	public constructor(type: any, x: any, y: any) {
		switch (type) {
			case LevelObject.TypeBall:
			case LevelObject.TypeGoal:
			case LevelObject.TypeBomb:
			case LevelObject.TypeCucumber:
				break;
			default:
				throw new Error("Invalid level object type: " + type);
				break;
		}
		this.type = parseInt(type);
		this.radius = LevelObject.RadiusByType[this.type];
		this.move(parseInt(x) || 0, parseInt(y) || 0);
	}

	public move(x: number, y: number): void {
		this.x = ((x <= iconRadius) ?
			iconRadius : ((x > (baseWidth - iconRadius)) ?
				(baseWidth - iconRadius) :
					x));
		this.y = ((y <= iconRadius) ?
			iconRadius : ((y > (maxHeight - iconRadius)) ?
				(maxHeight - iconRadius) :
					y));
	}

	public static revive(levelObject: any): LevelObject {
		return new LevelObject(levelObject.type, levelObject.x, levelObject.y);
	}
}
