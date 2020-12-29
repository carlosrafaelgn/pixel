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

#include <emscripten.h>
#include <stdlib.h>
#include "math_fix_sincos.h"
#include <memory.h>

#include "shared.h"

// Must be in sync with scripts/image/imageProcessing.ts
#define maxPixelCount ((baseWidth + 2) * (maxHeight + 2)) // + 2 because we are creating a 1-pixel border around the original image
#define maxPointCount (maxPixelCount >> 1)

#define maxInputPixelCount (baseWidth * maxHeight)
#define maxRevisited (baseWidth + maxHeight)
#define maxStackSize maxPixelCount

typedef struct PointStructure {
	int x, y;
} Point;

typedef struct ImageInfoStructure {
	int width;
	int height;
	Point points[maxPointCount];
	int stack[maxStackSize];
	unsigned char data[maxInputPixelCount << 2]; // r g b a r g b a r g b a...
	unsigned char buffer[maxPixelCount];
} ImageInfo;

// IntelliSense does not like this... :(
EM_JS(void, call_createPolygon, (int pointCount), { createPolygon(pointCount) });

ImageInfo* allocateImageInfo(int width, int height) {
	ImageInfo* const imageInfo = (ImageInfo*)malloc(sizeof(ImageInfo));
	imageInfo->width = width;
	imageInfo->height = height;
	return imageInfo;
}

unsigned char* getImageInfoData(ImageInfo* imageInfo) {
	return imageInfo->data;
}

Point* getImageInfoPoints(ImageInfo* imageInfo) {
	return imageInfo->points;
}

void freeImageInfo(ImageInfo* imageInfo) {
	if (imageInfo)
		free(imageInfo);
}

int floodFill(int w, int h, unsigned char* buffer, int bufferStride, unsigned char from, unsigned char to, int* stack) {
	int stackSize = 1, area = 1;

	while (stackSize) {
		const int stackI = stack[--stackSize];

		// Check above
		int i = stackI - bufferStride;
		if (buffer[i] == from) {
			buffer[i] = to;
			area++;
			stack[stackSize++] = i;
		}

		// Check below
		i = stackI + bufferStride;
		if (buffer[i] == from) {
			buffer[i] = to;
			area++;
			stack[stackSize++] = i;
		}

		// Go all the way to the left, checking above and below the current pixel
		i = stackI - 1;
		int x = i % bufferStride;
		while (x >= 1 && buffer[i] == from) {
			buffer[i] = to;
			area++;

			const int oldI = i;

			// Check above
			i = oldI - bufferStride;
			if (buffer[i] == from) {
				buffer[i] = to;
				area++;
				stack[stackSize++] = i;
			}

			// Check below
			i = oldI + bufferStride;
			if (buffer[i] == from) {
				buffer[i] = to;
				area++;
				stack[stackSize++] = i;
			}

			i = oldI - 1;
			x--;
		}

		// We should check the diagonals if trace considered all 8 neighbors
		//if (x > 1) {
		//	const int oldI = i;
		//
		//	// Check above
		//	i = oldI - bufferStride;
		//	if (buffer[i] == from) {
		//		buffer[i] = to;
		//		area++;
		//		stack[stackSize++] = i;
		//	}
		//
		//	// Check below
		//	i = oldI + bufferStride;
		//	if (buffer[i] == from) {
		//		buffer[i] = to;
		//		area++;
		//		stack[stackSize++] = i;
		//	}
		//}

		// Go all the way to the right, checking above and below the current pixel
		i = stackI + 1;
		x = i % bufferStride;
		while (x <= w && buffer[i] == from) {
			buffer[i] = to;
			area++;

			const int oldI = i;

			// Check above
			i = oldI - bufferStride;
			if (buffer[i] == from) {
				buffer[i] = to;
				area++;
				stack[stackSize++] = i;
			}

			// Check below
			i = oldI + bufferStride;
			if (buffer[i] == from) {
				buffer[i] = to;
				area++;
				stack[stackSize++] = i;
			}

			i = oldI + 1;
			x++;
		}

		// We should check the diagonals if trace considered all 8 neighbors
		//if (x < w) {
		//	const int oldI = i;
		//
		//	// Check above
		//	i = oldI - bufferStride;
		//	if (buffer[i] == from) {
		//		buffer[i] = to;
		//		area++;
		//		stack[stackSize++] = i;
		//	}
		//
		//	// Check below
		//	i = oldI + bufferStride;
		//	if (buffer[i] == from) {
		//		buffer[i] = to;
		//		area++;
		//		stack[stackSize++] = i;
		//	}
		//}
	}

	return area;
}

double perpendicularDistance(int x, int y, int x1, int y1, int x2, int y2) {
	// https://stackoverflow.com/a/6853926/3569421
	const int A = x - x1;
	const int B = y - y1;
	const int C = x2 - x1;
	const int D = y2 - y1;

	const double dot = (double)(A * C + B * D);
	const double len_sq = (double)(C * C + D * D);
	double param = -1;
	if (len_sq)
		param = dot / len_sq;

	double xx, yy;

	if (param < 0) {
		xx = x1;
		yy = y1;
	} else if (param > 1) {
		xx = x2;
		yy = y2;
	} else {
		xx = x1 + (param * C);
		yy = y1 + (param * D);
	}

	const double dx = x - xx;
	const double dy = y - yy;

	return sqrt(dx * dx + dy * dy);
}

int douglasPeucker(Point* pointList, int start, int end, double epsilon) {
	if ((end - start) <= 1)
		return (end - start) + 1;

	const int pStartX = pointList[start].x,
		pStartY = pointList[start].y,
		pEndX = pointList[end].x,
		pEndY = pointList[end].y;

	double maxD = 0;
	int maxDIndex = start;

	for (int i = start + 1; i < end; i++) {
		const Point p = pointList[i];
		const double d = perpendicularDistance(p.x, p.y, pStartX, pStartY, pEndX, pEndY);
		if (d > maxD) {
			maxDIndex = i;
			maxD = d;
		}
	}

	if (maxD > epsilon) {
		const Point tmp = pointList[maxDIndex];
		// -1 to ignore the last point returned (pointList[maxDIndex]),
		// which is also returned by the second call
		const int size1 = douglasPeucker(pointList, start, maxDIndex, epsilon) - 1;
		pointList[maxDIndex] = tmp;
		const int size2 = douglasPeucker(pointList, maxDIndex, end, epsilon);

		memcpy(pointList + (start + size1), pointList + maxDIndex, sizeof(Point) * size2);

		return size1 + size2;
	}

	pointList[start + 1] = pointList[end];

	return 2;
}

int isNewEdgePixel4(int i, unsigned char* buffer, const int* cwNeighborOffsets8) {
	if (buffer[i] == 2) {
		for (int j = 7; j >= 0; j--) {
			if (!buffer[i + cwNeighborOffsets8[j]])
				return 1;
		}
	}
	return 0;
}

void trace4(int initialI, int cwDir, const int* cwNeighborOffsets4, const int* cwNeighborOffsets8, unsigned char* buffer, int bufferStride, int* stack, Point* points, int* outPointCount, int* outStackSize) {
	// cwNeighborOffsets4 contains the offsets from i to each one of its 4 neighbors,
	// in clockwise direction, starting from the top.
	//   0
	// 3 i 1
	//   2
	//
	// As the tracer moves along the line, the concept of front/rear/left/right will
	// vary according to the direction used to enter the pixel.
	//
	// For example, when going from A to B, front is 1, left is 0, right is 2 and so on.
	// But, when going from Y to X, front is 3, left is 2, right is 0 and so on.
	//
	// 0 0 0 0 ...
	// 0 A B C ...
	// 0 X Y Z ...
	// 0 0 0 0 ...
	//
	// Given that the initial scan that brought us here started from the topmost/leftmost
	// pixel (0, 0), and it goes all the way to end of the line (right) before going down
	// to the next line, when cwDir is 1 (we are tracing the outer boundary of a polygon),
	// we assume an initial direction of 1, and we scan the neighbors in CW direction.
	// When cwDir is -1 (we are tracing the inner boundary of a polygon), we also assume
	// an initial direction of 1, but we scan the neighbors in CCW direction.
	//
	// Several optimizations/assumptions could be made here, because we do not need to
	// handle 1-pixel areas, just the X's below, because they were erased on beforehand.
	// 
	// 0 0 0 0 0 0 ...
	// 0 A A 0 0 A ...
	// 0 A A X X A ...
	// 0 A A 0 0 A ...
	// 0 0 0 0 0 0 ...

	int stackSize = 1, prevI = initialI, dir = 1, visitingAlreadyVisited = 0;

	buffer[initialI] = 3;
	stack[0] = initialI;

	for (;;) {
		// When performing the search in CW direction (cwDir === 1), we must start the search
		// from the left side of the pixel, which is (direction - 1) & 3. When performing
		// the search in CCW direction (cwDir === -1), we must start the search from the right
		// side of the pixel, which is (direction + 1) & 3.
		const int initialOffsetIndex = (dir - cwDir) & 3;
		int offsetIndex = initialOffsetIndex, nextI = -1;
		do {
			const int i = prevI + cwNeighborOffsets4[offsetIndex];
			if (isNewEdgePixel4(i, buffer, cwNeighborOffsets8)) {
				visitingAlreadyVisited = 0;
				nextI = i;
				dir = offsetIndex;
				break;
			}
			offsetIndex = (offsetIndex + cwDir) & 3;
		} while (offsetIndex != initialOffsetIndex);
		
		if (nextI < 0) {
			if (visitingAlreadyVisited >= maxRevisited || stackSize >= maxStackSize) {
				*outPointCount = 0;
				*outStackSize = stackSize - visitingAlreadyVisited;
				return;
			}

			// We could not find a new pixel to go to. Therefore, we should try navigating
			// throught, at most 2, visited pixels until we can (hopefully) find our way back
			// to track. In this process, if we come across initialI, we can safely end the
			// search as we have reached the initial position.
			//
			// Thanks to the previous removal of all 1-pixels, we came here probably due to one
			// of the four cases below (or any analogous ones):
			//
			// 0 0 0 0 0 0 - 0 0 0 0 0 0 - 0 0 0 0 0 0 - 0 0 0 0 0 0
			// 0 1 1 0 0 0 - 0 0 0 1 1 0 - 0 1 1 0 0 0 - 0 0 1 1 0 0
			// 0 1 1 1 1 0 - 0 1 1 1 1 0 - 0 1 1 0 0 0 - 0 0 1 1 0 0
			// 0 0 0 1 1 0 - 0 1 1 0 0 0 - 0 0 1 1 0 0 - 0 1 1 0 0 0
			// 0 0 0 0 0 0 - 0 0 0 0 0 0 - 0 0 1 1 0 0 - 0 1 1 0 0 0
			// 0 0 0 0 0 0 - 0 0 0 0 0 0 - 0 0 0 0 0 0 - 0 0 0 0 0 0

			do {
				const int i = prevI + cwNeighborOffsets4[offsetIndex];
				if (buffer[i] == 3) {
					visitingAlreadyVisited++;
					nextI = i;
					dir = offsetIndex;
					break;
				}
				offsetIndex = (offsetIndex + cwDir) & 3;
			} while (offsetIndex != initialOffsetIndex);

			if (nextI < 0) {
				*outPointCount = 0;
				*outStackSize = stackSize - visitingAlreadyVisited;
				return;
			}

			if (nextI == initialI)
				break;
		}

		buffer[nextI] = 3;
		stack[stackSize++] = nextI;
		prevI = nextI;
	}

	// stackSize >= maxPointCount not stackSize > maxPointCount,
	// because we may need space for 1 extra point at the end.
	if (stackSize < 3 || stackSize >= maxPointCount) {
		*outPointCount = 0;
		*outStackSize = stackSize;
		return;
	}

	// Create the points and simplify the polygon
	int pointCount = 0, x = 0, y = 0,
		nextX = (stack[0] % bufferStride),
		nextY = (stack[0] / bufferStride) | 0,
		prevX = (stack[stackSize - 1] % bufferStride),
		prevY = (stack[stackSize - 1] / bufferStride) | 0;
	for (int nextI = 1; nextI < stackSize; nextI++) {
		x = nextX;
		y = nextY;
		const int i = stack[nextI];
		nextX = (i % bufferStride);
		nextY = (i / bufferStride) | 0;
		if ((x != prevX || x != nextX) &&
			(y != prevY || y != nextY)) {
			points[pointCount].x = x;
			points[pointCount++].y = y;
		}
		prevX = x;
		prevY = y;
	}
	x = nextX;
	y = nextY;
	nextX = (stack[0] % bufferStride);
	nextY = (stack[0] / bufferStride) | 0;
	if ((x != prevX || x != nextX) &&
		(y != prevY || y != nextY)) {
		points[pointCount].x = x;
		points[pointCount++].y = y;
	}
	// Since douglasPeucker() never removes the last point, we are adding the
	// first point again, making it also the last point, so it can be safely removed
	// using pointCount = douglasPeucker(...) - 1 below.
	points[pointCount++] = points[0];

	// The value 1.5 used as epsilon was empirically chosen, as it works well
	// on drawings created with brushes with thicknesses between 10 and 25.
	*outPointCount = douglasPeucker(points, 0, pointCount - 1, 1.5) - 1;
	*outStackSize = stackSize;
}

void traceUndo(unsigned char* buffer, int* stack, int stackSize) {
	while (stackSize > 0)
		buffer[stack[--stackSize]] = 2;
}

void erase1(int initialI, const int* cwNeighborOffsets4, unsigned char* buffer, int bufferStride, int* stack) {
	int stackSize = 1;
	stack[0] = initialI;
	
	while (stackSize > 0) {
		const int i = stack[--stackSize];
		buffer[i] = 0;
		
		// Check the four neighbors
		for (int n = 0; n < 4; n++) {
			const int j = i + cwNeighborOffsets4[n];
			if (buffer[j] &&
				((!buffer[j - 1] && !buffer[j + 1]) ||
				(!buffer[j - bufferStride] && !buffer[j + bufferStride])))
				stack[stackSize++] = j;
		}
	}
}

void polygonFound(Point* points, int pointCount) {
	// Remove the 1-pixel border from the polygon
	for (int p = pointCount - 1; p >= 0; p--) {
		points[p].x--;
		points[p].y--;
	}
	call_createPolygon(pointCount);
}

int processImage(ImageInfo* imageInfo) {
	const int w = imageInfo->width,
		h = imageInfo->height,
		bufferStride = w + 2, // We are creating a 1-pixel border around the original image
		dataLength = (w * h) << 2;
	unsigned char* const data = imageInfo->data;
	unsigned char* const buffer = imageInfo->buffer;
	int* const stack = imageInfo->stack;
	// Refer to traceX() for the meaning of cwNeighborOffsetsX
	const int cwNeighborOffsets4[4] = { -bufferStride, 1, bufferStride, -1 };
	const int cwNeighborOffsets8[8] = { -bufferStride, -bufferStride + 1, 1, bufferStride + 1, bufferStride, bufferStride - 1, -1, -bufferStride - 1 };
	Point* const points = imageInfo->points;

	int i, j, x, y;

	memset(buffer, 0, maxPixelCount);

	for (i = dataLength - 4, y = h - 1; y >= 0; y--) {
		j = ((y + 1) * bufferStride) + w;
		for (x = w - 1; x >= 0; x--, i -= 4, j--)
			buffer[j] = ((data[i + 3] == 255) ? 1 : 0);
	}

	// Erase all 1-pixels (refer to traceX() for the reason why).
	// It has to be an iterative process as the removal of one
	// pixel could make another pixel eligible for removal, as
	// the example below, where pixel A becomes eligible for
	// removal only in the third step, after C and B have
	// been removed:
	//
	// 0 0 0 0 0 ...
	// 0 0 1 1 1 ... 
	// 0 A 1 1 1 ...
	// 0 B 0 1 1 ...
	// 0 C 0 1 1 ...
	// 0 0 0 0 0 ...
	//
	for (y = h - 1; y >= 0; y--) {
		j = ((y + 1) * bufferStride) + w;
		for (x = w - 1; x >= 0; x--, j--) {
			if (buffer[j] &&
				((!buffer[j - 1] && !buffer[j + 1]) ||
				(!buffer[j - bufferStride] && !buffer[j + bufferStride])))
				erase1(j, cwNeighborOffsets4, buffer, bufferStride, stack);
		}
	}

	for (y = 1; y <= h; y++) {
		i = (y * bufferStride) + 1;
		for (x = 1; x <= w; x++, i++) {
			if (buffer[i] == 1) {
				buffer[i] = 2;
				stack[0] = i;
				// We are only considering polygons with more than 10 pixels
				if (floodFill(w, h, buffer, bufferStride, 1, 2, stack) > 10) {
					int polygonPointCount = 0, stackSize = 0;
					trace4(i, 1, cwNeighborOffsets4, cwNeighborOffsets8, buffer, bufferStride, stack, points, &polygonPointCount, &stackSize);
					if (polygonPointCount > 1) {
						polygonFound(points, polygonPointCount);
					} else {
						traceUndo(buffer, stack, stackSize);
						buffer[i] = 2;
						stack[0] = i;
						floodFill(w, h, buffer, bufferStride, 2, 0, stack);
					}
				} else {
					// Erase small polygons
					buffer[i] = 0;
					stack[0] = i;
					floodFill(w, h, buffer, bufferStride, 2, 0, stack);
				}
			} else if (buffer[i] == 2 && !buffer[i + bufferStride]) {
				// We are on the top-inner edge of a hole
				int polygonPointCount = 0, stackSize = 0;
				trace4(i, -1, cwNeighborOffsets4, cwNeighborOffsets8, buffer, bufferStride, stack, points, &polygonPointCount, &stackSize);
				// Ignore very small holes
				if (polygonPointCount > 1 && stackSize > 8)
					polygonFound(points, polygonPointCount);
			}
		}
	}

	int maxY = 0;
	for (i = (h * bufferStride) + w; i >= 0; i--) {
		if (buffer[i]) {
			maxY = ((i / bufferStride) | 0) - 1;
			break;
		}
	}

	// Erase everything that has not been used, and paint a border
	// around what has been used.
	const int wMinus1 = w - 1, hMinus1 = h - 1, bufferStride2 = bufferStride << 1;
	for (i = dataLength - 4, y = h - 1; y >= 0; y--) {
		j = ((y + 1) * bufferStride) + w;
		for (x = wMinus1; x >= 0; x--, i -= 4, j--) {
			if (!buffer[j]) {
				data[i] = 0;
				data[i + 1] = 0;
				data[i + 2] = 0;
				data[i + 3] = 0;
			} else if (buffer[j] == 3 && (
				// Always paint outer pixels
				!buffer[j - 1] || !buffer[j + 1] || !buffer[j - bufferStride] || !buffer[j + bufferStride] ||
				// Paint the inner pixels only if they are a part of what appears to be
				// the intersection of two longer lines
				(
					(
						// Does the pixel have at least two traced pixels to the left or to the right?
						(x > 1 && buffer[j - 1] == 3 && buffer[j - 2] == 3) ||
						(x < wMinus1 && buffer[j + 1] == 3 && buffer[j + 2] == 3)
					)
					&&
					(
						// If so, does it have at least two traced pixels above or below it?
						(y > 1 && buffer[j - bufferStride] == 3 && buffer[j - bufferStride2] == 3) ||
						(y < hMinus1 && buffer[j + bufferStride] == 3 && buffer[j + bufferStride2] == 3)
					)
				)
				)) {
				data[i] = data[i] >> 1;
				data[i + 1] = data[i + 1] >> 1;
				data[i + 2] = data[i + 2] >> 1;
				data[i + 3] = 255;
			}
		}
	}

	return maxY;
}
