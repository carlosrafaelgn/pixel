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

const version = "20210112",
	isPWA = (window.location.href.indexOf("pwa") >= 0),
	isIOSOrSafari = (function () {
		// https://stackoverflow.com/q/9038625/3569421
		if ((navigator.userAgent.indexOf("Chrome") <= 0 && navigator.userAgent.indexOf("Safari") >= 0) ||
			(navigator.userAgent.indexOf("Mac") >= 0 && ("ontouchend" in document)))
			return true;
		switch (navigator.platform) {
			case "iPad Simulator":
			case "iPhone Simulator":
			case "iPod Simulator":
			case "iPad":
			case "iPhone":
			case "iPod":
				return true;
		}
		return false;
	})(),
	// Must be in sync with lib/shared.h
	baseWidth = 420,
	minHeight = baseWidth >> 1,
	maxHeight = baseWidth << 1,
	pixelRatio = (window.devicePixelRatio || 1),
	thumbnailWidth = baseWidth >> 2,
	thumbnailHeight = 56,
	iconSize = 12,
	iconRadius = iconSize >> 1,
	borderWidth = 1,
	buttonHeight = iconSize << 1,
	buttonMargin = iconSize >> 1,
	buttonLargeMargin = buttonHeight,
	buttonPadding = (buttonHeight - iconSize) >> 1,
	blinkLastCounter = 7,
	blinkSingleDurationMS = 75,
	blinkTotalDurationMS = (blinkLastCounter + 1) * blinkSingleDurationMS,
	
	scrollThumbWidth = 32,
	scrollThumbHeight = 48,
	toolbarAvailableHeight = buttonHeight,
	toolbarTotalHeight = toolbarAvailableHeight + borderWidth,
	// 0xaabbggrr
	rainbowColors = [
		0xffff0000, 0xffff4400, 0xffff8800, 0xffffcc00,
		0xffffff00, 0xffccff00, 0xff88ff00, 0xff44ff00,
		0xff00ff00, 0xff00ff44, 0xff00ff88, 0xff00ffcc,
		0xff00ffff, 0xff00ccff, 0xff0088ff, 0xff0044ff,
		0xff0000ff, 0xff4400ff, 0xff8800ff, 0xffcc00ff,
		0xffff00ff, 0xffff00cc, 0xffff0088, 0xffff0044
	],
	colors = [0xffff4400, 0xff880000, 0xff00ff00, 0xff008800, 0xff00eeff, 0xff007788, 0xff0088ff, 0xff003388, 0xff0000ff, 0xff000088, 0xffff00ff, 0xff880088, 0xffffffff, 0xff222222, 0xffffffff],
	colorsCss = ["#04f", "#008", "#0f0", "#080", "#fe0", "#870", "#f80", "#830", "#f00", "#800", "#f0f", "#808", "#fff", "#222", "#fff"];
