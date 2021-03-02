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

function removeSemiAlpha(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
	const w = parseInt(canvas.width.toString()),
		h = parseInt(canvas.height.toString()),
		imageData = context.getImageData(0, 0, w, h),
		data = imageData.data; // r g b a r g b a r g b a...

	// This technique works because the pixel data present in the
	// canvas does not have premultiplied alpha.
	//for (let i = data.length - 4 + 3; i >= 0; i -= 4) {
	//	if (data[i])
	//		data[i] = 255;
	//}
	for (let i = data.length - 4; i >= 0; i -= 4) {
		if (data[i + 3] !== 255) {
			data[i] = 0;
			data[i + 1] = 0;
			data[i + 2] = 0;
			data[i + 3] = 0;
		}
	}

	context.putImageData(imageData, 0, 0);
}

async function loadImage(src: string, controlLoading = true): Promise<HTMLImageElement> {
	if (!src)
		throw new Error("Invalid image source");

	if (controlLoading)
		View.loading = true;

	return new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			if (controlLoading)
				View.loading = false;
			resolve(image);
		};
		image.onerror = (event, source, lineno, colno, error) => {
			if (controlLoading)
				View.loading = false;
			reject(error || event);
		};
		image.src = src;
	});
}

function setContextQuality(context: CanvasRenderingContext2D, highQuality: boolean): void {
	try {
		if (("imageSmoothingEnabled" in context))
			context.imageSmoothingEnabled = highQuality;
		if (("imageSmoothingQuality" in context))
			context.imageSmoothingQuality = (highQuality ? "high" : "low");
	} catch (ex) {
		// Just ignore...
	}
}

function processImage(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, debugPolygons: boolean): [Polygon[], number] {
	const buffer = cLib.HEAP8.buffer as ArrayBuffer,
		w = parseInt(canvas.width.toString()),
		h = parseInt(canvas.height.toString()),
		imageData = context.getImageData(0, 0, w, h),
		data = imageData.data, // r g b a r g b a r g b a...
		polygons: Polygon[] = [],
		// Must be in sync with lib/imageProcessing.c
		maxPixelCount = ((baseWidth + 2) * (maxHeight + 2)), // + 2 because we are creating a 1-pixel border around the original image
		maxPointCount = (maxPixelCount >> 1),
		imageInfo = cLib._allocateImageInfo(w, h);

	let maxY = 0;

	try {
		const imageInfoData = new Uint8Array(buffer, cLib._getImageInfoData(imageInfo), data.length);
		const points = new Int32Array(buffer, cLib._getImageInfoPoints(imageInfo), maxPointCount << 1);

		(window as any)["createPolygon"] = (pointCount: number) => {
			const polygon = new Polygon(pointCount);

			for (let i = ((pointCount - 1) << 1); i >= 0; i -= 2)
				polygon.points[i >> 1] = new Point(points[i], points[i + 1]);

			polygons.push(polygon);
		};

		imageInfoData.set(data, 0);

		maxY = cLib._processImage(imageInfo);

		data.set(imageInfoData, 0);

		delete (window as any)["createPolygon"];
	} finally {
		cLib._freeImageInfo(imageInfo);
	}

	context.putImageData(imageData, 0, 0);
	if (debugPolygons) {
		const oldFillStyle = context.fillStyle;
		const oldStrokeStyle = context.strokeStyle;
		const oldLineWidth = context.lineWidth;
		const oldCompositeOperation = context.globalCompositeOperation;
		context.fillStyle = "rgba(0,0,0,0.5)";
		context.strokeStyle = "rgba(0,255,0,0.8)";
		context.lineWidth = 1;
		context.globalCompositeOperation = "source-over";
		context.fillRect(0, 0, w, h);
		let tp = 0, i = 0;
		for (i = polygons.length - 1; i >= 0; i--) {
			context.beginPath();
			const points = polygons[i].points;
			tp += points.length;
			// + 0.5 to fix the line behavior in JS...
			context.moveTo(points[0].x + 0.5, points[0].y + 0.5);
			for (let p = 1; p < points.length; p++)
				context.lineTo(points[p].x + 0.5, points[p].y + 0.5);
			context.lineTo(points[0].x + 0.5, points[0].y + 0.5);
			context.stroke();
		}
		context.fillStyle = "rgba(255,0,0,0.5)";
		for (i = polygons.length - 1; i >= 0; i--) {
			const points = polygons[i].points;
			for (let p = points.length - 1; p >= 0; p--)
				context.fillRect(points[p].x - 1, points[p].y - 1, 3, 3);
		}
		alert(`point count ${tp} / polygon count ${polygons.length} / maxY ${maxY}`);
		context.fillStyle = oldFillStyle;
		context.strokeStyle = oldStrokeStyle;
		context.lineWidth = oldLineWidth;
		context.globalCompositeOperation = oldCompositeOperation;
	}

	return [polygons, maxY];
}
