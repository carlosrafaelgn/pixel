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

class EditorView extends View {
	private static readonly brushesImageDataBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFUAAAAnAQAAAABWZDk9AAAAAnRSTlMAAQGU/a4AAACkSURBVChTrdExCsIwGIbhNxRMB7FrB8FrOAjtUXoERwfBHK29SY6QMUPoL8lfW0Rx8pue+f2YkhUjEoxEXKwSD3F0Ea4m0s3QRBgInBLYCD0DTQDzsgeKe+wI3HDj5qnYAWekGKB9t2dkl10jwWyOleewOFnPPhtEJHBcHbmsTtxXi0mb5V+es+rfluz2i5cOZdrn09pTrZ3V2l+tv6j1r8X5xycuusr5PaBWcwAAAABJRU5ErkJggg==";

	private static readonly ToolPencil = 0;
	private static readonly ToolEraser = 1;
	private static readonly ToolBall = 2;
	private static readonly ToolGoal = 3;
	private static readonly ToolBomb = 4;
	private static readonly ToolCucumber = 5;
	private static readonly ToolDeleteObject = 6;
	private static readonly FirstObjectTool = EditorView.ToolBall;
	private static readonly ObjectToolCount = 5;

	private static readonly BrushOffsets = [0, 10, 26, 46];
	private static readonly BrushWidths = [9, 15, 19, 39];

	private readonly baseElement: HTMLDivElement;
	private readonly fileInput: HTMLInputElement;
	private readonly toolbarTop: HTMLDivElement;
	private readonly toolbarBottom: HTMLDivElement;
	private readonly scrollContainer: ScrollContainer;
	private readonly canvas: HTMLCanvasElement;

	private readonly pointerCursor: HTMLDivElement;

	private readonly selectionView: boolean;

	private readonly boundDocumentKeyUp: any;

	private tool: number;
	private dirty: boolean;
	private context: CanvasRenderingContext2D;
	private contextGlobalCompositeOperation: string;
	private lastPencilColor: number;
	private lastPencilRainbowIndex: number;
	private lastBrushWidth: number;
	private lastObjectType: number;
	private brushCanvas: HTMLCanvasElement;
	private brushContext: CanvasRenderingContext2D;
	private loadOptions: LevelLoadOptions | null;
	private level: Level;
	private levelBallCount: number;

	private pointerHandler: PointerHandler | null;
	private pointerLastX: number;
	private pointerLastY: number;
	private pointerCursorAttached: boolean;

	private objectImages: ObjectImageHTMLSpanElement[];
	private objectImageDrag: ObjectImageHTMLSpanElement | null;
	private objectImageDragOffsetXCss: number;
	private objectImageDragOffsetYCss: number;
	private firstPencilButtonIndex: number;
	private firstLineWidthButtonIndex: number;
	private firstObjectToolButtonIndex: number;

	private keyUpTime: number;
	private keyUpCounter: number;

	public constructor(loadOptions?: LevelLoadOptions) {
		super();

		this.baseElement = document.createElement("div");
		this.baseElement.className = "base-element fixed-bg";
		this.baseElement.innerHTML = `
		<div class="hidden-container"><input id="fileInput" type="file" accept="image/*" tabindex="-1" /></div>
		<div id="toolbarTop" class="toolbar toolbar-top"></div>
		<div id="container"></div>
		<div id="toolbarBottom" class="toolbar toolbar-bottom"></div>
		`;
		this.initialElements.push(this.baseElement);

		this.fileInput = this.baseElement.querySelector("#fileInput") as HTMLInputElement;
		this.toolbarTop = this.baseElement.querySelector("#toolbarTop") as HTMLDivElement;
		this.toolbarBottom = this.baseElement.querySelector("#toolbarBottom") as HTMLDivElement;
		this.scrollContainer = new ScrollContainer(null, true, "scroll-container-editor", this.baseElement.querySelector("#container") as HTMLDivElement);
		this.setGridBackground();
		this.canvas = document.createElement("canvas") as HTMLCanvasElement;
		this.canvas.className = "transform-top-left";
		this.canvas.width = baseWidth;
		this.canvas.height = maxHeight;
		this.scrollContainer.containerElement.appendChild(this.canvas);

		this.pointerCursor = document.createElement("div");
		this.pointerCursor.className = "pointer-cursor";

		const toolbarTop = this.toolbarTop, toolbarBottom = this.toolbarBottom;

		this.createButton(toolbarTop, UISpriteSheet.Back, this.back.bind(this)).style.float = "left";

		this.firstPencilButtonIndex = this.buttons.length;
		const pencilClick = this.changeToolPencil.bind(this);
		for (let i = 0; i < colors.length - 1; i++)
			(this.createButton(toolbarTop, UISpriteSheet.Border, pencilClick, "data-i", i.toString()).firstChild as HTMLSpanElement).style.backgroundColor = colorsCss[i];
		this.createButton(toolbarTop, UISpriteSheet.Rainbow, pencilClick, "data-i", (colors.length - 1).toString());
		this.createButton(toolbarTop, UISpriteSheet.Eraser, this.changeToolEraser.bind(this));

		this.firstLineWidthButtonIndex = this.buttons.length;
		const lineWidthClick = this.changeBrushWidth.bind(this);
		this.createButton(toolbarBottom, UISpriteSheet.LineWidth0, lineWidthClick, "data-i", "0");
		this.createButton(toolbarBottom, UISpriteSheet.LineWidth1, lineWidthClick, "data-i", "1");
		this.createButton(toolbarBottom, UISpriteSheet.LineWidth2, lineWidthClick, "data-i", "2");
		this.createButton(toolbarBottom, UISpriteSheet.LineWidth3, lineWidthClick, "data-i", "3");

		this.firstObjectToolButtonIndex = this.buttons.length;
		for (let i = LevelObject.TypeBall; i <= LevelObject.LastType; i++)
			this.createButton(toolbarBottom, LevelObject.ImagesByType[i], this.changeTool.bind(this), "data-tool", (EditorView.ToolBall + i - LevelObject.TypeBall).toString());
		this.buttonsWithLargeMargin.push(this.buttons[this.firstObjectToolButtonIndex]);
		this.createButton(toolbarBottom, UISpriteSheet.Eraser, this.changeTool.bind(this), "data-tool", EditorView.ToolDeleteObject.toString());

		this.buttonsWithLargeMargin.push(this.createButton(toolbarBottom, UISpriteSheet.Open, this.open.bind(this)));
		this.createButton(toolbarBottom, UISpriteSheet.Download, this.download.bind(this));
		this.createButton(toolbarBottom, UISpriteSheet.Clear, this.clear.bind(this));
		if (LevelCache.isSupported())
			this.createButton(toolbarBottom, UISpriteSheet.Accept, this.accept.bind(this)).style.float = "right";
		this.createButton(toolbarBottom, UISpriteSheet.Play, this.play.bind(this)).style.float = "right";

		this.fileInput.onchange = this.openFile.bind(this);

		this.selectionView = !!loadOptions;

		this.boundDocumentKeyUp = ((!androidWrapper && !isPWA) ? this.documentKeyUp.bind(this) : null);

		this.tool = EditorView.ToolPencil;
		this.dirty = false;
		this.context = null as any;
		this.contextGlobalCompositeOperation = "source-over";
		this.lastPencilColor = 0;
		this.lastPencilRainbowIndex = 0;
		this.lastBrushWidth = 0;
		this.lastObjectType = LevelObject.TypeBall;
		this.brushCanvas = null as any;
		this.brushContext = null as any;
		this.loadOptions = (loadOptions || null);
		this.level = null as any;
		this.levelBallCount = 0;

		this.pointerHandler = null;
		this.pointerLastX = 0;
		this.pointerLastY = 0;
		this.pointerCursorAttached = false;

		this.objectImages = [];
		this.objectImageDrag = null;
		this.objectImageDragOffsetXCss = 0;
		this.objectImageDragOffsetYCss = 0;

		this.keyUpTime = 0;
		this.keyUpCounter = 0;

		this.highlightTool();
	}

	private setGridBackground(): void {
		this.scrollContainer.containerElement.style.backgroundImage = `url('assets/images/grid${(scaleFactor <= 5) ? scaleFactor : 1}.png')`;
	}

	protected get pausedBackground(): boolean {
		return true;
	}

	protected resize(): void {
		const canvasBackgroundSize = css(63),
			baseWidthCss = css(baseWidth),
			maxHeightCss = css(maxHeight),
			brushWidthCss = css(EditorView.BrushWidths[this.lastBrushWidth]);

		this.toolbarTop.style.height = toolbarAvailableHeightCss;
		this.toolbarTop.style.borderBottomWidth = borderWidthCss;

		this.toolbarBottom.style.height = toolbarAvailableHeightCss;
		this.toolbarBottom.style.borderTopWidth = borderWidthCss;

		// Try to save memory without compromising the crispness
		if (isIOSOrSafari) {
			this.canvas.style.width = baseWidthCss;
			this.canvas.style.height = maxHeightCss;
		} else {
			this.canvas.style.width = (baseWidth / pixelRatio) + "px";
			this.canvas.style.height = (maxHeight / pixelRatio) + "px";
			applyCSSTransform(this.canvas, `scale(${scaleFactor}, ${scaleFactor})`);
			this.scrollContainer.containerElement.style.height = maxHeightCss;
		}

		this.setGridBackground();
		this.scrollContainer.containerElement.style.backgroundSize = canvasBackgroundSize + " " + canvasBackgroundSize;
		this.scrollContainer.resize(toolbarTotalHeight, baseHeight - (toolbarTotalHeight << 1));

		this.pointerCursor.style.borderWidth = borderWidthCss;
		this.pointerCursor.style.width = brushWidthCss;
		this.pointerCursor.style.height = brushWidthCss;

		const objects = this.level.objects;
		for (let i = objects.length - 1; i >= 0; i--) {
			const object = objects[i],
				objectImage = this.objectImages[i];
			objectImage.style.left = css(object.x - iconRadius);
			objectImage.style.top = css(object.y - iconRadius);
			UISpriteSheet.resize(objectImage);
		}

		super.resize();
	}

	protected async attach(): Promise<void> {
		View.glCanvas.style.display = "none";

		if (!this.level) {
			const level = await LevelCache.loadLevelFromOptions(this.loadOptions);
			this.level = (level || new Level());
			if (this.loadOptions) {
				if (this.loadOptions.levelNameOverride)
					this.level.name = this.loadOptions.levelNameOverride;
				this.loadOptions = null;
			}

			const objects = this.level.objects,
				objectCount = objects.length;
			for (let i = 0; i < objectCount; i++)
				this.addObject(objects[i], true);
		}

		this.pointerHandler = new PointerHandler(this.canvas, this.mouseDown.bind(this), this.mouseMove.bind(this), this.mouseUp.bind(this));

		this.scrollContainer.attach();

		const image = await loadImage(EditorView.brushesImageDataBase64);

		this.brushCanvas = document.createElement("canvas");
		this.brushCanvas.width = image.width;
		this.brushCanvas.height = image.height;
		const brushContext = this.brushCanvas.getContext("2d", { alpha: true });
		if (!brushContext)
			throw new Error("Null brushContext");
		this.brushContext = brushContext;
		this.brushContext.drawImage(image, 0, 0);
		this.updateBrushColor(colors[this.lastPencilColor]);

		const context = this.canvas.getContext("2d", { alpha: true });
		if (!context)
			throw new Error("Null context");
		this.context = context;
		this.context.globalCompositeOperation = "source-over";
		this.context.clearRect(0, 0, baseWidth, maxHeight);
		setContextQuality(this.context, false);

		if (this.level.image)
			this.context.drawImage(await loadImage(this.level.image), 0, 0);

		this.context.globalCompositeOperation = this.contextGlobalCompositeOperation;

		if (this.boundDocumentKeyUp)
			document.addEventListener("keyup", this.boundDocumentKeyUp, true);
	}

	protected async detach(): Promise<void> {
		View.glCanvas.style.display = "";

		if (this.pointerHandler) {
			this.pointerHandler.destroy();
			this.pointerHandler = null;
		}

		this.scrollContainer.detach();

		this.context = null as any;
		this.brushCanvas = null as any;
		this.brushContext = null as any;

		if (this.boundDocumentKeyUp)
			document.removeEventListener("keyup", this.boundDocumentKeyUp, true);
	}

	protected destroyInternal(partial: boolean): void {
		this.save();
	}

	private save(): void {
		if (!this.dirty && this.level.image)
			return;

		this.level.modifiedAt = (new Date()).getTime();
		if (!this.level.createdAt)
			this.level.createdAt = this.level.modifiedAt;
		this.level.thumbnailImage = "";
		this.level.image = this.canvas.toDataURL("image/png");
		this.level.processedImage = "";
		this.level.polygons = [];

		LevelCache.saveEditorLevel(this.level);
		this.dirty = false;
	}

	private updatePointerCursor(xCss: number, yCss: number): void {
		const halfLineWidth = cssNumber((EditorView.BrushWidths[this.lastBrushWidth] * 0.5) + 1);
		this.pointerCursor.style.left = (xCss - halfLineWidth) + "px";
		this.pointerCursor.style.top = (yCss - halfLineWidth + this.scrollContainer.topCss) + "px";
	}

	private mouseDown(e: MouseEvent): boolean {
		if (View.loading)
			return false;

		const rect = this.scrollContainer.containerElement.getBoundingClientRect();

		const xCss = e.clientX - rect.left,
			yCss = e.clientY - rect.top;

		this.dirty = true;

		switch (this.tool) {
			case EditorView.ToolPencil:
			case EditorView.ToolEraser:
				if (!this.pointerCursorAttached) {
					this.pointerCursorAttached = true;
					this.updatePointerCursor(xCss, yCss);
					this.scrollContainer.element.appendChild(this.pointerCursor);
				}
				this.draw((this.pointerLastX = (model(xCss) - 1)) + 1, this.pointerLastY = model(yCss));
				break;
			default:
				this.handleObjectToolDown(xCss, yCss);
				break;
		}

		return true;
	}

	private mouseMove(e: MouseEvent): void {
		const rect = this.scrollContainer.containerElement.getBoundingClientRect();

		const xCss = e.clientX - rect.left,
			yCss = e.clientY - rect.top;

		switch (this.tool) {
			case EditorView.ToolPencil:
			case EditorView.ToolEraser:
				const x = model(xCss),
					y = model(yCss);
				if (this.pointerLastX !== x || this.pointerLastY !== y) {
					this.updatePointerCursor(xCss, yCss);
					this.draw(x, y);
					this.pointerLastX = x;
					this.pointerLastY = y;
				}
				break;
			default:
				this.handleObjectToolMove(xCss, yCss);
				break;
		}
	}

	private mouseUp(): void {
		this.objectImageDrag = null;

		if (this.pointerCursorAttached) {
			this.pointerCursorAttached = false;
			this.scrollContainer.element.removeChild(this.pointerCursor);
		}

		switch (this.tool) {
			case EditorView.ToolPencil:
			case EditorView.ToolEraser:
				return;
		}

		// Sort all objects by type / y coordinate in the opposite way they should appear on the screen
		const objects = this.level.objects,
			objectImages = this.objectImages;
		
		// Make the balls appear above all other objects and make objects with greater y appear
		// above all other objects of its kind (considering we are drawing from the last to the first)
		objectImages.sort((a, b) => {
			const oa = a.object, ob = b.object;
			return ((oa.type - ob.type) || (ob.y - oa.y));
		});

		for (let i = objectImages.length - 1, z = 1; i >= 0; i--, z++) {
			const objectImage = objectImages[i];
			objectImage.style.zIndex = z.toString();
			objects[i] = objectImage.object;
		}
	}

	private draw(x: number, y: number): void {
		let dx = x - this.pointerLastX,
			dy = y - this.pointerLastY;

		const absDx = Math.abs(dx),
			absDy = Math.abs(dy);

		if (absDx || absDy) {
			const width = EditorView.BrushWidths[this.lastBrushWidth],
				radius = width >> 1,
				offset = EditorView.BrushOffsets[this.lastBrushWidth];

			let maxDelta = Math.max(absDx, absDy),
				i = this.pointerLastX,
				j = this.pointerLastY;

			dx /= maxDelta;
			dy /= maxDelta;

			while (maxDelta > 0) {
				maxDelta--;
				i += dx;
				j += dy;

				if (!(maxDelta & 1)) {
					if (this.lastPencilColor === (colors.length - 1)) {
						this.lastPencilRainbowIndex++;
						if (this.lastPencilRainbowIndex >= rainbowColors.length)
							this.lastPencilRainbowIndex = 0;
						this.updateBrushColor(rainbowColors[this.lastPencilRainbowIndex]);
					}
					this.context.drawImage(this.brushCanvas, offset, 0, width, width, (i | 0) - radius, (j | 0) - radius, width, width);
				}
			}
		}
	}

	private handleObjectToolDown(xCss: number, yCss: number): void {
		const x = model(xCss),
			y = model(yCss);

		if (this.tool >= EditorView.ToolBall && this.tool <= EditorView.ToolCucumber) {
			this.objectImageDrag = this.findObjectWithinRadius(-1, x, y);
			if (!this.objectImageDrag) {
				this.objectImageDrag = this.addObject(new LevelObject(this.lastObjectType, x, y), false);
				if (!this.objectImageDrag)
					return;
			}

			const parentRect = this.scrollContainer.containerElement.getBoundingClientRect(),
				rect = this.objectImageDrag.getBoundingClientRect();

			this.objectImageDragOffsetXCss = (rect.left - parentRect.left) - xCss;
			this.objectImageDragOffsetYCss = (rect.top - parentRect.top) - yCss;
		} else {
			const objectImage = this.findObjectWithinRadius(-1, x, y);
			if (objectImage)
				this.removeObject(objectImage);
		}
	}

	private handleObjectToolMove(xCss: number, yCss: number): void {
		if (this.tool >= EditorView.ToolBall && this.tool <= EditorView.ToolCucumber && this.objectImageDrag) {
			const object = this.objectImageDrag.object;
			if (object) {
				object.move(
					model(xCss + this.objectImageDragOffsetXCss) + iconRadius,
					model(yCss + this.objectImageDragOffsetYCss) + iconRadius
				);

				this.objectImageDrag.style.left = css(object.x - iconRadius);
				this.objectImageDrag.style.top = css(object.y - iconRadius);
			}
		}
	}

	private highlightTool(): void {
		let i = this.firstPencilButtonIndex,
			e = i + (this.tool === EditorView.ToolEraser ? colors.length : this.lastPencilColor);
		for (; i < e; i++)
			this.buttons[i].style.backgroundColor = "";

		if (this.tool === EditorView.ToolPencil || this.tool === EditorView.ToolEraser)
			this.buttons[i++].style.backgroundColor = "#fff";

		e = this.firstPencilButtonIndex + colors.length;
		for (; i <= e; i++)
			this.buttons[i].style.backgroundColor = "";

		i = this.firstLineWidthButtonIndex;
		e = i + this.lastBrushWidth;
		for (; i < e; i++)
			this.buttons[i].style.backgroundColor = "";

		if (this.tool === EditorView.ToolPencil || this.tool === EditorView.ToolEraser)
			this.buttons[i++].style.backgroundColor = "#fff";

		e = this.firstLineWidthButtonIndex + EditorView.BrushWidths.length;
		for (; i < e; i++)
			this.buttons[i].style.backgroundColor = "";

		i = this.firstObjectToolButtonIndex;
		e = i + this.tool - EditorView.FirstObjectTool;
		for (; i < e; i++)
			this.buttons[i].style.backgroundColor = "";

		if (this.tool >= EditorView.FirstObjectTool)
			this.buttons[i++].style.backgroundColor = "#fff";

		e = this.firstObjectToolButtonIndex + EditorView.ObjectToolCount;
		for (; i < e; i++)
			this.buttons[i].style.backgroundColor = "";

		this.canvas.style.opacity = (this.tool === EditorView.ToolDeleteObject ? "0.25" : "");
	}

	private updateBrushColor(color: number): void {
		const brushImageData = this.brushContext.getImageData(0, 0, this.brushCanvas.width, this.brushCanvas.height),
			data = new Int32Array(brushImageData.data.buffer);

		for (let i = data.length - 1; i >= 0; i--) {
			if ((data[i] & 0xff000000))
				data[i] = color;
		}

		this.brushContext.putImageData(brushImageData, 0, 0);
	}

	private clearImage(): void {
		this.dirty = true;
		this.context.clearRect(0, 0, baseWidth, maxHeight);
		this.level.clearImage();
		this.scrollContainer.scrollTo(0);
	}

	private findObjectWithinRadius(type: number, x: number, y: number): ObjectImageHTMLSpanElement | null {
		const objects = this.level.objects,
			objectCount = objects.length,
			radiusSq = iconSize * iconSize;

		for (let i = 0; i < objectCount; i++) {
			const object = objects[i];
			if (type >= 0 && object.type !== type)
				continue;

			let dx = x - object.x,
				dy = y - object.y;
			dx *= dx;
			dy *= dy;

			if (radiusSq >= (dx + dy))
				return this.objectImages[i];
		}
		return null;
	}

	private addObject(object: LevelObject, skipAddToLevel: boolean): ObjectImageHTMLSpanElement | null {
		if (!skipAddToLevel) {
			if (this.level.objects.length >= Level.MaxObjectCount) {
				Modal.show({ html: Strings.TooManyObjects + UISpriteSheet.html(UISpriteSheet.Error) });
				return null;
			}

			if (this.levelBallCount >= Level.MaxBallCount && object.type == LevelObject.TypeBall) {
				Modal.show({ html: Strings.TooManyBalls + UISpriteSheet.html(UISpriteSheet.Error) });
				return null;
			}
		}

		const objectImage = UISpriteSheet.create(LevelObject.ImagesByType[object.type]);
		objectImage.style.position = "absolute";
		objectImage.style.zIndex = (skipAddToLevel ? (this.level.objects.length - this.objectImages.length) : (1 + this.objectImages.length)).toString();
		objectImage.style.left = css(object.x - iconRadius);
		objectImage.style.top = css(object.y - iconRadius);
		objectImage.style.pointerEvents = "none";
		objectImage.object = object;
		this.scrollContainer.containerElement.appendChild(objectImage);
		this.objectImages.push(objectImage);

		if (!skipAddToLevel)
			this.level.objects.push(object);

		if (object.type == LevelObject.TypeBall)
			this.levelBallCount++;

		return objectImage;
	}

	private removeObject(objectImage: ObjectImageHTMLSpanElement): void {
		if (!objectImage || !objectImage.object)
			return;

		const objectImages = this.objectImages;
		for (let i = objectImages.length - 1; i >= 0; i--) {
			if (objectImages[i] === objectImage) {
				this.scrollContainer.containerElement.removeChild(objectImage);

				objectImages.splice(i, 1);

				if (this.level.objects[i].type === LevelObject.TypeBall)
					this.levelBallCount--;

				this.level.objects.splice(i, 1);

				break;
			}
		}
	}

	private clearObjects(): void {
		this.dirty = true;

		const containerElement = this.scrollContainer.containerElement,
			objectImages = this.objectImages;

		for (let i = objectImages.length - 1; i >= 0; i--)
			containerElement.removeChild(objectImages[i]);

		this.objectImages = [];
		this.level.clearObjects();
		this.levelBallCount = 0;
		this.scrollContainer.scrollTo(0);
	}

	private back(): boolean {
		const selectionView = this.selectionView;
		return (this.fadeTo(() => (selectionView ? new SelectionView() : new TitleView())) ? true : false);
	}

	private changeToolPencil(e: Event): boolean {
		this.tool = EditorView.ToolPencil;
		const button = (((e.target as HTMLElement).tagName === "IMG") ? (e.target as HTMLElement).parentNode as HTMLElement : (e.target as HTMLElement));
		this.lastPencilColor = parseInt(button.getAttribute("data-i") as any);
		this.context.globalCompositeOperation = this.contextGlobalCompositeOperation = "source-over";
		this.updateBrushColor(colors[this.lastPencilColor]);
		this.highlightTool();
		return true;
	}

	private changeToolEraser(): boolean {
		this.tool = EditorView.ToolEraser;
		this.context.globalCompositeOperation = this.contextGlobalCompositeOperation = "destination-out";
		this.updateBrushColor(0xffffffff);
		this.highlightTool();
		return true;
	}

	private changeBrushWidth(e: Event): boolean {
		if (this.tool !== EditorView.ToolPencil && this.tool !== EditorView.ToolEraser) {
			if (this.contextGlobalCompositeOperation == "destination-out")
				this.tool = EditorView.ToolEraser;
			else
				this.tool = EditorView.ToolPencil;
		}

		const button = (((e.target as HTMLElement).tagName === "IMG") ? (e.target as HTMLElement).parentNode as HTMLElement : (e.target as HTMLElement));

		this.lastBrushWidth = parseInt(button.getAttribute("data-i") as any);

		switch (this.tool) {
			case EditorView.ToolPencil:
			case EditorView.ToolEraser:
				break;
			default:
				this.tool = EditorView.ToolPencil;
				this.context.globalCompositeOperation = this.contextGlobalCompositeOperation = "source-over";
				break;
		}

		const brushWidthCss = css(EditorView.BrushWidths[this.lastBrushWidth]);
		this.pointerCursor.style.width = brushWidthCss;
		this.pointerCursor.style.height = brushWidthCss;
		this.highlightTool();
		return true;
	}

	private changeTool(e: Event): boolean {
		const button = (((e.target as HTMLElement).tagName === "IMG") ? (e.target as HTMLElement).parentNode as HTMLElement : (e.target as HTMLElement));
		this.tool = parseInt(button.getAttribute("data-tool") as any);
		if (this.tool >= EditorView.ToolBall && this.tool <= EditorView.ToolCucumber)
			this.lastObjectType = LevelObject.TypeBall + this.tool - EditorView.ToolBall;
		this.highlightTool();
		return true;
	}

	private openFile(): void {
		if (Modal.visible || !this.fileInput.files || !this.fileInput.files[0])
			return;

		const name = this.fileInput.files[0].name.toLowerCase();
		if (!name.endsWith(".png") && !name.endsWith(".jpg") && !name.endsWith(".jpeg")) {
			Modal.show({ html: Strings.InvalidImage + UISpriteSheet.html(UISpriteSheet.Error) });
			return;
		}

		View.loading = true;

		const reader = new FileReader();
		reader.onload = () => {
			this.fileInput.value = "";

			if (!reader.result) {
				View.loading = false;
				Modal.show({ html: Strings.EmptyImage + UISpriteSheet.html(UISpriteSheet.Error) });
				return;
			}

			loadImage(reader.result as string).then((image) => {
				this.clearImage();

				this.context.globalCompositeOperation = "source-over";
				setContextQuality(this.context, true);

				const w = image.width, h = image.height;

				if (w <= baseWidth && h <= maxHeight) {
					this.context.drawImage(image, (baseWidth - w) >> 1, 0);
				} else {
					let dw = w, dh = h;
					if (dw > baseWidth) {
						dh *= baseWidth / dw;
						dw = baseWidth;
					}
					if (dh > maxHeight) {
						dw *= maxHeight / dh;
						dh = maxHeight;
					}
					dw |= 0;
					dh |= 0;
					this.context.drawImage(image, 0, 0, w, h, (baseWidth - dw) >> 1, 0, dw, dh);
				}

				setContextQuality(this.context, false);

				this.context.globalCompositeOperation = this.contextGlobalCompositeOperation;
			}, () => {
				Modal.show({ html: Strings.ErrorLoadingImage + UISpriteSheet.html(UISpriteSheet.Error) });
			});
		};
		reader.onerror = () => {
			this.fileInput.value = "";
			View.loading = false;
			Modal.show({ html: Strings.ErrorReadingImage + UISpriteSheet.html(UISpriteSheet.Error) });
		};
		reader.readAsDataURL(this.fileInput.files[0]);
	}

	private open(): boolean {
		this.fileInput.click();

		return true;
	}

	private download(): boolean {
		LevelCache.downloadLevelImage(this.level.name, this.canvas).then((result) => {
			switch (result) {
				case LevelCache.DownloadLevelSuccess:
					Modal.show({ title: Strings.Success, html: Strings.LevelImageDownloaded + UISpriteSheet.html(UISpriteSheet.Success) });
					break;
				case LevelCache.DownloadLevelError:
					Modal.show({ html: Strings.SomethingWentWrong + UISpriteSheet.html(UISpriteSheet.Error) });
					break;
				case LevelCache.DownloadLevelNoPermission:
					Modal.show({ html: Strings.TryToDownloadLevelImageAgain });
					break;
				case LevelCache.DownloadLevelFileAlreadyExists:
					Modal.show({ html: Strings.LevelImageDownloadFailedFileExists + UISpriteSheet.html(UISpriteSheet.Error) });
					break;
			}
		}, () => {
			Modal.show({ html: Strings.SomethingWentWrong + UISpriteSheet.html(UISpriteSheet.Error) });
		});

		return true;
	}

	private clear(): boolean {
		Modal.show({
			html: Strings.ClearEntireLevel,
			buttons: [
				{
					defaultCancel: true,
					iconId: UISpriteSheet.Back,
					text: Strings.Cancel,
					onclick: Modal.hide
				},
				{
					iconId: UISpriteSheet.ClearRed,
					text: Strings.Clear,
					className: "danger",
					onclick: () => {
						this.level.name = "";
						this.level.createdAt = 0;
						this.level.modifiedAt = 0;
						this.clearImage();
						this.clearObjects();
						Modal.hide();
					}
				}
			]
		});
		return true;
	}

	private accept(): boolean {
		let ok = false, invalidName = false, error = false;

		this.save();

		Modal.show({
			title: Strings.SaveLevel,
			html: `<label for="name">${Strings.LevelName}</label><input id="name" spellcheck="false" autocomplete="off" />`,
			okcancel: true,
			okcancelsubmit: true,
			onshowing: () => {
				(document.getElementById("name") as HTMLInputElement).value = this.level.name;
			},
			onshown: () => {
				(document.getElementById("name") as HTMLInputElement).focus();
			},
			onok: async () => {
				let name = (document.getElementById("name") as HTMLInputElement).value.trim();
				if (!name) {
					const d = new Date();
					name = `${d.getFullYear()}-${format2(d.getMonth() + 1)}-${format2(d.getDate())} ${format2(d.getHours())}${format2(d.getMinutes())}${format2(d.getSeconds())}`;
				} else if (!LevelCache.isNameValid(name)) {
					invalidName = true;
					Modal.hide();
				}
				
				if (name !== this.level.name) {
					this.level.name = name;
					this.dirty = true;
					this.save();
				}

				View.loading = true;

				try {
					await this.level.prepare();
					await LevelCache.saveLevel(this.level, false);
					ok = true;
				} catch (ex) {
					error = true;
				} finally {
					View.loading = false;
					Modal.hide();
				}
			},
			onhidden: () => {
				if (invalidName)
					Modal.show({ html: Strings.NameCannotContain + " \\ / ? * : < > % " + UISpriteSheet.html(UISpriteSheet.Error) });
				else if (error)
					Modal.show({ html: Strings.SomethingWentWrong + UISpriteSheet.html(UISpriteSheet.Error) });
				else if (ok)
					Modal.show({ title: Strings.Success, html: Strings.LevelSaved + UISpriteSheet.html(UISpriteSheet.Success) });
			}
		});

		return true;
	}

	private play(): boolean {
		this.save();

		View.loading = true;

		this.level.prepare().then(() => {
			View.loading = false;
			this.fadeTo(() => new GameView({ level: this.level }, true), true);
		}, (reason) => {
			View.loading = false;
			if (reason && reason.message) {
				if (reason.message === Level.MaxPolygonCountMessage) {
					Modal.show({ html: Strings.TooManyPolygons + Level.MaxPolygonCount + " " + UISpriteSheet.html(UISpriteSheet.Error) });
					return;
				}

				if (reason.message === Level.MaxPointCountMessage) {
					Modal.show({ html: Strings.TooManyPoints + Level.MaxPointCount + " " + UISpriteSheet.html(UISpriteSheet.Error) });
					return;
				}
			}
			Modal.show({ html: Strings.SomethingWentWrong + UISpriteSheet.html(UISpriteSheet.Error) });
		});

		return true;
	}

	private documentKeyUp(e: KeyboardEvent): void {
		if (View.loading || Modal.visible)
			return;

		if (e.key === "d") {
			this.keyUpTime = Date.now();
			this.keyUpCounter = 1;
		} else {
			switch (this.keyUpCounter) {
				case 1:
					this.keyUpCounter = ((e.key === "b" && (Date.now() - this.keyUpTime) < 2000) ? 2 : 0);
					break;
				case 2:
					if ((Date.now() - this.keyUpTime) < 2000) {
						switch (e.key) {
							case "g":
								if (confirm(Strings.YouWillLoseYourLevel))
									this.devDebug();
								break;
							case "s":
								this.devSave();
								break;
						}
					}
					this.keyUpCounter = 0;
					break;
			}
		}
	}

	private devDebug(): void {
		processImage(this.canvas, this.context, true);
	}

	private async devSave(): Promise<void> {
		this.level.name = "0";
		this.save();

		await this.level.prepare();

		const a1 = document.createElement("a") as HTMLAnchorElement;
		a1.href = this.level.image;
		a1.download = "image.png";
		a1.click();

		const a2 = document.createElement("a") as HTMLAnchorElement;
		a2.href = this.level.processedImage;
		a2.download = "processedImage.png";
		a2.click();

		const a3 = document.createElement("a") as HTMLAnchorElement;
		a3.href = this.level.thumbnailImage;
		a3.download = "thumbnailImage.png";
		a3.click();

		Modal.show({
			html: `I <input id="inputImage" type="file" accept="image/png" />
			P <input id="inputProcessedImage" type="file" accept="image/png" />
			T <input id="inputThumbnailImage" type="file" accept="image/png" />`,
			okcancel: true,
			onok: () => {
				function getFile(id: string): File | null {
					const input = document.getElementById(id) as HTMLInputElement;
					return ((input && input.files) ? input.files[0] : null);
				}

				const fi = getFile("inputImage"),
					fp = getFile("inputProcessedImage"),
					ft = getFile("inputThumbnailImage");

				if (!fi || !fp || !ft)
					return;

				const i = new FileReader();
				i.onload = () => {
					const p = new FileReader();
					p.onload = () => {
						const t = new FileReader();
						t.onload = () => {
							this.level.createdAt = 0;
							this.level.modifiedAt = 0;
							this.level.image = i.result as string;
							this.level.processedImage = p.result as string;
							const thumbnailImage = this.level.thumbnailImage;
							this.level.thumbnailImage = null as any;
							console.log("'" + JSON.stringify(this.level) + "',");
							console.log("'" + t.result as string + "',");
							this.level.thumbnailImage = thumbnailImage;
							Modal.hide();
						};
						t.readAsDataURL(ft);
					};
					p.readAsDataURL(fp);
				};
				i.readAsDataURL(fi);
			}
		});
	}
}
