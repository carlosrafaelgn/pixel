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

interface ButtonCallback {
	(e: Event): boolean;
}

abstract class View {
	public static readonly main = document.getElementById("main") as HTMLDivElement;
	public static readonly fadeLeft = document.getElementById("fadeLeft") as HTMLDivElement;
	public static readonly fadeRight = document.getElementById("fadeRight") as HTMLDivElement;
	public static readonly glCanvas = document.getElementById("glCanvas") as HTMLCanvasElement;
	public static readonly cover = document.getElementById("cover") as HTMLDivElement;

	private static _loading = false;
	private static _fading = false;
	private static currentView: View | null = null;
	private static viewStack: View[] = [];
	private static divLoading: HTMLDivElement | null = null;
	private static divLoadingTimeout = 0;
	private static windowHistoryStatePushed = false;

	protected static gl: WebGL;
	protected static sheetTexture: Texture;
	protected static glPaused = false;
	private static backgroundFrameRequest = 0;
	private static recreateResourcesTimeout = 0;

	protected static drawBackground(time: number, levelPtr: number, animate: boolean, regularBackground: boolean): boolean {
		const gl = View.gl;

		if (!gl.checkForLostContext()) {
			if (!View.recreateResourcesTimeout)
				View.recreateResourcesTimeout = setTimeout(View.recreateResourcesFromTimeout, 1000);
			return false;
		}

		gl.prepareNativeDraw(View.sheetTexture);

		if (regularBackground) {
			gl.useFramebuffer(true);

			cLib._renderBackground(gl.verticesPtr, levelPtr, LevelSpriteSheet.LevelSpriteSheetPtr, baseHeight, time, animate);

			gl.useFramebuffer(false);

			gl.draw(gl.framebufferTexture, LevelSpriteSheet.FullViewModelCoordinates, 1, LevelSpriteSheet.FramebufferTextureCoordinates, 0, 0);

			gl.flush();
		} else {
			cLib._renderCompactBackground(gl.verticesPtr, levelPtr, LevelSpriteSheet.LevelSpriteSheetPtr, time);
		}

		return true;
	}

	private static recreateResourcesFromTimeout(): void {
		if (!View.recreateResourcesTimeout)
			return;

		View.recreateResourcesTimeout = 0;
		View.recreateResources();
	}

	private static recreateResources(): void {
		if (View.recreateResourcesTimeout) {
			clearTimeout(View.recreateResourcesTimeout);
			View.recreateResourcesTimeout = 0;
		}

		const currentView = View.currentView;

		if (currentView && currentView.usesGL)
			currentView.releaseResources();

		View.sheetTexture.release();

		if (View.backgroundFrameRequest) {
			cancelAnimationFrame(View.backgroundFrameRequest);
			View.backgroundFrameRequest = 0;
		}

		try {
			View.gl.recreate(View.glCanvas, baseWidth >> LevelSpriteSheet.BackgroundScaleRightShift, baseHeight >> LevelSpriteSheet.BackgroundScaleRightShift);

			View.sheetTexture.load();
		} catch (ex) {
			View.recreateResourcesTimeout = setTimeout(View.recreateResourcesFromTimeout, 500);
			throw ex;
		}

		View.refreshGL();
	}

	private static renderBackground(time: number): void {
		const animate = !View.glPaused;

		View.backgroundFrameRequest = (animate ? requestAnimationFrame(View.renderBackground) : 0);

		if (!View.drawBackground(time, 0, animate, true)) {
			if (View.backgroundFrameRequest) {
				cancelAnimationFrame(View.backgroundFrameRequest);
				View.backgroundFrameRequest = 0;
			}
			return;
		}
	}

	public static get loading(): boolean {
		return View._loading;
	}

	public static set loading(l: boolean) {
		if (View._loading === l)
			return;

		View._loading = l;

		if (l) {
			if (!View.divLoading) {
				View.divLoading = document.createElement("div");
				View.divLoading.style.display = "none";
				View.resizeLoading();
				document.body.appendChild(View.divLoading);
			}
			if (View.divLoadingTimeout)
				clearTimeout(View.divLoadingTimeout);
			View.divLoadingTimeout = setTimeout(function () {
				View.divLoadingTimeout = 0;
				if (View.divLoading) {
					View.divLoading.style.display = "";
					View.divLoading.className = "loading";
				}
			}, 100);
		} else {
			if (View.divLoading) {
				if (View.divLoadingTimeout) {
					clearTimeout(View.divLoadingTimeout);
					View.divLoadingTimeout = 0;
				}
				document.body.removeChild(View.divLoading);
				View.divLoading = null;
			}
		}
	}

	public static get fading(): boolean {
		return View._fading;
	}

	public static initGL(): void {
		View.gl = new WebGL();
		View.sheetTexture = LevelSpriteSheet.createTexture(View.gl);
	}

	public static pauseGL(): void {
		View.glPaused = true;
	}

	public static resumeGL(): void {
		View.glPaused = false;
		View.refreshGL();
	}

	public static refreshGL(view?: View | null): void {
		if (!view)
			view = View.currentView;

		if (View.backgroundFrameRequest) {
			cancelAnimationFrame(View.backgroundFrameRequest);
			View.backgroundFrameRequest = 0;
		}

		if (view) {
			if (view.usesGL)
				view.loadResources();
			else if (!view.pausedBackground)
				View.backgroundFrameRequest = requestAnimationFrame(View.renderBackground);
		}
	}

	public static createInitialView(): Promise<void> | null {
		return ((!View.currentView && !View._loading && !View._fading && !View.viewStack.length) ?
			(new TitleView()).fadeIn() :
			null);
	}

	private static resizeLoading(): void {
		if (!View.divLoading)
			return;

		View.divLoading.style.backgroundSize = css(43) + " " + css(11);
		View.divLoading.style.width = css(43 + iconSize);
		View.divLoading.style.height = css(11 + iconSize);
	}

	public static windowResized(elementSizeChanged: boolean): void {
		if (baseLeftCss < 8) {
			if (!View.fadeLeft.style.backgroundColor) {
				const color = ((androidWrapper || isPWA) ? "#99f" : "#000");
				View.fadeLeft.style.backgroundColor = color;
				View.fadeRight.style.backgroundColor = color;
				View.fadeLeft.style.backgroundImage = "none";
				View.fadeRight.style.backgroundImage = "none";
			}
		} else {
			if (View.fadeLeft.style.backgroundColor) {
				View.fadeLeft.style.backgroundColor = "";
				View.fadeRight.style.backgroundColor = "";
				View.fadeLeft.style.backgroundImage = "";
				View.fadeRight.style.backgroundImage = "";
			}
		}

		if (!elementSizeChanged)
			return;

		View.resizeLoading();

		if (baseTopCss) {
			if (!View.fadeLeft.style.display) {
				View.fadeLeft.style.display = "none";
				View.fadeRight.style.display = "none";
			}
		} else {
			if (View.fadeLeft.style.display) {
				View.fadeLeft.style.display = "";
				View.fadeRight.style.display = "";
			}
		}

		// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#Consider_rendering_to_a_smaller_backbuffer_size
		// https://www.khronos.org/webgl/wiki/HandlingHighDPI
		// Unfortunately it was not possible to use the techniques above
		// because the ball/camera movement ended up too jaggy :(
		View.glCanvas.width = baseWidth * scaleFactor;
		View.glCanvas.height = baseHeight * scaleFactor;
		View.glCanvas.style.width = baseWidthCss + "px";
		View.glCanvas.style.height = baseHeightCss + "px";

		if (View.gl.checkRecreate(View.glCanvas))
			View.recreateResources();

		if (View.currentView)
			View.currentView.resize();
	}

	public static windowHistoryStatePopped(e: PopStateEvent): void {
		View.windowHistoryStatePushed = false;
		View.pushHistoryStateIfNecessary();

		if (Modal.visible)
			Modal.defaultCancelAction();
	}

	public static pushHistoryStateIfNecessary(): void {
		if (!View.windowHistoryStatePushed && (!View.currentView || !(View.currentView instanceof TitleView) || View._fading || Modal.visible)) {
			View.windowHistoryStatePushed = true;
			// Closing the browser with our state already pushed to the top of
			// window.history will cause the current state to have
			// window.history.state.pixelMaze = true when opening the browser
			// again later. But, given that the browser cannot confirm the
			// state has been pushed by "this page", since the browser has been
			// closed and reopened, calling window.history.back() inside
			// popHistoryStateIfNecessary() will actually make the browser
			// navigate to the previous page. Therefore, we are better off not
			// performing these checks here.
			//if (!window.history.state || !window.history.state.pixelMaze)
			window.history.pushState({ pixelMaze: true }, "Pixel Maze");
		}
	}

	public static popHistoryStateIfNecessary(): void {
		if (View.windowHistoryStatePushed)
			window.history.back();
	}

	protected readonly buttons: HTMLButtonElement[];
	protected readonly buttonsWithMargin: HTMLButtonElement[];
	protected readonly buttonsWithLargeMargin: HTMLButtonElement[];
	protected readonly buttonImages: HTMLSpanElement[];

	protected readonly initialElements: HTMLElement[];

	protected attached: boolean;

	public constructor() {
		this.buttons = [];
		this.buttonsWithMargin = [];
		this.buttonsWithLargeMargin = [];
		this.buttonImages = [];
	
		this.initialElements = [];

		this.attached = false;
	}

	protected get usesGL(): boolean {
		return false;
	}

	protected get pausedBackground(): boolean {
		return false;
	}

	protected releaseResources(): void {
	}

	protected loadResources(): void {
	}

	protected resize(): void {
		for (let i = this.buttons.length - 1; i >= 0; i--) {
			const button = this.buttons[i];
			button.style.width = buttonHeightCss;
			button.style.height = buttonHeightCss;
			button.style.fontSize = fontSizeCss;
			button.style.lineHeight = iconSizeCss;
		}

		for (let i = this.buttonImages.length - 1; i >= 0; i--)
			UISpriteSheet.resize(this.buttonImages[i]);

		for (let i = this.buttonsWithMargin.length - 1; i >= 0; i--)
			this.buttonsWithMargin[i].style.marginLeft = buttonMarginCss;

		for (let i = this.buttonsWithLargeMargin.length - 1; i >= 0; i--)
			this.buttonsWithLargeMargin[i].style.marginLeft = buttonLargeMarginCss;
	}

	protected fadeInFinished(): void {
	}

	protected abstract attach(): Promise<void>;

	protected abstract detach(): Promise<void>;

	protected abstract destroyInternal(partial: boolean): void;

	// Simulating final...
	protected readonly destroy = async (partial: boolean): Promise<void> => {
		if (this.initialElements) {
			if (this.attached) {
				// 3 = fadeLeft, fadeRight, glCanvas
				for (let i = View.main.childNodes.length - 1; i >= 3; i--)
					View.main.removeChild(View.main.childNodes[i]);

				this.attached = false;
				await this.detach();
			}

			this.destroyInternal(partial);

			if (!partial)
				zeroObject(this);
		}
	}

	protected createButton(parent: HTMLElement | null, imageId: number, callback: ButtonCallback, ...attributes: string[]): HTMLButtonElement {
		const button = document.createElement("button"),
			image = UISpriteSheet.create(imageId, button);
		button.setAttribute("type", "button");
		prepareButtonBlink(button, false, callback);
		if (parent)
			parent.appendChild(button);
		this.buttons.push(button);
		this.buttonImages.push(image);
		if (attributes) {
			for (let i = 0; i < attributes.length; i += 2)
				button.setAttribute(attributes[i], attributes[i + 1]);
		}
		return button;
	}

	private finishFadeIn(resolve: () => void): void {
		setTimeout(() => {
			this.resize();

			View.refreshGL(this);

			View.cover.classList.remove("visible");

			setTimeout(() => {
				View._fading = false;
				View.popHistoryStateIfNecessary();
				document.body.removeChild(View.cover);
				this.fadeInFinished();
				resolve();
			}, 520);
		}, 50);
	}

	private fadeIn(): Promise<void> | null {
		if (View._fading || View.currentView === this)
			return null;

		View._fading = true;

		View.currentView = this;

		return new Promise((resolve, reject) => {
			const initialElements = this.initialElements;
			if (initialElements && !this.attached) {
				for (let i = 0; i < initialElements.length; i++) {
					const element = initialElements[i];
					if (element)
						View.main.appendChild(element);
				}

				this.attached = true;
				const promise = this.attach();

				if (promise) {
					promise.then(() => {
						this.finishFadeIn(resolve);
					}, (reason) => {
						console.error(reason);
					});
					return;
				}
			}

			this.finishFadeIn(resolve);
		});
	}

	private fadeOut(saveViewInStack: boolean): Promise<void> | null {
		if (View._fading || View.currentView !== this)
			return null;

		View._fading = true;

		if (View.backgroundFrameRequest) {
			cancelAnimationFrame(View.backgroundFrameRequest);
			View.backgroundFrameRequest = 0;
		}

		return new Promise((resolve, reject) => {
			document.body.appendChild(View.cover);

			setTimeout(() => {
				View.cover.classList.add("visible");

				setTimeout(async () => {
					await this.destroy(saveViewInStack);
					if (saveViewInStack)
						View.viewStack.push(this);
					View.currentView = null;
					View._fading = false;
					View.pushHistoryStateIfNecessary();
					resolve();
				}, 520);
			}, 50);
		});
	}

	protected fadeTo(newViewFactory: () => View, saveViewInStack: boolean = false): Promise<void> | null {
		if (View._fading || View.currentView !== this)
			return null;

		const p = this.fadeOut(saveViewInStack);
		if (!p)
			return null;

		return p.then(() => {
			const p = newViewFactory().fadeIn();
			if (p)
				return p;
		});
	}

	protected fadeToPrevious(): Promise<void> | null {
		if (View._fading || View.currentView !== this || !View.viewStack.length)
			return null;

		const p = this.fadeOut(false);
		if (!p)
			return null;

		return p.then(() => {
			const p = (View.viewStack.pop() as View).fadeIn();
			if (p)
				return p;
		});
	}
}
