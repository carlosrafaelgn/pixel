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

class ScrollContainer {
	private parent: HTMLElement;
	private container: HTMLDivElement;
	private scrollContainer: HTMLDivElement;
	private scrollThumb: HTMLSpanElement;
	private pointerHandler: PointerHandler | null;
	private containerPointerHandler: PointerHandler | null;

	private boundDocumentWheel: any;

	private pointerLastY: number;
	private containerTopCss: number;
	private availableHeight: number;
	private contentHeight: number;
	private scrollContainerTopCss: number;
	private scrollThumbTopPercent: number;
	private scrollThumbTopCss: number;
	private scrollThumbInitialTopCss: number;
	private scrollThumbOnly: boolean;
	private ignoreScroll: boolean;

	public constructor(parent: HTMLElement | null, scrollThumbOnly: boolean = false, extraContainerClass: string | null = null, container: HTMLDivElement | null = null) {
		if (container) {
			this.parent = container.parentNode as HTMLElement;
			this.container = container;
		} else if (parent) {
			this.parent = parent;
			this.container = document.createElement("div") as HTMLDivElement;
			parent.appendChild(this.container);
		} else {
			throw new Error("Both parent and container are null");
		}

		this.container.className = (scrollThumbOnly ? "container" : "container scrollable-container");
		if (!scrollThumbOnly)
			this.parent.style.overflow = "hidden"; // To hide the ScrollContainer in older browsers

		this.scrollContainer = document.createElement("div") as HTMLDivElement;
		this.scrollContainer.className = (extraContainerClass ? ("scroll-container " + extraContainerClass) : "scroll-container");
		this.container.appendChild(this.scrollContainer);

		this.scrollThumb = UISpriteSheet.create(UISpriteSheet.ScrollThumb, this.parent);
		this.scrollThumb.className = "scroll-thumb";

		this.pointerHandler = null;
		this.containerPointerHandler = null;
	
		this.boundDocumentWheel = this.documentWheel.bind(this);

		this.pointerLastY = 0;
		this.containerTopCss = 0;
		this.availableHeight = 0;
		this.contentHeight = 0;
		this.scrollContainerTopCss = 0;
		this.scrollThumbTopPercent = 0;
		this.scrollThumbTopCss = 0;
		this.scrollThumbInitialTopCss = 0;
		this.scrollThumbOnly = scrollThumbOnly;
		this.ignoreScroll = false;

		if (!scrollThumbOnly)
			this.container.onscroll = this.containerScroll.bind(this);
	}

	public get topCss(): number {
		return this.scrollContainerTopCss;
	}

	public get element(): HTMLDivElement {
		return this.container;
	}

	public get containerElement(): HTMLDivElement {
		return this.scrollContainer;
	}

	public resize(top: number, height: number): void {
		this.containerTopCss = cssNumber(top);
		this.availableHeight = height;
		if (this.availableHeight < 1)
			this.availableHeight = 1;

		this.container.style.top = css(top);
		this.container.style.height = css(height);

		UISpriteSheet.resize(this.scrollThumb);

		const rect = this.scrollContainer.getBoundingClientRect();
		this.contentHeight = model(rect.bottom - rect.top);
		if (this.contentHeight < 1)
			this.contentHeight = 1;

		const display = ((this.contentHeight <= this.availableHeight) ? "none" : "");
		if (this.scrollThumb.style.display !== display)
			this.scrollThumb.style.display = display;

		this.scrollTo(this.scrollThumbTopPercent);
	}

	public attach(): void {
		this.pointerHandler = new PointerHandler(this.scrollThumb, this.mouseDown.bind(this), this.mouseMove.bind(this));

		// https://developers.google.com/web/updates/2017/01/scrolling-intervention
		document.addEventListener("wheel", this.boundDocumentWheel, { capture: true, passive: false });
	}

	public detach(): void {
		if (this.pointerHandler) {
			this.pointerHandler.destroy();
			this.pointerHandler = null;
		}

		document.removeEventListener("wheel", this.boundDocumentWheel, true);
	}

	private adjustScrollUI(percent: number, topCss: number = -1): void {
		if (this.contentHeight <= this.availableHeight || percent <= 0) {
			percent = 0;
			topCss = 0;
		} else {
			if (percent > 1)
				percent = 1;
			if (topCss < 0)
				topCss = cssNumber(percent * (this.availableHeight - scrollThumbHeight));
		}

		this.scrollThumbTopPercent = percent;
		this.scrollThumbTopCss = topCss;
		this.scrollThumb.style.top = (this.containerTopCss + topCss) + "px";
		this.scrollContainerTopCss = ((this.contentHeight <= this.availableHeight) ? 0 : cssNumber(-this.scrollThumbTopPercent * (this.contentHeight - this.availableHeight)));
	}

	public scrollTo(percent: number, topCss: number = -1): void {
		this.adjustScrollUI(percent, topCss);

		if (this.scrollThumbOnly) {
			this.scrollContainer.style.marginTop = this.scrollContainerTopCss + "px";
		} else {
			this.ignoreScroll = true;
			this.container.scrollTop = -this.scrollContainerTopCss;
		}
	}

	private mouseDown(e: MouseEvent): boolean {
		const rect = this.container.getBoundingClientRect();

		this.pointerLastY = e.clientY - rect.top;
		this.scrollThumbInitialTopCss = this.scrollThumbTopCss;

		return true;
	}

	private mouseMove(e: MouseEvent): void {
		const rect = this.container.getBoundingClientRect(),
			y = e.clientY - rect.top;

		let topCss = this.scrollThumbInitialTopCss + (y - this.pointerLastY);
		if (topCss < 0)
			topCss = 0;
		else if ((model(topCss) + scrollThumbHeight) > this.availableHeight)
			topCss = cssNumber(this.availableHeight - scrollThumbHeight);
		else
			topCss = ((topCss * pixelRatio) | 0) / pixelRatio;

		if (topCss !== this.scrollThumbTopCss)
			this.scrollTo(model(topCss) / (this.availableHeight - scrollThumbHeight), topCss);
	}

	private documentWheel(e: WheelEvent): boolean {
		if (!Modal.visible) {
			if (e.deltaY < 0)
				this.scrollTo(this.scrollThumbTopPercent - 0.1);
			else if (e.deltaY > 0)
				this.scrollTo(this.scrollThumbTopPercent + 0.1);

			return cancelEvent(e);
		}
		return false;
	}

	private containerScroll(): void {
		if (this.ignoreScroll) {
			this.ignoreScroll = false;
			return;
		}

		const delta = (this.contentHeight - this.availableHeight);

		this.adjustScrollUI((delta <= 0 || !this.availableHeight) ? 0 : (model(this.container.scrollTop) / delta));
	}
}
