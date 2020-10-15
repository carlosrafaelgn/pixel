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

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
// https://www.khronos.org/files/webgl/webgl-reference-card-1_0.pdf
// https://www.khronos.org/files/webgl20-reference-guide.pdf
// https://www.khronos.org/opengl/wiki/Type_Qualifier_(GLSL)
// https://webgl2fundamentals.org/
// https://emscripten.org/docs/optimizing/Optimizing-WebGL.html
class WebGL {
	// Since the indices will be GL_UNSIGNED_SHORT, we cannot have more than 65536 vertices
	// (16384 rectangles)
	// Must be in sync with lib/shared.h
	private static readonly RectangleCapacity = 512;

	// Each vertex has 3 attributes: position x, position y, alpha, texture x and texture y
	// Each attribute has 4 bytes (1 = 4 bytes)
	private static readonly FloatsPerPosition = 2;
	private static readonly FloatsPerAlphaTextureCoordinates = 1;

	private static readonly FloatsPerVertex = (WebGL.FloatsPerPosition + WebGL.FloatsPerAlphaTextureCoordinates);
	private static readonly BytesPerVertex = 4 * WebGL.FloatsPerVertex;

	private static readonly FloatsPerRectangle = 4 * WebGL.FloatsPerVertex;
	private static readonly BytesPerRectangle = 4 * WebGL.FloatsPerRectangle;

	// Index of the start of each attribute within the buffer
	private static readonly BufferIndexPosition = 0;
	private static readonly BufferIndexAlphaTextureCoordinates = 4 * WebGL.FloatsPerPosition;

	// Must be in sync with scripts/level/levelSpriteSheet.ts
	// 0.0078125 = 1 / 128 (Texture width and height)
	// Must be in sync with scripts/gl/textureCoordinates.ts
	// 0.001953125 = 1 / 512 (8 bits + 1 bit)
	// 0.5 = 1 / 2 (1 extra bit added)
	private static readonly VertexShaderSource2 = `#version 300 es
precision highp float;
in vec2 aPosition;
in float aAlphaTextureCoordinates;
flat out lowp float vAlpha;
out lowp vec2 vTextureCoordinates;
uniform vec2 uViewConstants;
const vec2 uViewOffsets = vec2(-1.0, 1.0);
void main() {
	gl_Position = vec4(aPosition * uViewConstants + uViewOffsets, 0.0, 1.0);
	vAlpha = mod(aAlphaTextureCoordinates, 2.0);
	vTextureCoordinates = floor(vec2(
		aAlphaTextureCoordinates * 0.001953125,
		mod(aAlphaTextureCoordinates * 0.5, 256.0)
	)) * 0.0078125;
}`;
	private static readonly VertexShaderSource = `#version 100
precision highp float;
attribute vec2 aPosition;
attribute float aAlphaTextureCoordinates;
varying lowp float vAlpha;
varying lowp vec2 vTextureCoordinates;
uniform vec2 uViewConstants;
const vec2 uViewOffsets = vec2(-1.0, 1.0);
void main() {
	gl_Position = vec4(aPosition * uViewConstants + uViewOffsets, 0.0, 1.0);
	vAlpha = mod(aAlphaTextureCoordinates, 2.0);
	vTextureCoordinates = floor(vec2(
		aAlphaTextureCoordinates * 0.001953125,
		mod(aAlphaTextureCoordinates * 0.5, 256.0)
	)) * 0.0078125;
}`;

	// We are doing color * vAlpha in order to produce premultiplied alpha images,
	// making the premultipliedAlpha setting, the default blending (refer to
	// setDefaultBlending()) and intermediate framebuffers work as expected
	// https://community.khronos.org/t/alpha-blending-issues-when-drawing-frame-buffer-into-default-buffer/73958/2
	// https://limnu.com/webgl-blending-youre-probably-wrong/
	private static readonly FragmentShaderSource2 = `#version 300 es
precision lowp float;
flat in float vAlpha;
in vec2 vTextureCoordinates;
out vec4 color;
uniform sampler2D uTexture;
void main() {
	color = texture(uTexture, vTextureCoordinates) * vAlpha;
}`;
	private static readonly FragmentShaderSource = `#version 100
precision lowp float;
varying float vAlpha;
varying vec2 vTextureCoordinates;
uniform sampler2D uTexture;
void main() {
	gl_FragColor = texture2D(uTexture, vTextureCoordinates) * vAlpha;
}`;

	private viewWidth = 0;
	private viewHeight = 0;
	private framebufferTextureViewWidth = 0;
	private framebufferTextureViewHeight = 0;

	private program: WebGLProgram = null;
	private vertexShader: WebGLShader = null;
	private fragmentShader: WebGLShader = null;
	private vertexBuffer: WebGLBuffer = null;
	private indexBuffer: WebGLBuffer = null;
	private currentTexture: Texture = null;
	private uniformViewConstants: WebGLUniformLocation = null;

	private rectangleCount = 0;
	public verticesPtr = 0;
	private vertices: Float32Array = null;

	public context: WebGLRenderingContext = null;
	public contextVersion = 0;
	private framebuffer: WebGLFramebuffer = null;
	public framebufferTexture: Texture = null;

	public clearErrors(): void {
		const gl = this.context;
		let max = 3;
		while (gl.getError() !== gl.NO_ERROR && max-- > 0)
			gl.getError();
	}

	public throwIfError(objectToValidate: any = 1) : void {
		const error = this.context.getError();
		if (!objectToValidate || error !== this.context.NO_ERROR)
			throw new Error("WebGL error: " + error);
	}

	public prepareNativeDraw(texture: Texture): void {
		this.flush();
		this.currentTexture = texture;
	}

	public drawNative(rectangleCount: number): void {
		this.rectangleCount = rectangleCount;
		this.flush();
	}

	public checkRecreate(canvas: HTMLCanvasElement): boolean {
		return (!this.context || this.context.isContextLost() || canvas.width !== this.viewWidth || canvas.height !== this.viewHeight);
	}

	private static nextPowerOfTwo(x: number): number {
		if (!(x & (x - 1)))
			return x;
		x |= (x >>> 1);
		x |= (x >>> 2);
		x |= (x >>> 4);
		x |= (x >>> 8);
		x |= (x >>> 16);
		return (x + 1);
	}

	public recreate(canvas: HTMLCanvasElement, desiredFramebufferWidth: number, desiredFramebufferHeight: number): void {
		const width = canvas.width;
		const height = canvas.height;

		this.destroy(true);

		// For some reason, canvas.getContext("webgl2") returns null for the
		// first time we get here in iOS, but from the moment the context is
		// lost, every time canvas.getContext("webgl2") is called a context is
		// returned (but the shader compilation fails)! Therefore, we are better
		// off just bypassing it...
		if (!isIOSOrSafari && (typeof WebGL2RenderingContext) !== "undefined") {
			try {
				this.context = canvas.getContext("webgl2", {
					alpha: false,
					depth: false,
					stencil: false,
					antialias: false,
					premultipliedAlpha: true
				}) as WebGLRenderingContext;

				this.contextVersion = 2;
			} catch (ex) {
				// Just ignore...
			}
		}

		if (!this.context) {
			try {
				this.context = canvas.getContext("webgl", {
					alpha: false,
					depth: false,
					stencil: false,
					antialias: false,
					premultipliedAlpha: true
				}) as WebGLRenderingContext;

				this.contextVersion = 1;
			} catch (ex) {
				// Just ignore...
			}
		}

		if (!this.context) {
			this.context = canvas.getContext("experimental-webgl", {
				alpha: false,
				depth: false,
				stencil: false,
				antialias: false,
				premultipliedAlpha: true
			}) as WebGLRenderingContext;

			this.contextVersion = 1;
		}

		if (!this.context)
			throw new Error("WebGL apparently not supported");

		const gl = this.context;

		this.clearErrors();

		this.viewWidth = width;
		this.viewHeight = height;

		const program = this.program = gl.createProgram();
		this.throwIfError(program);

		const vertexShader = this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
		this.throwIfError(vertexShader);
		gl.shaderSource(vertexShader, this.contextVersion === 2 ? WebGL.VertexShaderSource2 : WebGL.VertexShaderSource);
		gl.compileShader(vertexShader);
		if (!(gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) as boolean))
			throw new Error("WebGL vertex shader compilation error: " + gl.getShaderInfoLog(vertexShader));
		this.throwIfError();

		const fragmentShader = this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		this.throwIfError(fragmentShader);
		gl.shaderSource(fragmentShader, this.contextVersion === 2 ? WebGL.FragmentShaderSource2 : WebGL.FragmentShaderSource);
		gl.compileShader(fragmentShader);
		if (!(gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS) as boolean))
			throw new Error("WebGL fragment shader compilation error: " + gl.getShaderInfoLog(fragmentShader));
		this.throwIfError();

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);

		gl.linkProgram(program);
		gl.useProgram(program);

		this.throwIfError();

		this.uniformViewConstants = gl.getUniformLocation(program, "uViewConstants");

		gl.activeTexture(gl.TEXTURE0);
		gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);

		this.throwIfError();

		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.DITHER);
		gl.disable(gl.SCISSOR_TEST);
		gl.disable(gl.POLYGON_OFFSET_FILL);
		gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
		gl.disable(gl.SAMPLE_COVERAGE);
		gl.disable(gl.STENCIL_TEST);
		gl.enable(gl.BLEND);

		// Even though all images in the game have either fully opaque or fully transparent pixels,
		// having WebGL premultiply the alpha makes blending simpler (refer to the comments at
		// FragmentShaderSource)
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

		this.setDefaultComposition();

		this.throwIfError();

		this.vertexBuffer = gl.createBuffer();
		this.vertexBuffer = gl.createBuffer();
		this.indexBuffer = gl.createBuffer();

		this.allocateRectangleBuffers();

		// A few WebGL 1 devices apparently don't like NPOT framebuffers
		const powerOfTwoWidth = WebGL.nextPowerOfTwo(desiredFramebufferWidth),
			powerOfTwoHeight = WebGL.nextPowerOfTwo(desiredFramebufferHeight),
			// The vertex shaders consider LevelSpriteSheet.TextureWidth and
			// LevelSpriteSheet.TextureHeight as the maximum values...
			// Use Math.ceil() to round up forcibly
			framebufferTextureWidth = Math.ceil((desiredFramebufferWidth * LevelSpriteSheet.TextureWidth) / powerOfTwoWidth),
			framebufferTextureHeight = Math.ceil((desiredFramebufferHeight * LevelSpriteSheet.TextureHeight) / powerOfTwoHeight);

		// Use | 0 to truncate (round down forcibly)
		this.framebufferTextureViewWidth = ((framebufferTextureWidth * powerOfTwoWidth) / LevelSpriteSheet.TextureWidth) | 0;
		this.framebufferTextureViewHeight = ((framebufferTextureHeight * powerOfTwoHeight) / LevelSpriteSheet.TextureHeight) | 0;

		this.framebufferTexture = new Texture(this, null, powerOfTwoWidth, powerOfTwoHeight);
		LevelSpriteSheet.FramebufferTextureCoordinates.setCoordinates(0, 0, framebufferTextureWidth, framebufferTextureHeight);

		this.throwIfError();

		this.framebuffer = gl.createFramebuffer();

		this.throwIfError();

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.framebufferTexture.texture, 0);

		this.useFramebuffer(false);

		const attributePosition = gl.getAttribLocation(program, "aPosition");
		const attributeAlphaTextureCoordinates = gl.getAttribLocation(program, "aAlphaTextureCoordinates");
		
		gl.enableVertexAttribArray(attributePosition);
		gl.enableVertexAttribArray(attributeAlphaTextureCoordinates);

		gl.vertexAttribPointer(attributePosition, WebGL.FloatsPerPosition, gl.FLOAT, false, WebGL.BytesPerVertex, WebGL.BufferIndexPosition);
		gl.vertexAttribPointer(attributeAlphaTextureCoordinates, WebGL.FloatsPerAlphaTextureCoordinates, gl.FLOAT, false, WebGL.BytesPerVertex, WebGL.BufferIndexAlphaTextureCoordinates);
	}

	public destroy(partial: boolean): void {
		const gl = this.context,
			verticesPtr = this.verticesPtr,
			vertices = this.vertices;

		if (gl) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);

			if (this.framebufferTexture)
				this.framebufferTexture.destroy();
			if (this.framebuffer)
				gl.deleteFramebuffer(this.framebuffer);
			if (this.program)
				gl.deleteProgram(this.program);
			if (this.vertexShader)
				gl.deleteShader(this.vertexShader);
			if (this.fragmentShader)
				gl.deleteShader(this.fragmentShader);
			if (this.vertexBuffer)
				gl.deleteBuffer(this.vertexBuffer);
			if (this.indexBuffer)
				gl.deleteBuffer(this.indexBuffer);
		}

		zeroObject(this);

		if (partial) {
			this.verticesPtr = verticesPtr;
			this.vertices = vertices;
		} else if (verticesPtr) {
			cLib._freeBuffer(verticesPtr);
		}
	}

	public flush(): void {
		const rectangleCount = this.rectangleCount;

		if (!rectangleCount)
			return;

		const gl = this.context;

		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices.subarray(0, WebGL.FloatsPerRectangle * rectangleCount));

		gl.bindTexture(gl.TEXTURE_2D, this.currentTexture.texture);

		// Each rectangle is made of 2 triangles, and each triangle has 3 indices
		gl.drawElements(gl.TRIANGLES, (6 * rectangleCount), gl.UNSIGNED_SHORT, 0);

		this.rectangleCount = 0;
	}

	public clearColor(red: number, green: number, blue: number, alpha: number): void {
		const gl = this.context;

		gl.clearColor(red, green, blue, alpha);
	}

	public checkForLostContextUseFrameBufferAndClear(): boolean {
		// https://www.khronos.org/webgl/wiki/HandlingContextLost

		const gl = this.context;

		if (!gl)
			return false;

		if (gl.isContextLost()) {
			this.destroy(true);
			return false;
		}

		this.useFramebuffer(true);

		gl.clear(gl.COLOR_BUFFER_BIT);

		// This call to gl.getError() was taking ***too*** long to execute!
		// (Refer to the comments above GameView.render())
		//if (gl.getError() === gl.CONTEXT_LOST_WEBGL) {
		//	this.destroy(true);
		//	return false;
		//}

		return true;
	}

	public setSumComposition(): void {
		const gl = this.context;

		gl.blendFunc(gl.ONE, gl.ONE);
	}

	public setDefaultComposition(): void {
		const gl = this.context;

		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	}

	private allocateRectangleBuffers(): void {
		if (!this.verticesPtr) {
			this.verticesPtr = cLib._allocateBuffer(WebGL.BytesPerRectangle * WebGL.RectangleCapacity);
			this.vertices = new Float32Array(cLib.HEAP8.buffer as ArrayBuffer, this.verticesPtr, WebGL.FloatsPerRectangle * WebGL.RectangleCapacity);
		}

		// Each rectangle has 4 vertices, making two triangles (6 indices)
		// Vertices:
		// 0   2
		//
		// 1   3
		//
		// First triangle: 0 1 2
		// Second triangle: 2 1 3

		const indexCount = (6 * WebGL.RectangleCapacity);
		const indices = new Uint16Array(indexCount);

		for (let i = 0, vertex = 0; i < indexCount; i += 6, vertex += 4) {
			// First triangle
			indices[i] = vertex;
			indices[i + 1] = vertex + 1;
			indices[i + 2] = vertex + 2;

			// Second triangle
			indices[i + 3] = vertex + 2;
			indices[i + 4] = vertex + 1;
			indices[i + 5] = vertex + 3;
		}

		const gl = this.context;

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		// Call bufferData() to set the maximum size, then call bufferSubData()
		// several times later, with size <= maximum size, for increased performance!
		gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);
		// Speed up next bufferSubData() calls on Chrome???
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
	}

	public useFramebuffer(use: boolean): void {
		const gl = this.context;

		let width: number, height: number;

		if (use) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
			width = this.framebufferTextureViewWidth;
			height = this.framebufferTextureViewHeight;
		} else {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			width = this.viewWidth;
			height = this.viewHeight;
		}

		gl.uniform2f(this.uniformViewConstants, 2.0 / width, -2.0 / height);
		gl.viewport(0, 0, width, height);
	}

	public draw(texture: Texture, modelCoordinates: ModelCoordinates, alpha: number, textureCoordinates: TextureCoordinates, viewX: number, viewY: number): void {
		if (this.currentTexture !== texture || this.rectangleCount >= WebGL.RectangleCapacity) {
			this.flush();
			this.currentTexture = texture;
		}

		cLib._draw(this.verticesPtr + (WebGL.BytesPerRectangle * this.rectangleCount),
			modelCoordinates.ptr,
			alpha,
			textureCoordinates.ptr,
			viewX, viewY
		);

		this.rectangleCount++;
	}

	public drawScale(texture: Texture, modelCoordinates: ModelCoordinates, alpha: number, textureCoordinates: TextureCoordinates, scale: number, viewX: number, viewY: number): void {
		if (this.currentTexture !== texture || this.rectangleCount >= WebGL.RectangleCapacity) {
			this.flush();
			this.currentTexture = texture;
		}

		cLib._drawScale(this.verticesPtr + (WebGL.BytesPerRectangle * this.rectangleCount),
			modelCoordinates.ptr,
			alpha,
			textureCoordinates.ptr,
			scale,
			viewX, viewY
		);

		this.rectangleCount++;
	}

	public drawRotate(texture: Texture, modelCoordinates: ModelCoordinates, alpha: number, textureCoordinates: TextureCoordinates, radians: number, viewX: number, viewY: number): void {
		if (this.currentTexture !== texture || this.rectangleCount >= WebGL.RectangleCapacity) {
			this.flush();
			this.currentTexture = texture;
		}

		cLib._drawRotate(this.verticesPtr + (WebGL.BytesPerRectangle * this.rectangleCount),
			modelCoordinates.ptr,
			alpha,
			textureCoordinates.ptr,
			radians,
			viewX, viewY
		);

		this.rectangleCount++;
	}

	public drawScaleRotate(texture: Texture, modelCoordinates: ModelCoordinates, alpha: number, textureCoordinates: TextureCoordinates, scale: number, radians: number, viewX: number, viewY: number): void {
		if (this.currentTexture !== texture || this.rectangleCount >= WebGL.RectangleCapacity) {
			this.flush();
			this.currentTexture = texture;
		}

		cLib._drawScaleRotate(this.verticesPtr + (WebGL.BytesPerRectangle * this.rectangleCount),
			modelCoordinates.ptr,
			alpha,
			textureCoordinates.ptr,
			scale,
			radians,
			viewX, viewY
		);

		this.rectangleCount++;
	}
}
