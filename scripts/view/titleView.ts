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

class TitleView extends View {
	private pixel: HTMLDivElement = null;
	private buttonContainer: HTMLDivElement = null;
	private fullscreenButton: HTMLButtonElement = null;
	private aboutButton: HTMLButtonElement = null;
	private fadeInTimeout = 0;
	private currentLogo = 1;

	public constructor() {
		super();

		this.baseElement.innerHTML = `
		<div id="pixel" style="position: absolute;">
			<div id="pixel0" class="logo"></div>
			<div id="pixel1" class="logo logo-anim"></div>
			<div id="pixel2" class="logo logo-anim"></div>
			<div id="pixel3" class="logo logo-anim"></div>
			<div id="pixel4" class="logo logo-anim"></div>
			<div id="pixel5" class="logo logo-anim"></div>
			<div id="pixel6" class="logo logo-anim"></div>
			<div id="pixel7" class="logo logo-anim"></div>
			<div id="pixel8" class="logo logo-anim"></div>
		</div>
		<div id="buttonContainer" style="position: absolute;">
		`;

		this.pixel = this.baseElement.querySelector("#pixel") as HTMLDivElement;
		this.buttonContainer = this.baseElement.querySelector("#buttonContainer") as HTMLDivElement;

		this.createButton(this.buttonContainer, UISpriteSheet.Play, this.play.bind(this));
		this.buttonsWithLargeMargin.push(this.createButton(this.buttonContainer, UISpriteSheet.Edit, this.edit.bind(this)));
		this.fullscreenButton = this.createButton(this.baseElement, androidWrapper ? UISpriteSheet.Exit : UISpriteSheet.Fullscreen, (androidWrapper ? this.exit : this.fullscreen).bind(this));
		this.fullscreenButton.style.position = "absolute";
		this.aboutButton = this.createButton(this.baseElement, UISpriteSheet.Question, this.about.bind(this));
		this.aboutButton.style.position = "absolute";
	}

	protected resize(): void {
		const logoWidthCss = css(150),
			logoBackgroundSizeCss = logoWidthCss + " " + css(288);

		this.pixel.style.left = css((baseWidth - 150) >> 1);
		this.pixel.style.top = buttonLargeMarginCss;
		this.pixel.style.width = logoWidthCss;
		this.pixel.style.height = css(30);

		for (let i = 0; i <= 8; i++) {
			const image = document.getElementById("pixel" + i) as HTMLSpanElement;
			if (image) {
				image.style.backgroundSize = logoBackgroundSizeCss;
				image.style.backgroundPosition = "0 " + css(-(i << 5));
			}
		}

		const buttonContainerWidth = (buttonHeight << 1) + buttonLargeMargin;
		this.buttonContainer.style.bottom = css(buttonLargeMargin);
		this.buttonContainer.style.left = css((baseWidth - buttonContainerWidth) >> 1);
		this.buttonContainer.style.width = css(buttonContainerWidth);

		if (this.fullscreenButton) {
			this.fullscreenButton.style.left = buttonMarginCss;
			this.fullscreenButton.style.bottom = buttonMarginCss;
		}
		this.aboutButton.style.right = buttonMarginCss;
		this.aboutButton.style.bottom = buttonMarginCss;

		super.resize();
	}

	protected fadeInFinished(): void {
		this.fadeInTimeout = setTimeout(() => {
			this.fadeInTimeout = 0;
			if (this.currentLogo > 1) {
				this.pixel.removeChild(document.getElementById("pixel" + (this.currentLogo - 2)));
				if (this.currentLogo > 8)
					return;
			}
			document.getElementById("pixel" + this.currentLogo).className = "logo logo-anim visible";
			this.currentLogo++;
			this.fadeInFinished();
		}, (this.currentLogo === 1) ? 20 : 320);
	}

	protected async attach(): Promise<void> {
	}

	protected detach(): void {
		if (this.fadeInTimeout) {
			clearTimeout(this.fadeInTimeout);
			this.fadeInTimeout = 0;
		}
	}

	protected destroyInternal(partial: boolean): void {
	}

	private play(e: Event): boolean {
		if (Modal.visible)
			return false;

		this.fadeTo("SelectionView");
		return true;
	}

	private edit(e: Event): boolean {
		if (Modal.visible)
			return false;

		this.fadeTo("EditorView");
		return true;
	}

	private fullscreen(e: Event): boolean {
		fullscreenControl.toggleFullscreen();
		return true;
	}

	private exit(e: Event): boolean {
		androidWrapper.exit();
		return true;
	}

	private about(e: Event): boolean {
		if (Modal.visible)
			return false;

		const buttons: ModalButton[] = [
			{
				defaultCancel: true,
				iconId: UISpriteSheet.Back,
				text: Strings.Close,
				onclick: Modal.hide
			}
		];

		if (!androidWrapper && !isPWA && installationPrompt && ("prompt" in installationPrompt))
			buttons.push({
				iconId: UISpriteSheet.Download,
				text: Strings.Install,
				onclick: () => {
					if (installationPrompt) {
						try {
							const p = installationPrompt;
							installationPrompt = null;
							p["prompt"]();
						} catch (ex) {
							// Just ignore...
						}
					}
				}
			});

		Modal.show({
			title: Strings.About,
			large: true,
			html: Strings.About1 + (View.gl.contextVersion === 2 ? Strings.About2 : "") + Strings.About3 + (window["pixelUsingWebAssembly"] ? "" : Strings.About4) + Strings.About5 + UISpriteSheet.html(UISpriteSheet.Success) + "</p>" + (androidWrapper ? "" : Strings.About6) + Strings.About7,
			buttons: buttons
		});

		return true;
	}
}
