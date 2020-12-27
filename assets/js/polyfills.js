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

if (!Function.prototype.bind) {
	Function.prototype.bind = function (_this) {
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply#Description
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments
		const originalFunction = this;
		if (arguments.length <= 1)
			return function () {
				return originalFunction.apply(_this, arguments);
			};
		const slice = Array.prototype.slice, originalExtraArguments = slice.call(arguments, 1);
		return function () {
			return originalFunction.apply(_this, originalExtraArguments.concat(slice.call(arguments)));
		};
	};
}

if (!Array.prototype.fill) {
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fill
	Array.prototype.fill = function (value, start, end) {
		const length = this.length | 0;

		start |= 0;
		end = ((end === undefined) ? length : (end | 0));
		end = ((end < 0) ? Math.max(length + end, 0) : Math.min(end, length));

		let i = ((start < 0) ? Math.max(length + start, 0) : Math.min(start, length));

		while (i < end)
			this[i++] = value;

		return this;
	};
}
