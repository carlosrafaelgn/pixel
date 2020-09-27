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

class UISpriteSheet {
	private static readonly TextureWidth = 96;
	private static readonly TextureHeight = 112;
	private static BackgroundSizeCss: string = null;

	public static readonly SheetId = "data-sheet-id";

	public static readonly Ball = 0x00000101;
	public static readonly Goal = 0x00010101;
	public static readonly Bomb = 0x00020101;
	public static readonly Cucumber = 0x00030101;
	public static readonly Edit = 0x00040101;
	public static readonly Question = 0x00050101;
	public static readonly DeviceH = 0x01000101;
	public static readonly DeviceV = 0x01010101;
	public static readonly Hand = 0x01020101;
	public static readonly Fullscreen = 0x01030101;
	public static readonly Restart = 0x01040101;
	public static readonly Open = 0x01050101;
	public static readonly Accept = 0x02000101;
	public static readonly AcceptGreen = 0x02010101;
	public static readonly Clear = 0x02020101;
	public static readonly ClearRed = 0x02030101;
	public static readonly Back = 0x02040101;
	public static readonly Border = 0x02050101;
	public static readonly LineWidth0 = 0x03000101;
	public static readonly LineWidth1 = 0x03010101;
	public static readonly LineWidth2 = 0x03020101;
	public static readonly LineWidth3 = 0x03030101;
	public static readonly ScrollThumb = 0x03040302;
	public static readonly Eraser = 0x04000101;
	public static readonly Rainbow = 0x04010101;
	public static readonly Pause = 0x04020101;
	public static readonly Play = 0x04030101;
	public static readonly PlayGreen = 0x05000101;
	public static readonly Exit = 0x05010101;
	public static readonly Menu = 0x05020101;
	public static readonly Download = 0x05030101;
	public static readonly Success = 0x06000101;
	public static readonly Error = 0x06010101;
	public static readonly Trophy = 0x06020101;
	public static readonly Clock = 0x06030101;

	public static resize(element: HTMLSpanElement): void {
		const id = parseInt(element.getAttribute(UISpriteSheet.SheetId)),
			width = id & 0xFF,
			height = (id >>> 8) & 0xFF,
			left = (id >>> 16) & 0xFF,
			top = (id >>> 24) & 0xFF;

		element.style.backgroundSize = UISpriteSheet.BackgroundSizeCss;
		if (width === 1) {
			element.style.width = iconSizeCss;
			element.style.height = iconSizeCss;
			element.style.backgroundPositionX = css(-((left << 4) + 2));
			element.style.backgroundPositionY = css(-((top << 4) + 2));
		} else {
			element.style.width = css((id === UISpriteSheet.ScrollThumb) ? 24 : (width << 4));
			element.style.height = css(height << 4);
			element.style.backgroundPositionX = css((id === UISpriteSheet.ScrollThumb) ? -72 : -(left << 4));
			element.style.backgroundPositionY = css(-(top << 4));
		}
	}

	public static change(element: HTMLSpanElement, id: number): void {
		const width = id & 0xFF,
			height = (id >>> 8) & 0xFF,
			left = (id >>> 16) & 0xFF,
			top = (id >>> 24) & 0xFF;

		element.setAttribute(UISpriteSheet.SheetId, id.toString());
		UISpriteSheet.resize(element);
	}

	public static create(id: number, parent?: HTMLElement): HTMLSpanElement {
		const element = document.createElement("span") as HTMLSpanElement;

		element.style.backgroundImage = "url(assets/images/uiSheet.png)";
		UISpriteSheet.change(element, id);

		if (parent)
			parent.appendChild(element);

		return element;
	}

	public static html(id: number): string {
		return `<span ${UISpriteSheet.SheetId}="${id}"></span>`;
	}

	public static finishHTMLCreation(element: HTMLSpanElement): void {
		element.style.backgroundImage = "url(assets/images/uiSheet.png)";
		UISpriteSheet.change(element, parseInt(element.getAttribute(UISpriteSheet.SheetId)));
	}

	public static windowResized(): void {
		UISpriteSheet.BackgroundSizeCss = css(UISpriteSheet.TextureWidth) + " " + css(UISpriteSheet.TextureHeight);
	}
}
