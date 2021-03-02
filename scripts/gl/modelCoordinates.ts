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

// Must be in sync with lib/gl.c
class ModelCoordinates {
	public readonly ptr: number;

	public constructor(ptr: number) {
		this.ptr = ptr;
	}

	public setCoordinates(pivotX: number, pivotY: number, width: number, height: number): void {
		// sizeof(float) = 4
		const i = this.ptr >> 2;

		cLib.HEAPF32[i] = (pivotX ? -pivotX : 0);
		cLib.HEAPF32[i + 1] = (pivotY ? -pivotY : 0);
		cLib.HEAPF32[i + 2] = width - pivotX;
		cLib.HEAPF32[i + 3] = height - pivotY;
	}

	/*public get pivotX(): number {
		return -this.left;
	}

	public get pivotY(): number {
		return -this.top;
	}

	public get width(): number {
		return this.right - this.left;
	}

	public get height(): number {
		return this.bottom - this.top;
	}*/
}
