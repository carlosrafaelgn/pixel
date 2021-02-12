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

class BlobDownloader {
	private static readonly saveAs: (blob: Blob, filename: string) => void = ((window as any)["saveAs"] || (window as any)["webkitSaveAs"] || (window as any)["mozSaveAs"] || (window as any)["msSaveAs"] || (window.navigator as any)["saveBlob"] || (window.navigator as any)["webkitSaveBlob"] || (window.navigator as any)["mozSaveBlob"] || window.navigator["msSaveBlob"]);

	public static readonly supported = (!!androidWrapper || (("Blob" in window) && ("URL" in window) && ("createObjectURL" in window.URL) && ("revokeObjectURL" in window.URL)));

	private static blobURL: string | null = null;

	public static freeURL(): void {
		if (BlobDownloader.blobURL) {
			URL.revokeObjectURL(BlobDownloader.blobURL);
			BlobDownloader.blobURL = null;
		}
	}

	public static download(blob: Blob | string, filename: string, type?: string): boolean {
		if (!BlobDownloader.supported || !blob || !filename)
			return false;

		BlobDownloader.freeURL();

		if ((typeof blob) === "string") {
			if (!type)
				return false;
			blob = new Blob([blob as string], { type: type });
		}

		if (BlobDownloader.saveAs) {
			try {
				BlobDownloader.saveAs.call(window.navigator, blob as Blob, filename);
				return true;
			} catch (ex) {
				// Try another method...
			}
		}

		const a = document.createElement("a");

		BlobDownloader.blobURL = URL.createObjectURL(blob);
		a.href = BlobDownloader.blobURL;
		a.download = filename;

		if (document.createEvent && (("MouseEvent" in window) || ("MouseEvents" in window))) {
			try {
				const evt = document.createEvent("MouseEvents");
				evt.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
				a.dispatchEvent(evt);
				return true;
			} catch (ex) {
				// Try another method...
			}
		}

		a.click(); // Works on Chrome but not on Firefox...

		return true;
	}
};
