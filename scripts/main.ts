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

const viewClasses = {
	"EditorView": EditorView,
	"GameView": GameView,
	"SelectionView": SelectionView,
	"TitleView": TitleView
};

let cLib: CLib = null, scaleFactor = -1, baseHeight = minHeight, baseLeftCss = 0, baseTopCss = 0,
	baseWidthCss = baseWidth, baseHeightCss = minHeight, maxHeightCss = minHeight,
	thumbnailWidthCss = thumbnailWidth + "px", thumbnailHeightCss = thumbnailHeight + "px",
	buttonHeightCss = buttonHeight + "px", borderWidthCss = borderWidth + "px",
	toolbarAvailableHeightCss = toolbarAvailableHeight + "px",
	toolbarTotalHeightCss = toolbarTotalHeight + "px", iconSizeCss = iconSize + "px",
	buttonMarginCss = buttonMargin + "px", buttonLargeMarginCss = buttonLargeMargin + "px", buttonPaddingCss = buttonPadding + "px",
	fontSizeCss = "16px", // Press Start 2P uses multiples of 16
	installationPrompt: Event = null,
	landscapeWarning: HTMLDivElement = null;

function ignorePromise(p: any): void {
	try {
		const nop = () => {};
		if (p && p.then)
			p.then(nop, nop);
	} catch (ex) {
		// Just ignore...
	}
}

function cancelEvent(e: Event): boolean {
	if (e) {
		if ("isCancelled" in e)
			(e as any).isCancelled = true;
		if ("preventDefault" in e)
			e.preventDefault();
		if ("stopPropagation" in e)
			e.stopPropagation();
	}
	return false;
}

function format2(x: number): string {
	return (x < 10 ? ("0" + x) : x.toString());
}

function css(modelCoord: number): string {
	// Returns a CSS-compatible coordinate based on a model coordinate
	return ((modelCoord | 0) * scaleFactor / pixelRatio) + "px";
}

function cssNumber(modelCoord: number): number {
	// Returns a CSS-compatible coordinate based on a model coordinate
	return (modelCoord | 0) * scaleFactor / pixelRatio;
}

function model(cssCoord: number): number {
	// Returns a model coordinate based on a css coordinate
	return (cssCoord * pixelRatio / scaleFactor) | 0;
}

function modelFrac(cssCoord: number): number {
	// Returns a model coordinate based on a css coordinate
	return cssCoord * pixelRatio / scaleFactor;
}

function smoothStep(input: number): number {
	// Hermite interpolation (GLSL's smoothstep)
	// https://www.opengl.org/sdk/docs/man/html/smoothstep.xhtml
	return (input * input * (3.0 - (2.0 * input)));
}

function handleButtonBlink(args: [number, HTMLElement]): void {
	const count = args[0], button = args[1];
	if (count > 0 && count < buttonBlinkLastCounter) {
		button.style.visibility = ((count & 1) ? "" : "hidden");
		args[0] = count + 1;
	} else {
		const lastInterval = parseInt(button.getAttribute("data-blink-interval"));
		if (lastInterval)
			clearInterval(lastInterval);
		button.style.visibility = "";
		button.setAttribute("data-blink-interval", "");
	}
}

function prepareButtonBlink(button: HTMLElement, insideModal: boolean, callback: ButtonCallback): void {
	button.onclick = (e) => {
		if (View.loading || View.fading || (!insideModal && Modal.visible) || !callback(e))
			return;
		const lastInterval = parseInt(button.getAttribute("data-blink-interval"));
		if (lastInterval)
			clearInterval(lastInterval);
		button.style.visibility = "hidden";
		button.setAttribute("data-blink-interval", setInterval(handleButtonBlink, buttonBlinkSingleDurationMS, [1, button]).toString())
	};
}

function zeroObject(o: any): void {
	for (let p in o) {
		switch (typeof o[p]) {
			case "function":
				break;
			case "boolean":
				o[p] = false;
				break;
			case "number":
				o[p] = 0;
				break;
			default:
				const v = o[p];
				if (Array.isArray(v))
					(v as Array<Object>).fill(null);
				o[p] = null;
				break;
		}
	}
}

function adjustWindowSize(): void {
	let widthCss = window.innerWidth,
		heightCss = window.innerHeight;

	if (document.documentElement && ("clientWidth" in document.documentElement)) {
		widthCss = document.documentElement.clientWidth;
		heightCss = document.documentElement.clientHeight;
	}

	if (isIOSOrSafari) {
		let bodyRect: DOMRect = null;

		if (document.documentElement && ("getBoundingClientRect" in document.documentElement))
			bodyRect = document.documentElement.getBoundingClientRect();
		else if (("getBoundingClientRect" in document.body))
			bodyRect = document.body.getBoundingClientRect();

		if (bodyRect) {
			widthCss = bodyRect.right - bodyRect.left;
			heightCss = bodyRect.bottom - bodyRect.top;
		}
	}

	const widthPx = widthCss * pixelRatio,
		heightPx = heightCss * pixelRatio,
		lastScaleFactor = scaleFactor,
		lastBaseHeight = baseHeight;

	scaleFactor = 0;
	let baseWidthPx = 0, baseHeightPx = 0;
	for (;;) {
		scaleFactor++;
		baseWidthPx = baseWidth * scaleFactor;
		baseHeightPx = (heightPx > baseWidthPx ? baseWidthPx : heightPx);
		baseHeightPx = (baseHeight = Math.ceil(baseHeightPx / scaleFactor)) * scaleFactor;
		if (baseHeight < minHeight || (baseWidth * scaleFactor) > widthPx) {
			if (scaleFactor > 1)
				scaleFactor--;
			baseWidthPx = baseWidth * scaleFactor;
			baseHeightPx = (heightPx > baseWidthPx ? baseWidthPx : heightPx);
			baseHeight = Math.ceil(baseHeightPx / scaleFactor);
			if (baseHeight < minHeight)
				baseHeight = minHeight;
			baseHeightPx = baseHeight * scaleFactor;
			break;
		}
	}

	baseWidthCss = baseWidthPx / pixelRatio;
	baseHeightCss = baseHeightPx / pixelRatio;

	const baseLeftPx = ((widthPx - baseWidthPx) * 0.5) | 0;
	baseLeftCss = baseLeftPx / pixelRatio;
	let baseTopPx = ((heightPx - baseHeightPx) * 0.5) | 0;
	if (baseTopPx < 0) baseTopPx = 0;
	baseTopCss = baseTopPx / pixelRatio;

	main.style.left = baseLeftCss + "px";
	main.style.top = baseTopCss + "px";

	const transform = `scale(${Math.ceil(widthCss * 0.25)},${Math.ceil(heightCss * 0.25)})`;
	cover.style["webkitTransform"] = transform;
	cover.style["mozTransform"] = transform;
	cover.style.transform = transform;

	if (heightCss > widthCss || baseTopCss) {
		if (!landscapeWarning) {
			landscapeWarning = document.createElement("div");
			landscapeWarning.style.pointerEvents = "none";
			landscapeWarning.style.fontSize = "2em";
			landscapeWarning.style.textAlign = "center";
			landscapeWarning.style.position = "absolute";
			landscapeWarning.style.left = "0";
			landscapeWarning.style.top = "0.5em";
			landscapeWarning.style.width = "100%";
			landscapeWarning.style.zIndex = "9999";
			landscapeWarning.textContent = Strings.LandscapeWarning;
			document.body.appendChild(landscapeWarning);
		}
	} else if (landscapeWarning) {
		document.body.removeChild(landscapeWarning);
		landscapeWarning = null;
	}

	if (scaleFactor !== lastScaleFactor || baseHeight !== lastBaseHeight) {
		main.style.width = baseWidthCss + "px";
		main.style.height = baseHeightCss + "px";

		maxHeightCss = cssNumber(maxHeight);
		thumbnailWidthCss = css(thumbnailWidth);
		thumbnailHeightCss = css(thumbnailHeight);
		buttonHeightCss = css(buttonHeight);
		borderWidthCss = css(borderWidth);
		toolbarAvailableHeightCss = css(toolbarAvailableHeight);
		toolbarTotalHeightCss = css(toolbarTotalHeight);
		iconSizeCss = css(iconSize);
		buttonMarginCss = css(buttonMargin);
		buttonLargeMarginCss = css(buttonLargeMargin);
		buttonPaddingCss = css(buttonPadding);
		fontSizeCss = css(8);
		document.body.style.fontSize = fontSizeCss;

		LevelSpriteSheet.recreateIfNecessary();
		UISpriteSheet.windowResized();
		View.windowResized(true);
		Modal.windowResized();
	} else {
		View.windowResized(false);
	}
}

function beforeInstallPrompt(e: Event): void {
	if (("preventDefault" in e))
		e.preventDefault();
	installationPrompt = e;
}

let fullscreenChangedTimeout = 0;

function fullscreenChanged(e: Event): void {
	if (fullscreenChangedTimeout) {
		clearTimeout(fullscreenChangedTimeout);
		fullscreenChangedTimeout = 0;
	}

	try {
		if (fullscreenControl.fullscreenMode)
			fullscreenChangedTimeout = setTimeout(fullscreenChangedHandler, 150);
		else
			fullscreenChangedHandler();
	} catch (ex) {
		// Just ignore...
	}
}

function fullscreenChangedHandler(): void {
	fullscreenChangedTimeout = 0;
	// https://www.w3.org/TR/screen-orientation/#locking-to-a-specific-orientation-and-unlocking
	// https://developer.mozilla.org/en-US/docs/Web/API/Screen/orientation
	// https://developer.mozilla.org/en-US/docs/Web/API/Screen/lockOrientation
	if (screen["mozLockOrientation"] && screen["mozUnlockOrientation"]) {
		try {
			if (fullscreenControl.fullscreenMode) {
				if (screen["mozLockOrientation"]("landscape-primary"))
					return;
			} else {
				if (screen["mozUnlockOrientation"]())
					return;
			}
		} catch (ex) {
			// Just ignore...
		}
	}
	if (screen["msLockOrientation"] && screen["msUnlockOrientation"]) {
		try {
			if (fullscreenControl.fullscreenMode) {
				if (screen["msLockOrientation"]("landscape-primary"))
					return;
			} else {
				if (screen["msUnlockOrientation"]())
					return;
			}
		} catch (ex) {
			// Just ignore...
		}
	}
	if (screen.orientation && screen.orientation.lock && screen.orientation.unlock) {
		try {
			ignorePromise(fullscreenControl.fullscreenMode ?
				screen.orientation.lock("landscape-primary") :
				// Are there browsers out there returning a promise here?!?!
				screen.orientation.unlock());
		} catch (ex) {
			// For those browsers that do not support lock(), but
			// fail to return a proper Promise...
		}
	}
}

async function setup(): Promise<void> {
	Strings.init();

	const allPromises = Promise.all([
		LevelSpriteSheet.preload(),
		window["CLib"]() as Promise<CLib>
	]);

	View.loading = true;

	if (("serviceWorker" in navigator) && !androidWrapper) {
		window.addEventListener("beforeinstallprompt", beforeInstallPrompt);

		navigator.serviceWorker.register("sw.js");
	}

	ControlMode.init();

	let n: void;
	[n, cLib] = await allPromises;

	View.initGL();

	window.onpopstate = View.windowHistoryStatePopped;

	window.onresize = adjustWindowSize;

	adjustWindowSize();

	if (!androidWrapper)
		fullscreenControl.onfullscreenchange = fullscreenChanged;

	View.loading = false;

	View.createInitialView();

	const levels = document.createElement("script");
	levels.async = true;
	levels.setAttribute("type", "text/javascript");
	levels.setAttribute("charset", "utf-8");
	levels.setAttribute("src", "assets/js/levels.js");
	document.body.appendChild(levels);
}

window["pixelStepMAIN"] = true;
if (window["pixelCheckSetup"])
	window["pixelCheckSetup"]();
