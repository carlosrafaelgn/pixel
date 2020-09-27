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
// This TypeScript version was adapted by me based on
// 
// https://github.com/rafgraph/fscreen
// 
// The MIT License (MIT)
// 
// Copyright (c) 2017 Rafael Pedicini
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

"use strict";

interface FullscreenControl {
	requestFullscreen(element?: HTMLElement): void;
	exitFullscreen(): void;
	toggleFullscreen(): void;
	readonly fullscreenPseudoClass: string;
	addEventListener(type: string, handler: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
	removeEventListener(type: string, handler: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
	readonly fullscreenEnabled: boolean;
	fullscreenMode: boolean;
	readonly fullscreenElement: HTMLElement;
	onfullscreenchange: EventListener;
	onfullscreenerror: EventListener;
}

const fullscreenControl = (function (): FullscreenControl {
	const key = {
		fullscreenEnabled: 0,
		fullscreenElement: 1,
		requestFullscreen: 2,
		exitFullscreen: 3,
		fullscreenchange: 4,
		fullscreenerror: 5,
		fullscreen: 6
	};

	const webkit = [
		"webkitFullscreenEnabled",
		"webkitFullscreenElement",
		"webkitRequestFullscreen",
		"webkitExitFullscreen",
		"webkitfullscreenchange",
		"webkitfullscreenerror",
		"-webkit-full-screen",
	];

	const moz = [
		"mozFullScreenEnabled",
		"mozFullScreenElement",
		"mozRequestFullScreen",
		"mozCancelFullScreen",
		"mozfullscreenchange",
		"mozfullscreenerror",
		"-moz-full-screen",
	];

	const ms = [
		"msFullscreenEnabled",
		"msFullscreenElement",
		"msRequestFullscreen",
		"msExitFullscreen",
		"MSFullscreenChange",
		"MSFullscreenError",
		"-ms-fullscreen",
	];

	const vendor = (
		("fullscreenEnabled" in document && Object.keys(key)) ||
		(webkit[0] in document && webkit) ||
		(moz[0] in document && moz) ||
		(ms[0] in document && ms) ||
		[]
	);

	const boundExitFullscreen: () => void = document[vendor[key.exitFullscreen]].bind(document);

	return {
		requestFullscreen(element?: HTMLElement): void {
			(element || document.body)[vendor[key.requestFullscreen]]();
		},
		exitFullscreen(): void {
			boundExitFullscreen();
		},
		toggleFullscreen(): void {
			this.fullscreenMode = !this.fullscreenMode;
		},
		get fullscreenPseudoClass(): string {
			return ":" + vendor[key.fullscreen];
		},
		addEventListener(type: string, handler: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
			document.addEventListener(vendor[key[type]], handler, options);
		},
		removeEventListener(type: string, handler: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
			document.removeEventListener(vendor[key[type]], handler, options);
		},
		get fullscreenEnabled(): boolean {
			return !!document[vendor[key.fullscreenEnabled]];
		},
		get fullscreenMode(): boolean {
			return !!document[vendor[key.fullscreenElement]];
		},
		set fullscreenMode(fullscreen: boolean) {
			if (fullscreen)
				this.requestFullscreen();
			else
				this.exitFullscreen();
		},
		get fullscreenElement(): HTMLElement {
			return document[vendor[key.fullscreenElement]] as HTMLElement;
		},
		get onfullscreenchange(): EventListener {
			return document[`on${vendor[key.fullscreenchange]}`.toLowerCase()] as EventListener;
		},
		set onfullscreenchange(handler: EventListener) {
			document[`on${vendor[key.fullscreenchange]}`.toLowerCase()] = handler;
		},
		get onfullscreenerror(): EventListener {
			return document[`on${vendor[key.fullscreenerror]}`.toLowerCase()] as EventListener;
		},
		set onfullscreenerror(handler: EventListener) {
			document[`on${vendor[key.fullscreenerror]}`.toLowerCase()] = handler;
		}
	} as FullscreenControl;
})();
