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

class ResourceStorage {
	private _count = 0;
	private resources: { [name: string]: Resource } | null = {};

	public get count(): number {
		return this._count;
	}

	public contains(name: string): boolean {
		return (this.resources ? (name in this.resources) : false);
	}

	public add(name: string, resource: Resource): void {
		if (!name || !resource || !this.resources)
			throw new Error("Invalid resource");

		if ((name in this.resources))
			throw new Error("Name already exists");

		this.resources[name] = resource;
		this._count++;
	}

	public getAndRemove(name: string): Resource | null {
		if (!this.resources)
			return null;

		const resource = this.resources[name];
		if (resource) {
			delete this.resources[name];
			this._count--;
			return resource;
		}

		return null;
	}

	public get(name: string): Resource | null {
		return (this.resources ? this.resources[name] : null);
	}

	public get loaded(): boolean {
		if (this.resources) {
			for (let name in this.resources) {
				if (!this.resources[name].loaded)
					return false;
			}
			return !!this._count;
		}
		return false;
	}

	public load(): void {
		if (this.resources) {
			for (let name in this.resources)
				this.resources[name].load();
		}
	}

	public release(): void {
		if (this.resources) {
			for (let name in this.resources)
				this.resources[name].release();
		}
	}

	public destroy(): void {
		if (this.resources) {
			for (let name in this.resources)
				this.resources[name].destroy();
			this.resources = null;
		}
	}
}
