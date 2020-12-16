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

class Texture extends Resource {
	private gl: WebGL;

	private _width: number;
	private _height: number;
	private _image: HTMLImageElement;
	private _texture: WebGLTexture;

	public constructor(gl: WebGL, image: HTMLImageElement, width = 0, height = 0) {
		super();

		this.gl = gl;
		this._width = 0;
		this._height = 0;
		this._image = null;
		this._texture = null;

		this.bindImage(image, width, height);
	}

	public get width(): number {
		return this._width;
	}

	public get height(): number {
		return this._height;
	}

	public get image(): HTMLImageElement {
		return this._image;
	}

	public get texture(): WebGLTexture {
		return this._texture;
	}

	public get loaded(): boolean {
		return !!this._texture;
	}

	protected loadInternal(): void {
		if (this._image)
			this.bindImage(this._image, this._width, this._height);
	}

	protected releaseInternal(): void {
		this.gl.context.deleteTexture(this._texture);
		this._texture = null;
	}

	protected destroyInternal(): void {
		this._image = null;
		this.gl = null;
	}

	private bindImage(image: HTMLImageElement, textureWidth: number, textureHeight: number): void {
		this.release();

		const width = (image ? image.width : textureWidth);
		const height = (image ? image.height : textureHeight);

		this._width = width;
		this._height = height;
		this._image = image;

		const gl = this.gl.context;

		if (!gl)
			return;

		if (width <= 0 || height <= 0)
			throw new Error(`Invalid image size: ${width} x ${height}`);

		const maxSize = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number);
		if (width > maxSize || height > maxSize)
			throw new Error(`Image size too large: ${width} x ${height} / max: ${maxSize}`);

		this.gl.clearErrors();

		const texture = gl.createTexture();

		if (!texture)
			throw new Error(`Null texture: ${gl.getError()}`);

		this._texture = texture;

		gl.bindTexture(gl.TEXTURE_2D, texture);

		if (image)
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		else
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		// https://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences#Non-Power_of_Two_Texture_Support
		// Sampling an NPOT texture in a shader will produce the RGBA color (0, 0, 0, 1) if:
		// The minification filter is set to anything but NEAREST or LINEAR: in other words, if it uses one of the mipmapped filters.
		// The repeat mode is set to anything but CLAMP_TO_EDGE; repeating NPOT textures are not supported.
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		this.gl.throwIfError();

		gl.bindTexture(gl.TEXTURE_2D, null);
	}
}
