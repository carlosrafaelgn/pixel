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

interface FullscreenCall {
	(): Promise<void>;
}

class FullscreenControl {
	// There is a bunch of weird try/catch's here... I know... I don't care!
	// It's a jungle out there! Fullscreen is bizarre!

	public static requestFullscreen(element?: HTMLElement): void {
		if (!element)
			element = document.body;

		let ok = true,
			p: Promise<void> = null;

		try {
			if (element["requestFullscreen"])
				p = (element["requestFullscreen"] as FullscreenCall)();
			else if (element["webkitRequestFullscreen"])
				p = (element["webkitRequestFullscreen"] as FullscreenCall)();
			else if (element["mozRequestFullScreen"])
				p = (element["mozRequestFullScreen"] as FullscreenCall)();
			else if (element["msRequestFullscreen"])
				p = (element["msRequestFullscreen"] as FullscreenCall)();
			else
				ok = false;
		} catch (ex) {
			ok = false;
		}

		if (!ok && element !== document.body)
			FullscreenControl.requestFullscreen(null);
		else
			ignorePromise(p);
	}

	public static exitFullscreen(): void {
		let p: Promise<void> = null;

		try {
			if (document["exitFullscreen"])
				p = (document["exitFullscreen"] as FullscreenCall)();
			else if (document["webkitExitFullscreen"])
				p = (document["webkitExitFullscreen"] as FullscreenCall)();
			else if (document["mozExitFullScreen"])
				p = (document["mozExitFullScreen"] as FullscreenCall)();
			else if (document["msExitFullscreen"])
				p = (document["msExitFullscreen"] as FullscreenCall)();
		} catch (ex) {
			// Just ignore...
		}

		ignorePromise(p);
	}

	public static get fullscreenElement(): HTMLElement {
		let e: HTMLElement = null;

		try {
			// No else's here, indeed!
			if (("fullscreenElement" in document))
				e = document["fullscreenElement"] as HTMLElement;
			if (!e && ("webkitFullscreenElement" in document))
				e = document["webkitFullscreenElement"] as HTMLElement;
			if (!e && ("mozFullscreenElement" in document))
				e = document["mozFullscreenElement"] as HTMLElement;
			if (!e && ("msFullscreenElement" in document))
				e = document["msFullscreenElement"] as HTMLElement;
		} catch (ex) {
			// Just ignore...
		}

		return e;
	}

	public get onfullscreenchange(): EventListener {
		try {
			if (("onfullscreenchange" in document))
				return document["onfullscreenchange"] as EventListener;
			if (("onwebkitfullscreenchange" in document))
				return document["onwebkitfullscreenchange"] as EventListener;
			if (("onmozfullscreenchange" in document))
				return document["onmozfullscreenchange"] as EventListener;
			if (("onmsfullscreenchange" in document))
				return document["onmsfullscreenchange"] as EventListener;
		} catch (ex) {
			// Just ignore...
		}

		return null;
	}

	public static set onfullscreenchange(listener: EventListener) {
		try {
			if (("onfullscreenchange" in document))
				document["onfullscreenchange"] = listener;
			if (("onwebkitfullscreenchange" in document))
				(document["onwebkitfullscreenchange"] as EventListener) = listener;
			if (("onmozfullscreenchange" in document))
				(document["onmozfullscreenchange"] as EventListener) = listener;
			if (("onmsfullscreenchange" in document))
				(document["onmsfullscreenchange"] as EventListener) = listener;
		} catch (ex) {
			// Just ignore...
		}
	}

	public static toggleFullscreen(): void {
		FullscreenControl.fullscreenMode = !FullscreenControl.fullscreenMode;
	}

	public static get fullscreenMode(): boolean {
		return !!FullscreenControl.fullscreenElement;
	}

	public static set fullscreenMode(fullscreen: boolean) {
		if (fullscreen)
			FullscreenControl.requestFullscreen();
		else
			FullscreenControl.exitFullscreen();
	}
}
