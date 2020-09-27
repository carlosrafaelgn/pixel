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

class TextureCoordinates {
	// Must be in sync with the vertex shader in scripts/gl/webGL.ts
	// The behavior must be in sync with all draw() functions in lib/gl.c
	public readonly ptr: number;

	public constructor(ptr: number) {
		this.ptr = ptr;
	}

	public setCoordinates(left: number, top: number, width: number, height: number): void {
		// sizeof(float) = 4
		const i = this.ptr >> 2,
			right = left + width,
			bottom = top + height;

		// MSB                         LSB
		// 8 bits for x, 8 bits for y, 1 bit (integer) + up to 7 fractional bits for alpha
		cLib.HEAPF32[i] = (left << 9) | (top << 1);
		cLib.HEAPF32[i + 1] = (left << 9) | (bottom << 1);
		cLib.HEAPF32[i + 2] = (right << 9) | (top << 1);
		cLib.HEAPF32[i + 3] = (right << 9) | (bottom << 1);
	}
}
