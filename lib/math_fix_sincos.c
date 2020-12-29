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

#include "math_fix_sincos.h"

// Based on https://stackoverflow.com/a/28050328/3569421

static const double fix_2pi = 6.283185307179586476925286766559; // 2.0 * PI
static const double fix_tp = 0.15915494309189533576888376337251; // 1.0 / (2.0 * PI)
static const float fix_pi2 = 1.5707963267948966192313216916398f; // PI / 2.0

float fix_cosf(float f) {
	double x = (double)f;
	while (x < 0.0)
		x += fix_2pi;
	while (x >= fix_2pi)
		x -= fix_2pi;
    x *= fix_tp;
    x -= .25 + floor(x + .25);
    x *= 16.0 * (fabs(x) - .5);
    x += .225 * x * (fabs(x) - 1.0);
    return (float)x;
}

float fix_sinf(float f) {
	return fix_cosf(f - fix_pi2);
}
