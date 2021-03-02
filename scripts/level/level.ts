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

interface LevelInfo {
	name: string;
	createdAt: number;
	modifiedAt: number;
	width: number;
	height: number;
	thumbnailImage: string;
}

interface LevelFullInfo extends LevelInfo {
	image: string;
	processedImage: string;
	polygons: Polygon[];
	objects: LevelObject[];
}

class Level implements LevelFullInfo {
	public static readonly MaxPolygonCountMessage = "Level.MaxPolygonCount";
	public static readonly MaxPointCountMessage = "Level.MaxPointCount";
	public static readonly MaxPolygonCount = 5000;
	public static readonly MaxPointCount = 20000;
	public static readonly MaxObjectCount = 256;
	public static readonly MaxBallCount = 40;

	public name = "";
	public createdAt = 0;
	public modifiedAt = 0;
	public width = baseWidth;
	public height = maxHeight;
	public thumbnailImage = "";
	public image = "";
	public processedImage = "";
	public polygons: Polygon[] = [];
	public objects: LevelObject[] = [];

	public levelPtr = 0;

	public toJSON(): LevelFullInfo {
		return this.toLevelFullInfo();
	}

	public toLevelFullInfo(): LevelFullInfo {
		return {
			name: this.name,
			createdAt: this.createdAt,
			modifiedAt: this.modifiedAt,
			width: this.width,
			height: this.height,
			thumbnailImage: this.thumbnailImage,
			image: this.image,
			processedImage: this.processedImage,
			polygons: this.polygons,
			objects: this.objects
		};
	}

	public toLevelInfo(): LevelInfo {
		return {
			name: this.name,
			createdAt: this.createdAt,
			modifiedAt: this.modifiedAt,
			width: this.width,
			height: this.height,
			thumbnailImage: this.thumbnailImage
		};
	}

	public static revive(level: any): Level | null {
		const newLevel = new Level();
		if (level) {
			if ((typeof level) === "string")
				level = JSON.parse(level);
			if (level) {
				for (let p in newLevel) {
					if ((typeof (newLevel as any)[p]) === "function")
						continue;
					(newLevel as any)[p] = level[p];
				}
			}
		}
		newLevel.levelPtr = 0;
		newLevel.name = (newLevel.name || "").trim();
		if (!newLevel.createdAt || newLevel.createdAt < 0)
			newLevel.createdAt = 0;
		if (!newLevel.modifiedAt || newLevel.modifiedAt < 0)
			newLevel.modifiedAt = 0;
		newLevel.width = baseWidth;
		if (!newLevel.height || newLevel.height <= iconSize || newLevel.height > maxHeight)
			newLevel.height = maxHeight;
		else
			newLevel.height = parseInt(newLevel.height.toString());
		if (!newLevel.image)
			newLevel.image = "";
		if (!newLevel.processedImage)
			newLevel.processedImage = "";
		else if (!newLevel.image)
			newLevel.image = newLevel.processedImage;
		if (!newLevel.thumbnailImage)
			newLevel.thumbnailImage = "";
		if (!newLevel.polygons) {
			newLevel.polygons = [];
		} else {
			if (newLevel.polygons.length > Level.MaxPolygonCount)
				return null;
			let totalPointCount = 0;
			for (let i = newLevel.polygons.length - 1; i >= 0; i--) {
				newLevel.polygons[i] = Polygon.revive(newLevel.polygons[i]);
				totalPointCount += newLevel.polygons[i].points.length;
				if (totalPointCount > Level.MaxPointCount)
					return null;
			}
		}
		if (!newLevel.objects) {
			newLevel.objects = [];
		} else {
			if (newLevel.objects.length > Level.MaxObjectCount)
				return null;
			let ballCount = 0;
			for (let i = newLevel.objects.length - 1; i >= 0; i--) {
				newLevel.objects[i] = LevelObject.revive(newLevel.objects[i]);
				if (newLevel.objects[i].type === LevelObject.TypeBall) {
					ballCount++;
					if (ballCount > Level.MaxBallCount)
						return null;
				}
			}
		}
		return newLevel;
	}

	public async prepare(): Promise<void> {
		if (this.image && (!this.processedImage || !this.thumbnailImage)) {
			const image = await loadImage(this.image);

			const canvas = document.createElement("canvas") as HTMLCanvasElement;
			canvas.width = thumbnailWidth;
			canvas.height = thumbnailHeight;
			const context = canvas.getContext("2d", { alpha: true });
			if (!context)
				throw new Error("Null context");
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.drawImage(image, 0, 0, image.width >> 2, image.height >> 2);
			removeSemiAlpha(canvas, context);

			this.thumbnailImage = canvas.toDataURL("image/png");

			canvas.width = baseWidth;
			canvas.height = (maxHeight <= image.height ? maxHeight : image.height);
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.drawImage(image, 0, 0);

			this.width = baseWidth;
			[this.polygons, this.height] = processImage(canvas, context, false);
			if (this.height < iconSize) {
				this.height = iconSize;
			} else {
				this.height++;
				if (this.height > maxHeight)
					this.height = maxHeight;
			}

			if (this.polygons.length > Level.MaxPolygonCount)
				throw new Error(Level.MaxPolygonCountMessage);

			let totalPointCount = 0;
			for (let i = this.polygons.length - 1; i >= 0; i--)
				totalPointCount += this.polygons[i].points.length;

			if (totalPointCount > Level.MaxPointCount)
				throw new Error(Level.MaxPointCountMessage);

			const resizedHeight = this.height;

			for (let i = this.objects.length - 1; i >= 0; i--) {
				const bottom = this.objects[i].y + iconRadius;
				if (this.height < bottom)
					this.height = bottom;
			}

			if (this.height > maxHeight)
				this.height = maxHeight;

			let resizedCanvas: HTMLCanvasElement = canvas;
			let resizedContext: CanvasRenderingContext2D = context;
			if (resizedHeight !== canvas.height) {
				resizedCanvas = document.createElement("canvas") as HTMLCanvasElement;
				resizedCanvas.width = baseWidth;
				resizedCanvas.height = resizedHeight;
				const tempContext = resizedCanvas.getContext("2d", { alpha: true });
				if (!tempContext)
					throw new Error("Null resized context");
				resizedContext = tempContext;

				resizedContext.clearRect(0, 0, resizedCanvas.width, resizedCanvas.height);
				resizedContext.drawImage(image, 0, 0);
				this.image = resizedCanvas.toDataURL("image/png");

				resizedContext.clearRect(0, 0, resizedCanvas.width, resizedCanvas.height);
				resizedContext.drawImage(canvas, 0, 0);
			}
			this.processedImage = resizedCanvas.toDataURL("image/png");
		}
	}

	public viewResized(): void {
		if (this.levelPtr)
			cLib._viewResized(this.levelPtr, baseWidth, baseHeight);
	}

	private createLevelPtr(preview: boolean): void {
		this.destroyLevelPtr();

		const polygons = this.polygons;
		const objects = this.objects;

		let wallCount = 4;

		for (let i = polygons.length - 1; i >= 0; i--) {
			const l = polygons[i].points.length;
			wallCount += (l === 2 ? 1 : l);
		}

		const objectCount = this.objects.length,
			lastStack: number = cLib.stackSave(),
			buffer = cLib.HEAP8.buffer as ArrayBuffer,
			wallCountDoubleSize = wallCount << 3,
			objectCountIntSize = objectCount << 2,
			objectCountDoubleSize = objectCount << 3,
			wallX0Ptr: number = cLib.stackAlloc(wallCountDoubleSize),
			wallY0Ptr: number = cLib.stackAlloc(wallCountDoubleSize),
			wallX1Ptr: number = cLib.stackAlloc(wallCountDoubleSize),
			wallY1Ptr: number = cLib.stackAlloc(wallCountDoubleSize),
			objectTypePtr: number = cLib.stackAlloc(objectCountIntSize),
			objectXPtr: number = cLib.stackAlloc(objectCountDoubleSize),
			objectYPtr: number = cLib.stackAlloc(objectCountDoubleSize),
			objectRadiusPtr: number = cLib.stackAlloc(objectCountDoubleSize),
			wallX0 = new Float32Array(buffer, wallX0Ptr, wallCount),
			wallY0 = new Float32Array(buffer, wallY0Ptr, wallCount),
			wallX1 = new Float32Array(buffer, wallX1Ptr, wallCount),
			wallY1 = new Float32Array(buffer, wallY1Ptr, wallCount),
			objectType = new Int32Array(buffer, objectTypePtr, objectCount),
			objectX = new Float32Array(buffer, objectXPtr, objectCount),
			objectY = new Float32Array(buffer, objectYPtr, objectCount),
			objectRadius = new Float32Array(buffer, objectRadiusPtr, objectCount);

		// Add 4 invisible walls around the level
		wallX0[0] = -1;
		wallY0[0] = -1;
		wallX1[0] = this.width;
		wallY1[0] = -1;
		wallX0[1] = this.width;
		wallY0[1] = -1;
		wallX1[1] = this.width;
		wallY1[1] = this.height;
		wallX0[2] = this.width;
		wallY0[2] = this.height;
		wallX1[2] = -1;
		wallY1[2] = this.height;
		wallX0[3] = -1;
		wallY0[3] = this.height;
		wallX1[3] = -1;
		wallY1[3] = -1;
		
		for (let i = 0, w = 4; i < polygons.length; i++) {
			const points = polygons[i].points;
			const lastPoint = points.length - 1;

			for (let p = 0; p < lastPoint; p++) {
				wallX0[w] = points[p].x;
				wallY0[w] = points[p].y;
				wallX1[w] = points[p + 1].x;
				wallY1[w] = points[p + 1].y;
				w++;
			}

			if (lastPoint > 1) {
				wallX0[w] = points[lastPoint].x;
				wallY0[w] = points[lastPoint].y;
				wallX1[w] = points[0].x;
				wallY1[w] = points[0].y;
				w++;
			}
		}

		for (let i = 0; i < objectCount; i++) {
			const object = objects[i];
			objectType[i] = object.type;
			objectX[i] = object.x;
			objectY[i] = object.y;
			objectRadius[i] = object.radius;
		}

		const levelPtr = cLib._init(this.height, baseWidth, baseHeight, wallCount, wallX0Ptr, wallY0Ptr, wallX1Ptr, wallY1Ptr, objectCount, objectTypePtr, objectXPtr, objectYPtr, objectRadiusPtr, preview);
		this.levelPtr = levelPtr;

		cLib.stackRestore(lastStack);
	}

	public destroyLevelPtr(): void {
		if (this.levelPtr) {
			cLib._destroy(this.levelPtr);
			this.levelPtr = 0;
		}
	}

	public clearImage(): void {
		this.width = baseWidth;
		this.height = maxHeight;
		this.image = "";
		this.processedImage = "";
		this.thumbnailImage = "";
	}

	public clearObjects(): void {
		this.polygons = [];
		this.objects = [];
	}

	public restart(preview: boolean): void {
		this.createLevelPtr(preview);
	}

	public step(paused: boolean): void {
		if (!this.levelPtr)
			return;

		cLib._step(this.levelPtr, ControlMode.accelerationX, ControlMode.accelerationY, ControlMode.mode, paused);
	}
}
