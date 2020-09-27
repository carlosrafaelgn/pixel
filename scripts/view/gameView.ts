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

class GameView extends View {
	// Must be in sync with lib/shared.h
	private static readonly FinishedThisFrame = 1;
	private static readonly FinishedVictory = 2;
	private static readonly FinishedLoss = 4;

	private alive = true;
	private paused = false;
	private finished = false;
	private readonly preview: boolean;
	private alreadyCreated = false;
	private backButton: HTMLButtonElement = null;
	private restartButton: HTMLButtonElement = null;
	private timeDisplay: HTMLDivElement = null;
	private loadOptions: LevelLoadOptions = null;
	private level: Level = null;
	private viewY: Float32Array = null;
	private frameRequest = 0;

	private pointerHandler: PointerHandler = null;
	private pointerCursorAttached: Int32Array = null;
	private totalElapsedMilliseconds: Int32Array = null;
	private victory: Int32Array = null;
	private pointerCursorCenterX: Float32Array = null;
	private pointerCursorCenterY: Float32Array = null;
	private pointerCursorX: Float32Array = null;
	private pointerCursorY: Float32Array = null;

	private boundRender: any = null;

	private resourceStorage: ResourceStorage = null;
	private levelTexture: Texture = null;

	public constructor(loadOptions: LevelLoadOptions, preview: boolean) {
		super();

		this.baseElement.style.cursor = "crosshair";
		this.baseElement.style.touchAction = "none";

		const back = this.createButton(this.baseElement, UISpriteSheet.Back, this.back.bind(this));
		back.style.position = "absolute";
		back.style.left = "0";
		back.style.top = "0";
		if (!preview)
			back.style.display = "none";
		this.backButton = back;

		if (!this.preview) {
			const restart = this.createButton(this.baseElement, UISpriteSheet.Restart, this.restart.bind(this));
			restart.style.position = "absolute";
			restart.style.left = "0";
			restart.style.top = "0";
			restart.style.display = "none";
			this.restartButton = restart;

			const timeDisplay = document.createElement("div");
			timeDisplay.style.position = "absolute";
			timeDisplay.style.left = "0";
			timeDisplay.style.top = "0";
			timeDisplay.style.display = "none";
			UISpriteSheet.create(UISpriteSheet.Clock, timeDisplay);
			timeDisplay.appendChild(document.createTextNode(Strings.Time));
			this.baseElement.appendChild(timeDisplay);
			this.timeDisplay = timeDisplay;
		}

		const pause = this.createButton(this.baseElement, UISpriteSheet.Pause, this.pause.bind(this));
		pause.style.position = "absolute";
		pause.style.right = "0";
		pause.style.top = "0";

		this.resourceStorage = new ResourceStorage();

		this.boundRender = this.render.bind(this);

		this.loadOptions = loadOptions;
		this.preview = preview;
	}

	protected get usesGL(): boolean {
		return true;
	}

	protected releaseResources(): void {
		if (!this.alive)
			return;

		this.resourceStorage.release();
	}

	protected loadResources(): void {
		if (!this.alive)
			return;

		this.resourceStorage.load();

		LevelSpriteSheet.LevelModelCoordinates.setCoordinates(0, 0, this.levelTexture.width * scaleFactor, this.levelTexture.height * scaleFactor);

		if (this.alreadyCreated) {
			if (this.frameRequest) {
				cancelAnimationFrame(this.frameRequest);
				this.frameRequest = 0;
			}

			this.frameRequest = requestAnimationFrame(this.boundRender);
		} else {
			this.alreadyCreated = true;
			this.restart();
		}
	}

	protected resize(): void {
		if (this.restartButton)
			this.restartButton.style.left = css(buttonHeight + buttonMargin);

		if (this.timeDisplay) {
			this.timeDisplay.style.top = buttonMarginCss;
			this.timeDisplay.style.left = css((buttonHeight * 3) + buttonMargin);
			this.timeDisplay.style.lineHeight = iconSizeCss;

			const image = this.timeDisplay.childNodes[0] as HTMLSpanElement;
			UISpriteSheet.resize(image);
			image.style.marginRight = buttonMarginCss;
		}

		this.level.viewResized();

		super.resize();
	}

	protected async attach(): Promise<void> {
		this.level = await LevelCache.loadLevelFromOptions(this.loadOptions);
		this.loadOptions = null;

		this.pointerHandler = new PointerHandler(this.baseElement, this.mouseDown.bind(this), this.mouseMove.bind(this), this.mouseUp.bind(this));

		if (!this.levelTexture) {
			this.levelTexture = new Texture(View.gl, await loadImage(this.level.processedImage));
			this.resourceStorage.add("levelTexture", this.levelTexture);
		}
	}

	protected detach(): void {
		if (this.pointerHandler) {
			this.pointerHandler.destroy();
			this.pointerHandler = null;
		}
	}

	protected destroyInternal(partial: boolean): void {
		this.alive = false;
		this.alreadyCreated = false;

		this.level.destroyLevelPtr();
		this.viewY = null;
		this.pointerCursorAttached = null;
		this.totalElapsedMilliseconds = null;
		this.victory = null;
		this.pointerCursorCenterX = null;
		this.pointerCursorCenterY = null;
		this.pointerCursorX = null;
		this.pointerCursorY = null;

		if (partial)
			this.resourceStorage.release();
		else
			this.resourceStorage.destroy();
	}

	private restart(): boolean {
		if (!this.alive)
			return false;

		if (!this.preview) {
			this.backButton.style.display = "none";
			this.restartButton.style.display = "none";
			this.timeDisplay.style.display = "none";
		}

		this.paused = false;
		this.finished = false;
		this.level.restart();

		const buffer = cLib.HEAP8.buffer as ArrayBuffer;
		let firstPropertyPtr = cLib._getFirstPropertyPtr(this.level.levelPtr);

		// Must be in sync with lib/shared.h
		this.viewY = new Float32Array(buffer, cLib._getViewYPtr(this.level.levelPtr), 1);
		this.pointerCursorAttached = new Int32Array(buffer, firstPropertyPtr, 1);
		firstPropertyPtr += 4;
		this.totalElapsedMilliseconds = new Int32Array(buffer, firstPropertyPtr, 1);
		firstPropertyPtr += 4;
		this.victory = new Int32Array(buffer, firstPropertyPtr, 1);
		firstPropertyPtr += 4;
		this.pointerCursorCenterX = new Float32Array(buffer, firstPropertyPtr, 1);
		firstPropertyPtr += 4;
		this.pointerCursorCenterY = new Float32Array(buffer, firstPropertyPtr, 1);
		firstPropertyPtr += 4;
		this.pointerCursorX = new Float32Array(buffer, firstPropertyPtr, 1);
		firstPropertyPtr += 4;
		this.pointerCursorY = new Float32Array(buffer, firstPropertyPtr, 1);
	
		if (this.frameRequest) {
			cancelAnimationFrame(this.frameRequest);
			this.frameRequest = 0;
		}

		this.frameRequest = requestAnimationFrame(this.boundRender);

		return true;
	}

	private back(e: Event): boolean {
		if (!this.alive)
			return false;

		this.alive = false;
		this.paused = true;

		if (this.frameRequest) {
			cancelAnimationFrame(this.frameRequest);
			this.frameRequest = 0;
		}

		this.fadeToPrevious();

		return true;
	}

	private pause(e: Event): boolean {
		if (!this.alive)
			return false;

		if (!this.paused) {
			const controlModeImg = (ControlMode.accelerationSupported ? UISpriteSheet.create(ControlMode.modeImage) : null);

			if (!Modal.show({
				title: Strings.Pause,
				html: (androidWrapper ? "" : `<button type="button" id="fullscreen" data-style="margin-bottom: ${buttonMargin}">${Strings.Fullscreen}</button><br/>`) + 
					(!controlModeImg ? "" : `<button type="button" id="controlMode" data-style="margin-bottom: ${buttonMargin}">${Strings.ControlMode}</button><br/>`) +
					`<button type="button" id="restart">${Strings.Restart}</button>`,
				buttons: [
					{
						iconId: UISpriteSheet.Back,
						text: Strings.Exit,
						onclick: () => {
							Modal.hide();
							this.back(null);
						}
					},
					{
						defaultCancel: true,
						iconId: UISpriteSheet.PlayGreen,
						text: Strings.Play,
						className: "accept",
						onclick: () => {
							Modal.hide();
							this.pause(null);
						}
					}
				],
				onshowing: () => {
					let button = document.getElementById("fullscreen") as HTMLButtonElement;
					if (button)
						button.insertBefore(UISpriteSheet.create(UISpriteSheet.Fullscreen), button.firstChild);

					if (controlModeImg) {
						button = document.getElementById("controlMode") as HTMLButtonElement;
						button.insertBefore(controlModeImg, button.firstChild);
					}

					button = document.getElementById("restart") as HTMLButtonElement;
					button.insertBefore(UISpriteSheet.create(UISpriteSheet.Restart), button.firstChild);
				},
				onbuttonclick: (id: string) => {
					switch (id) {
						case "fullscreen":
							fullscreenControl.toggleFullscreen();
							break;
						case "controlMode":
							ControlMode.toggleMode();
							UISpriteSheet.change(controlModeImg, ControlMode.modeImage);
							break;
						case "restart":
							this.restart();
							Modal.hide();
							break;
					}
				}
			}))
				return false;
		}

		this.paused = !this.paused;

		if (this.frameRequest) {
			cancelAnimationFrame(this.frameRequest);
			this.frameRequest = 0;
		}

		if (this.alive)
			this.frameRequest = requestAnimationFrame(this.boundRender);

		return true;
	}

	private mouseDown(e: MouseEvent): boolean {
		if (View.loading || !this.alive || this.paused || ControlMode.mode !== ControlMode.Pointer || this.finished)
			return false;

		this.pointerCursorAttached[0] = 1;
		this.pointerCursorCenterX[0] = this.pointerCursorX[0] = model(e.clientX - baseLeftCss);
		this.pointerCursorCenterY[0] = this.pointerCursorY[0] = model(e.clientY - baseTopCss);

		return true;
	}

	private mouseMove(e: MouseEvent): void {
		this.pointerCursorX[0] = modelFrac(e.clientX - baseLeftCss);
		this.pointerCursorY[0] = modelFrac(e.clientY - baseTopCss);
	}

	private mouseUp(e: MouseEvent): void {
		this.pointerCursorAttached[0] = 0;
	}

	private checkRecord(): void {
		if (!this.alive || !this.level || !this.totalElapsedMilliseconds || !this.victory || !this.victory[0])
			return;

		const record = LevelCache.getLevelRecord(this.level.name);
		if (record && record.time <= this.totalElapsedMilliseconds[0])
			return;

		Modal.show({
			title: Strings.NewRecord,
			html: `<label for="name">${Strings.Name}</label><input id="name" spellcheck="false" autocomplete="off" maxlength="8" /><br/><label>${Strings.Time}</label><label>${LevelCache.formatLevelRecordTime(this.totalElapsedMilliseconds[0])}</label>`,
			okcancel: true,
			okcancelsubmit: true,
			onshowing: () => {
				const header = Modal.currentModalHeaderElement;
				if (header) {
					header.setAttribute("data-style", "line-height:" + iconSize);

					const image = UISpriteSheet.create(UISpriteSheet.Trophy);
					image.setAttribute("data-style", "margin-right:" + buttonMargin);
					header.insertBefore(image, header.firstChild);

					UISpriteSheet.create(UISpriteSheet.Trophy, header).setAttribute("data-style", "margin-left:" + buttonMargin);
				}
				(document.getElementById("name") as HTMLInputElement).value = LevelCache.LastRecordName || "";
			},
			onok: async () => {
				if (!this.alive || !this.level || !this.totalElapsedMilliseconds)
					return;

				LevelCache.setLevelRecord(this.level.name, this.totalElapsedMilliseconds[0], (document.getElementById("name") as HTMLInputElement).value);

				Modal.hide();
			}
		});
	}

	private render(time: number): void {
		if (this.alive) {
			this.frameRequest = requestAnimationFrame(this.boundRender);
		} else {
			this.frameRequest = 0;
			return;
		}

		const level = this.level;

		if (!View.drawBackground(time, level.levelPtr, true)) {
			if (this.frameRequest) {
				cancelAnimationFrame(this.frameRequest);
				this.frameRequest = 0;
			}
			return;
		}

		if (ControlMode.mode !== ControlMode.Pointer && androidWrapper)
			ControlMode.processAndroidAcceleration();

		level.step(this.paused);

		const gl = View.gl;

		gl.draw(this.levelTexture, LevelSpriteSheet.LevelModelCoordinates, 1, LevelSpriteSheet.FullTextureCoordinates, 0, -((this.viewY[0] * scaleFactor) | 0));

		gl.prepareNativeDraw(View.sheetTexture);

		if (cLib._render(gl.verticesPtr, level.levelPtr, LevelSpriteSheet.LevelSpriteSheetPtr, scaleFactor)) {
			if (this.preview) {
				this.finished = true;
				this.pointerCursorAttached[0] = 0;
				this.pause(null);
			} else {
				this.finished = false;
				this.pointerCursorAttached[0] = 0;
				this.backButton.style.display = "";
				this.restartButton.style.display = "";
				if (this.totalElapsedMilliseconds) {
					(this.timeDisplay.childNodes[1] as Text).nodeValue = LevelCache.formatLevelRecordTime(this.totalElapsedMilliseconds[0]);
					this.timeDisplay.style.display = "";
				}
				this.checkRecord();
			}
		}
	}
}
