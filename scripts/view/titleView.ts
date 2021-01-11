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
	private readonly logo: HTMLDivElement;
	private readonly buttonContainer: HTMLDivElement;
	private readonly fullscreenButton: HTMLButtonElement;
	private readonly aboutButton: HTMLButtonElement;

	public constructor() {
		super();

		this.logo = document.createElement("div");
		this.logo.className = "logo";
		this.initialElements.push(this.logo);

		this.buttonContainer = document.createElement("div");
		this.buttonContainer.style.position = "absolute";
		this.initialElements.push(this.buttonContainer);

		this.createButton(this.buttonContainer, UISpriteSheet.Play, this.play.bind(this));
		this.buttonsWithLargeMargin.push(this.createButton(this.buttonContainer, UISpriteSheet.Edit, this.edit.bind(this)));
		if (!isPWA) {
			this.fullscreenButton = this.createButton(null, androidWrapper ? UISpriteSheet.Exit : UISpriteSheet.Fullscreen, (androidWrapper ? this.exit : this.fullscreen).bind(this));
			this.fullscreenButton.style.position = "absolute";
			this.initialElements.push(this.fullscreenButton);
		}
		this.aboutButton = this.createButton(null, UISpriteSheet.Question, this.about.bind(this));
		this.aboutButton.style.position = "absolute";
		this.initialElements.push(this.aboutButton);
	}

	protected resize(): void {
		const logoWidthCss = css(150),
			logoHeightCss = css(30);

		this.logo.style.left = css((baseWidth - 150) >> 1);
		this.logo.style.top = css(buttonLargeMargin << 1);
		this.logo.style.width = logoWidthCss;
		this.logo.style.height = logoHeightCss;
		this.logo.style.backgroundSize = logoWidthCss + " " + logoHeightCss;

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

	protected async attach(): Promise<void> {
		View.glCanvas.style.cursor = "default";
	}

	protected async detach(): Promise<void> {
		View.glCanvas.style.cursor = "";
	}

	protected destroyInternal(partial: boolean): void {
	}

	private play(e: Event): boolean {
		this.fadeTo("SelectionView");
		return true;
	}

	private edit(e: Event): boolean {
		this.fadeTo("EditorView");
		return true;
	}

	private fullscreen(e: Event): boolean {
		FullscreenControl.toggleFullscreen();
		return true;
	}

	private exit(e: Event): boolean {
		androidWrapper.exit();
		return true;
	}

	private about(e: Event): boolean {
		const buttons: ModalButton[] = [
			{
				defaultCancel: true,
				iconId: UISpriteSheet.Back,
				text: Strings.Close,
				onclick: Modal.hide
			}
		];

		if (!androidWrapper && installationPrompt && installationPrompt["prompt"])
			buttons.push({
				iconId: UISpriteSheet.Download,
				text: Strings.Install,
				onclick: (id, button) => {
					if (installationPrompt) {
						try {
							const p = installationPrompt;
							installationPrompt = null;
							p["prompt"]();
						} catch (ex) {
							// Just ignore...
						}
					}

					// Wait for the blink to finish before removing the button from the screen
					setTimeout(() => { button.style.display = "none"; }, blinkTotalDurationMS);
				}
			});

		Modal.show({
			title: Strings.About + ` <span style="float: right;">v${version}${window["pixelES"]}</span>`,
			large: true,
			html: Strings.About1 + (View.gl.contextVersion === 2 ? Strings.About2 : "") + Strings.About3 + (window["pixelUsingWebAssembly"] ? "" : Strings.About4) + Strings.About5 + UISpriteSheet.html(UISpriteSheet.Success) + "</p>" + ((isIOSOrSafari || androidWrapper || (navigator["wakeLock"] && navigator["wakeLock"].request)) ? "" : Strings.About6) + Strings.About7,
			buttons: buttons
		});

		return true;
	}
}
