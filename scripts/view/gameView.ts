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

interface WakeLockSentinel {
	readonly released: boolean;
	readonly type: string;
	release(): Promise<void>;
}

interface WakeLock {
	request(type: string): Promise<WakeLockSentinel>;
}

class GameView extends View {
	// Must be in sync with lib/shared.h
	private static readonly FinishedThisFrame = 1;
	private static readonly FinishedVictory = 2;
	private static readonly FinishedLoss = 4;

	private static wakeLockSentinel: WakeLockSentinel = null;

	private alive = true;
	private paused = false;
	private finished = false;
	private readonly preview: boolean;
	private alreadyCreated = false;
	private backButton: HTMLButtonElement = null;
	private restartButton: HTMLButtonElement = null;
	private timeDisplay: HTMLDivElement = null;
	private timeDisplayImage: HTMLSpanElement = null;
	private timeDisplayText: Text = null;
	private editNameButton: HTMLButtonElement = null;
	private loadOptions: LevelLoadOptions = null;
	private level: Level = null;
	private viewY: Float32Array = null;
	private frameRequest = 0;
	private finalUIAttached = false;

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

		const back = this.createButton(preview ? this.baseElement : null, UISpriteSheet.Back, this.back.bind(this));
		back.style.position = "absolute";
		back.style.left = "0";
		back.style.top = "0";
		this.backButton = back;

		if (!this.preview) {
			const restartButton = this.createButton(null, UISpriteSheet.Restart, this.restart.bind(this));
			restartButton.style.position = "absolute";
			restartButton.style.top = "0";
			this.restartButton = restartButton;

			const timeDisplay = document.createElement("div");
			timeDisplay.style.position = "absolute";
			this.timeDisplayImage = UISpriteSheet.create(UISpriteSheet.Clock, timeDisplay);
			timeDisplay.appendChild(this.timeDisplayText = document.createTextNode(Strings.Time));
			this.editNameButton = this.createButton(timeDisplay, UISpriteSheet.Edit, this.editName.bind(this));
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
			this.timeDisplay.style.marginTop = buttonMarginCss;
			this.timeDisplay.style.left = css((buttonHeight * 3) + buttonMargin);
			this.timeDisplay.style.lineHeight = iconSizeCss;
			this.editNameButton.style.marginTop = "-" + buttonMarginCss;

			UISpriteSheet.resize(this.timeDisplayImage);
			this.timeDisplayImage.style.marginRight = buttonMarginCss;
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

		if (androidWrapper) {
			androidWrapper.setKeepScreenOn(true);
		} else {
			try {
				const wakeLock = navigator["wakeLock"] as WakeLock;

				if (wakeLock && wakeLock.request) {
					// https://w3c.github.io/screen-wake-lock/#extensions-to-the-navigator-interface
					// https://developer.mozilla.org/en-US/docs/Web/API/WakeLock/request
					// https://developer.mozilla.org/en-US/docs/Web/API/WakeLockSentinel
					if (!GameView.wakeLockSentinel)
						GameView.wakeLockSentinel = await wakeLock.request("screen");
				}
			} catch (ex) {
				// Just ignore...
			}
		}
	}

	protected async detach(): Promise<void> {
		if (this.pointerHandler) {
			this.pointerHandler.destroy();
			this.pointerHandler = null;
		}

		if (androidWrapper) {
			androidWrapper.setKeepScreenOn(false);
		} else if (GameView.wakeLockSentinel) {
			try {
				if (GameView.wakeLockSentinel.release) {
					await GameView.wakeLockSentinel.release();
					GameView.wakeLockSentinel = null;
				}
			} catch (ex) {
				// Just ignore...
			}
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

		if (this.finalUIAttached) {
			this.finalUIAttached = false;
			if (!this.preview)
				this.baseElement.removeChild(this.backButton);
			this.baseElement.removeChild(this.restartButton);
			this.baseElement.removeChild(this.timeDisplay);
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
				html: ((androidWrapper || isPWA) ? "" : `<button type="button" id="fullscreen" data-style="margin-bottom: ${buttonMargin}">${Strings.Fullscreen}</button><br/>`) + 
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
				onbuttonclick: (id) => {
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

	private checkRecord(): string {
		if (!this.alive || !this.level || !this.totalElapsedMilliseconds || !this.victory || !this.victory[0])
			return null;

		const record = LevelCache.getLevelRecord(this.level.name);
		if (record && record.time <= this.totalElapsedMilliseconds[0])
			return null;

		return LevelCache.LastRecordName || "";
	}

	private setTimeDisplayTextRecord(name: string): void {
		this.timeDisplayText.nodeValue = LevelCache.formatLevelRecordTime(this.totalElapsedMilliseconds[0]) + " - " + (name || Strings.NoName);
	}

	private editName(): void {
		if (!this.alive || !this.level || !this.totalElapsedMilliseconds || !this.victory || !this.victory[0])
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
			onshown: () => {
				(document.getElementById("name") as HTMLInputElement).focus();
			},
			onok: async () => {
				if (!this.alive || !this.level || !this.totalElapsedMilliseconds)
					return;

				const name = (document.getElementById("name") as HTMLInputElement).value.trim();

				if (name) {
					LevelCache.setLevelRecord(this.level.name, this.totalElapsedMilliseconds[0], name);
				} else {
					LevelCache.deleteLevelRecord(this.level.name);
					LevelCache.clearLastRecordName();
				}

				this.setTimeDisplayTextRecord(name);

				Modal.hide();
			}
		});
	}

	// Chrome 86.0.4240.75 Win10 64-bit WASM
	// Calling gl.getError() inside WebGL.checkForLostContextUseFrameBufferAndClear()
	// pc 600 | bg 1.1398666666642991 | step 0.10165833331787628 | render 0.05755000004076768
	// pc 600 | bg 2.2841916666948237 | step 0.09073333331646911 | render 0.04539999998996791
	// pc 600 | bg 2.6027250000056910 | step 0.10687500000116415 | render 0.04770833332564507
	// Not calling gl.getError() inside WebGL.checkForLostContextUseFrameBufferAndClear()
	// pc 600 | bg 0.22599166667835865 | step 0.12219166663877938 | render 0.0783666666817832
	// pc 600 | bg 0.29504166672268184 | step 0.13925833334117974 | render 0.07858333330659661
	// pc 600 | bg 0.27939166667541330 | step 0.13665833332197508 | render 0.07586666667217894
	//
	// Chrome 86.0.4240.75 Win10 64-bit JS
	// pc 600 | bg 2.1046833333230097 | step 0.12264999998023995 | render 0.04660833335644080
	// pc 600 | bg 2.3967999999843355 | step 0.12626666665899391 | render 0.04214166669951131
	// pc 600 | bg 2.2417000000148497 | step 0.10881666667662405 | render 0.03894999998747759
	//
	// Chrome 86.0.4240.99 Android 10 64-bit WASM
	// Calling gl.getError() inside WebGL.checkForLostContextUseFrameBufferAndClear()
	// pc 600 | bg 6.180499990781148 | step 0.5381666744748751 | render 0.23283332702703774
	// pc 600 | bg 6.157999999122694 | step 0.5413333345980694 | render 0.21450000000186265
	// pc 600 | bg 6.243833333719522 | step 0.5301666690502316 | render 0.21749999956227840
	// Not calling gl.getError() inside WebGL.checkForLostContextUseFrameBufferAndClear()
	// pc 600 | bg 0.4968333376261095 | step 0.4993333318270743 | render 0.25966667065707344
	// pc 600 | bg 0.4556666652206331 | step 0.5208333348855376 | render 0.2493333308181415
	// pc 600 | bg 0.4155000000415991 | step 0.4680000028262536 | render 0.18949999862040082
	//
	// Chrome 86.0.4240.99 Android 10 64-bit JS
	// pc 600 | bg 6.1840000015217810 | step 0.45316666364669800 | render 0.17316666509335240
	// pc 600 | bg 5.8711666652622325 | step 0.38650000079845387 | render 0.15633333435592553
	// pc 600 | bg 6.0405000031460080 | step 0.38383333672148484 | render 0.16066666692495346
	//
	// In order to enable better timer precision in Firefox, open about:config,
	// search for reduce and change these settings:
	// privacy.reduceTimerPrecision: false
	// privacy.reduceTimerPrecision.unconditional: false
	// privacy.resistFingerprinting.reduceTimerPrecision.jitter: false
	// privacy.resistFingerprinting.reduceTimerPrecision.microseconds: 1
	// services.sync.prefs.sync.privacy.reduceTimerPrecision: false
	// services.sync.prefs.sync.privacy.resistFingerprinting.reduceTimerPrecision.jitter: false
	// services.sync.prefs.sync.privacy.resistFingerprinting.reduceTimerPrecision.microseconds: false
	//
	// Firefox Developer 82.0b9 (64-bit) Win10 64-bit WASM
	// pc 600 | bg 0.9787969757616520 | step 2.87808025863399970 | render 0.32952139032858520
	// pc 600 | bg 0.8764817570686865 | step 2.63103864114506000 | render 0.30205350575566020
	// pc 600 | bg 0.9719650707309726 | step 2.95773079488872700 | render 0.32408785344019025
	//
	// Firefox Developer 82.0b9 (64-bit) Win10 64-bit JS
	// pc 600 | bg 0.9219864525068745 | step 0.21732009373789576 | render 0.20971074733572700
	// pc 600 | bg 0.8730256068153055 | step 0.18898154325087185 | render 0.19548502420363850
	// pc 600 | bg 0.8395451668636088 | step 0.18125416944659567 | render 0.18942029729209026
	//
	// Firefox Nightly 83.0a1 Android 10 64-bit WASM
	// pc 600 | bg 1.4813376783333783 | step 0.42121525333340290 | render 1.3057092249998580
	// pc 600 | bg 1.4354895816664188 | step 0.43083334500004034 | render 1.2879800200002136
	// pc 600 | bg 1.5013020666668550 | step 0.46037415833345830 | render 1.1920885466665156
	//
	// Firefox Nightly 83.0a1 Android 10 64-bit JS
	// pc 600 | bg 1.1987360749998153 | step 0.6241441416668082 | render 1.6786111133331845
	// pc 600 | bg 1.2559982549993340 | step 0.6407430400000885 | render 1.6158915166674706
	// pc 600 | bg 1.3177690783340708 | step 0.6493098949996056 | render 1.7047066200000458
	//
	// Whether gl.getError() is called or not does not appear to affect the timing on Firefox.
	//
	// Also, on the browsers tested, changing WebGL version from 2 to 1 does not produce any significant changes in the timing.
	//
	// Tested using built-in level with name/id 2, with ControlMode.Pointer, in fullscreen + landscape mode, without touching the screen even once.
	
	// Performance profiling (used to produce the results above)
	//private pc = 0;
	//private p1 = 0;
	//private p2 = 0;
	//private p3 = 0;
	
	private render(time: number): void {
		if (this.alive) {
			this.frameRequest = requestAnimationFrame(this.boundRender);
		} else {
			this.frameRequest = 0;
			return;
		}

		const level = this.level;

		// Performance profiling
		//let p1 = performance.now();

		if (!View.drawBackground(time, level.levelPtr, true)) {
			if (this.frameRequest) {
				cancelAnimationFrame(this.frameRequest);
				this.frameRequest = 0;
			}
			return;
		}

		// Performance profiling
		//let p2 = performance.now();

		if (ControlMode.mode !== ControlMode.Pointer && androidWrapper)
			ControlMode.processAndroidAcceleration();

		level.step(this.paused);

		// Performance profiling
		//let p3 = performance.now();

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

				if (this.totalElapsedMilliseconds) {
					const name = this.checkRecord();
					if (name === null) {
						UISpriteSheet.change(this.timeDisplayImage, UISpriteSheet.Clock);
						this.timeDisplayText.nodeValue = LevelCache.formatLevelRecordTime(this.totalElapsedMilliseconds[0]);
						this.editNameButton.style.display = "none";
					} else {
						if (name)
							LevelCache.setLevelRecord(this.level.name, this.totalElapsedMilliseconds[0], name);
						UISpriteSheet.change(this.timeDisplayImage, UISpriteSheet.Trophy);
						this.setTimeDisplayTextRecord(name);
						this.editNameButton.style.display = "";
					}
				}

				if (!this.finalUIAttached) {
					this.finalUIAttached = true;
					if (!this.preview)
						this.baseElement.appendChild(this.backButton);
					this.baseElement.appendChild(this.restartButton);
					this.baseElement.appendChild(this.timeDisplay);
				}
			}
		}

		// Performance profiling
		//let p4 = performance.now();
		//this.pc++;
		//this.p1 += (p2 - p1);
		//this.p2 += (p3 - p2);
		//this.p3 += (p4 - p3);
		//if (this.pc === 600)
		//	console.log(`pc ${this.pc} | bg ${this.p1 / this.pc} | step ${this.p2 / this.pc} | render ${this.p3 / this.pc}`);
	}
}
