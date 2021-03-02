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

class Pivot {
	public static readonly HorizontalLeft = 1;
	public static readonly HorizontalCenter = 2;
	public static readonly HorizontalRight = 4;

	public static readonly VerticalTop = 8;
	public static readonly VerticalCenter = 16;
	public static readonly VerticalBottom = 32;

	public static pivotX(alignment: number, width: number): number {
		if ((alignment & Pivot.HorizontalLeft))
			return 0;
		else if ((alignment & Pivot.HorizontalCenter))
			return (width >> 1);
		else if ((alignment & Pivot.HorizontalRight))
			return width;

		throw new Error("Invalid alignment: " + alignment);
	}

	public static pivotY(alignment: number, height: number): number {
		if ((alignment & Pivot.VerticalTop))
			return 0;
		else if ((alignment & Pivot.VerticalCenter))
			return (height >> 1);
		else if ((alignment & Pivot.VerticalBottom))
			return height;

		throw new Error("Invalid alignment: " + alignment);
	}
}
