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

	public requestFullscreen(element?: HTMLElement): void {
		if (!element)
			element = document.body;

		let ok = true,
			p: Promise<void> = null;

		try {
			if (("requestFullscreen" in element))
				p = (element["requestFullscreen"] as FullscreenCall)();
			else if (("webkitRequestFullscreen" in element))
				p = (element["webkitRequestFullscreen"] as FullscreenCall)();
			else if (("mozRequestFullScreen" in element))
				p = (element["mozRequestFullScreen"] as FullscreenCall)();
			else if (("msRequestFullScreen" in element))
				p = (element["msRequestFullScreen"] as FullscreenCall)();
			else
				ok = false;
		} catch (ex) {
			ok = false;
		}

		if (!ok && element !== document.body)
			this.requestFullscreen(null);
		else
			ignorePromise(p);
	}

	public exitFullscreen(): void {
		let p: Promise<void> = null;

		try {
			if (("exitFullscreen" in document))
				p = (document["exitFullscreen"] as FullscreenCall)();
			else if (("webkitExitFullscreen" in document))
				p = (document["webkitExitFullscreen"] as FullscreenCall)();
			else if (("mozExitFullScreen" in document))
				p = (document["mozExitFullScreen"] as FullscreenCall)();
			else if (("msExitFullscreen" in document))
				p = (document["msExitFullscreen"] as FullscreenCall)();
		} catch (ex) {
			// Just ignore...
		}

		ignorePromise(p);
	}

	public get fullscreenElement(): HTMLElement {
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

	public set onfullscreenchange(listener: EventListener) {
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

	public toggleFullscreen(): void {
		this.fullscreenMode = !this.fullscreenMode;
	}

	public get fullscreenMode(): boolean {
		return !!this.fullscreenElement;
	}

	public set fullscreenMode(fullscreen: boolean) {
		if (fullscreen)
			this.requestFullscreen();
		else
			this.exitFullscreen();
	}
}

const fullscreenControl = new FullscreenControl();
