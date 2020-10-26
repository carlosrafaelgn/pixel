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

interface LevelLoadOptions {
	level?: Level;
	levelId?: number;
	levelName?: string;
	levelNameOverride?: string;
}

interface LevelRecord {
	time: number;
	name: string;
	fmt: string;
}

class LevelCache {
	// Must be in sync with MainActivity.java
	public static readonly DownloadLevelSuccess = 1;
	public static readonly DownloadLevelError = 0;
	public static readonly DownloadLevelNoPermission = -1;
	public static readonly DownloadLevelFileAlreadyExists = -2;

	public static BuiltInLevelIds: number[] = null;
	private static BuiltInLevels: string[] = null;
	private static BuiltInLevelThumbnails: string[] = null;
	private static BuiltInLevelsLoadFinished: () => void = null;

	private static readonly LevelInfoExtension = ".levelinfo";
	private static readonly CacheName = "pixel-level-cache";
	private static readonly EditorLevelName = "pixel-editor-level";
	private static readonly LastRecordNameName = "pixel-editor-last-name";
	private static readonly LevelRecordsName = "pixel-editor-level-records";

	private static LevelRecords: { [levelIdOrName: string]: LevelRecord } = null;
	public static LastRecordName: string = null;

	public static loadBuiltInLevels(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (LevelCache.BuiltInLevelIds)
				resolve();
			else
				LevelCache.BuiltInLevelsLoadFinished = resolve;
		});
	}

	public static builtInLevelThumbnailPath(id: number): string {
		if (id < 0 || id >= LevelCache.BuiltInLevelThumbnails.length)
			throw new Error("Invalid id");

		return LevelCache.BuiltInLevelThumbnails[id];
	}

	public static loadBuiltInLevel(id: number): Level {
		if (id < 0 || id >= LevelCache.BuiltInLevels.length)
			throw new Error("Invalid id");

		try {
			return Level.revive(LevelCache.BuiltInLevels[id]);
		} catch (ex) {
			return null;
		}
	}

	public static isNameValid(name: string): boolean {
		name = (name || "").trim();
		return !!name && !name.endsWith(LevelCache.LevelInfoExtension) && !/^\.+$/.test(name) && !/[\\\/\?\*\:\<\>\%]/.test(name) && !/^\d+$/.test(name);
	}

	public static async getLevelNames(controlLoading = true): Promise<string[]> {
		if (controlLoading)
			View.loading = true;

		try {
			const cache = await caches.open(LevelCache.CacheName);
			const keys = await cache.keys();
			if (!keys || !keys.length)
				return [];
			const names: string[] = new Array(keys.length >> 1),
				levelInfoExtension = LevelCache.LevelInfoExtension;
			for (let i = keys.length - 1, n = 0; i >= 0; i--) {
				const url = keys[i].url;
				if (url.endsWith(levelInfoExtension))
					continue;
				const j = url.lastIndexOf("/");
				names[n++] = decodeURIComponent(j < 0 ? url : url.substr(j + 1));
			}
			names.sort();
			return names;
		} catch (ex) {
			return [];
		} finally {
			if (controlLoading)
				View.loading = false;
		}
	}

	public static async loadLevelInfo(name: string, controlLoading = true): Promise<LevelInfo> {
		if (!LevelCache.isNameValid(name))
			throw new Error("Invalid name");

		if (controlLoading)
			View.loading = true;

		try {
			const cache = await caches.open(LevelCache.CacheName);
			const response = await cache.match(encodeURIComponent(name + LevelCache.LevelInfoExtension));
			if (!response)
				return null;
			const json = await response.text();
			if (!json)
				return null;
			try {
				return JSON.parse(json) as LevelInfo;
			} catch (ex) {
				return null;
			}
		} catch (ex) {
			return null;
		} finally {
			if (controlLoading)
				View.loading = false;
		}
	}

	public static async saveLevel(level: Level, controlLoading = true): Promise<void> {
		if (!level || !LevelCache.isNameValid(level.name))
			throw new Error("Invalid level");

		if (controlLoading)
			View.loading = true;

		const thumbnailImage = level.thumbnailImage;
		try {
			const cache = await caches.open(LevelCache.CacheName);
			await cache.put(encodeURIComponent(level.name + LevelCache.LevelInfoExtension), new Response(new Blob([JSON.stringify(level.toLevelInfo())], { type:"application/json" })));
			level.thumbnailImage = null;
			await cache.put(encodeURIComponent(level.name), new Response(new Blob([JSON.stringify(level)], { type:"application/json" })));
		} finally {
			level.thumbnailImage = thumbnailImage;
			if (controlLoading)
				View.loading = false;
		}
	}

	public static async loadLevel(name: string, controlLoading = true): Promise<Level> {
		if (!LevelCache.isNameValid(name))
			throw new Error("Invalid name");

		if (controlLoading)
			View.loading = true;

		try {
			const cache = await caches.open(LevelCache.CacheName);
			const response = await cache.match(encodeURIComponent(name));
			if (!response)
				return null;
			const json = await response.text();
			if (!json)
				return null;
			try {
				return Level.revive(json);
			} catch (ex) {
				return null;
			}
		} finally {
			if (controlLoading)
				View.loading = false;
		}
	}

	public static async deleteLevel(name: string, controlLoading = true): Promise<void> {
		if (!LevelCache.isNameValid(name))
			throw new Error("Invalid name");

		if (controlLoading)
			View.loading = true;

		try {
			const cache = await caches.open(LevelCache.CacheName);
			await cache.delete(encodeURIComponent(name));
			await cache.delete(encodeURIComponent(name + LevelCache.LevelInfoExtension));
			LevelCache.deleteLevelRecord(name);
		} finally {
			if (controlLoading)
				View.loading = false;
		}
	}

	public static async downloadLevel(name: string, id = -1, controlLoading = true): Promise<number> {
		if (!LevelCache.isNameValid(name))
			throw new Error("Invalid name");

		if (!BlobDownloader.supported)
			return LevelCache.DownloadLevelError;

		if (controlLoading)
			View.loading = true;

		try {
			let json: string;
			let s: number;

			if (id >= 0 && id < LevelCache.BuiltInLevels.length) {
				json = LevelCache.BuiltInLevels[id];
				// Avoid parsing... :)
				s = json.indexOf('"name":"') + 8;
				json = json.substr(0, s) + name + json.substr(json.indexOf('"', s));
			} else {
				const cache = await caches.open(LevelCache.CacheName);
				const response = await cache.match(encodeURIComponent(name));
				if (!response)
					return LevelCache.DownloadLevelError;
				json = await response.text();
				if (!json)
					return LevelCache.DownloadLevelError;
			}

			name += ".json";

			// Avoid parsing... :)
			s = json.indexOf('"processedImage":');
			if (s >= 0) {
				s += 17;
				if (json.charAt(s) === "\"") {
					const e = json.indexOf("\"", s + 1);
					if (e > s)
						json = json.substr(0, s) + "null" + json.substr(e + 1);
				}
			}
			s = json.indexOf('"thumbnailImage":');
			if (s >= 0) {
				s += 17;
				if (json.charAt(s) === "\"") {
					const e = json.indexOf("\"", s + 1);
					if (e > s)
						json = json.substr(0, s) + "null" + json.substr(e + 1);
				}
			}
			s = json.indexOf('"polygons":');
			if (s >= 0) {
				s += 11;
				if (json.charAt(s) === "[") {
					let e = json.indexOf("],", s + 1);
					if (e > s) {
						json = json.substr(0, s) + "null" + json.substr(e + 1);
					} else {
						e = json.indexOf("}]}]}", s + 1);
						if (e > s)
							json = json.substr(0, s) + "null" + json.substr(e + 4);
					}
				}
			}
			return (androidWrapper ?
				androidWrapper.downloadLevel(name, json, null) :
				(BlobDownloader.download(json, name, "application/json") ? LevelCache.DownloadLevelSuccess : LevelCache.DownloadLevelError)
			);
		} catch (ex) {
			return LevelCache.DownloadLevelError;
		} finally {
			if (controlLoading)
				View.loading = false;
		}
	}

	public static async downloadLevelImage(name: string, canvas: HTMLCanvasElement, controlLoading = true): Promise<number> {
		if (!LevelCache.isNameValid(name))
			name = Strings.Level;

		if (!BlobDownloader.supported)
			return LevelCache.DownloadLevelError;

		if (controlLoading)
			View.loading = true;

		try {
			name += ".png";

			if (androidWrapper) {
				let imageBase64 = canvas.toDataURL("image/png");

				const i = imageBase64.indexOf("data:image/png;base64,");
				if (i >= 0)
					imageBase64 = imageBase64.substr(i + 22);
	
				return androidWrapper.downloadLevel(name, null, imageBase64);
			} else {
				return new Promise<number>((resolve, reject) => {
					canvas.toBlob((blob) => {
						resolve((blob && BlobDownloader.download(blob, name, "image/png")) ? LevelCache.DownloadLevelSuccess : LevelCache.DownloadLevelError);
					}, "image/png");
				});
			}
		} catch (ex) {
			return LevelCache.DownloadLevelError;
		} finally {
			if (controlLoading)
				View.loading = false;
		}
	}

	public static async renameLevel(oldName: string, newName: string, controlLoading = true): Promise<boolean> {
		if (!LevelCache.isNameValid(oldName) || !LevelCache.isNameValid(newName))
			throw new Error("Invalid name");

		if (controlLoading)
			View.loading = true;

		try {
			const level = await LevelCache.loadLevel(oldName, false);
			const levelInfo = await LevelCache.loadLevelInfo(oldName, false);
			if (!level || !levelInfo)
				return false;
			level.name = newName;
			level.thumbnailImage = levelInfo.thumbnailImage;
			await LevelCache.saveLevel(level, false);
			await LevelCache.deleteLevel(oldName, false);
			return true;
		} finally {
			if (controlLoading)
				View.loading = false;
		}
	}

	public static async sendLevelToEditor(name: string, level: Level = null, controlLoading = true): Promise<boolean> {
		if ((!name && !level) || (name && level) || (name && !LevelCache.isNameValid(name)))
			throw new Error("Invalid level");

		if (controlLoading)
			View.loading = true;

		try {
			let json: string = null;
			if (name) {
				const cache = await caches.open(LevelCache.CacheName);
				const response = await cache.match(encodeURIComponent(name));
				if (!response)
					return false;
				json = await response.text();
			} else {
				json = JSON.stringify(level);
			}
			if (!json)
				return false;
			localStorage.setItem(LevelCache.EditorLevelName, json);
			return true;
		} finally {
			if (controlLoading)
				View.loading = false;
		}
	}

	public static loadEditorLevel(): Level {
		return Level.revive(localStorage.getItem(LevelCache.EditorLevelName));
	}

	public static saveEditorLevel(level: Level): void {
		if (level)
			localStorage.setItem(LevelCache.EditorLevelName, JSON.stringify(level));
		else
			localStorage.removeItem(LevelCache.EditorLevelName);
	}

	public static async loadLevelFromOptions(loadOptions: LevelLoadOptions): Promise<Level> {
		return (!loadOptions ? LevelCache.loadEditorLevel() : (loadOptions.level || (loadOptions.levelName ? await LevelCache.loadLevel(loadOptions.levelName, false) : LevelCache.loadBuiltInLevel(loadOptions.levelId))));
	}

	public static getLevelRecord(levelIdOrName: string): LevelRecord {
		if (!LevelCache.LevelRecords) {
			try {
				const json = localStorage.getItem(LevelCache.LevelRecordsName);
				if (json)
					LevelCache.LevelRecords = JSON.parse(json);
			} catch (ex) {
				// Just ignore...
			}

			if (!LevelCache.LevelRecords) {
				LevelCache.LevelRecords = {};
			} else {
				for (let n in LevelCache.LevelRecords) {
					const record = LevelCache.LevelRecords[n];
					if (record) {
						if (record.fmt.indexOf(Strings.OppositeDecimalSeparator) >= 0)
							record.fmt = record.fmt.replace(Strings.OppositeDecimalSeparator, Strings.DecimalSeparator);
						else
							break;
					}
				}
			}

			LevelCache.LastRecordName = localStorage.getItem(LevelCache.LastRecordNameName);
		}

		return (LevelCache.LevelRecords[levelIdOrName] || null);
	}

	public static setLevelRecord(levelIdOrName: string, time: number, name: string): void {
		const record = LevelCache.getLevelRecord(levelIdOrName);

		name = (name ? name.trim() : "");

		if (record) {
			record.time = time;
			record.name = name || "-";
			record.fmt = LevelCache.formatLevelRecordTime(time);
		} else {
			LevelCache.LevelRecords[levelIdOrName] = {
				time: time,
				name: name || "-",
				fmt: LevelCache.formatLevelRecordTime(time)
			};
		}

		localStorage.setItem(LevelCache.LevelRecordsName, JSON.stringify(LevelCache.LevelRecords));
		if (LevelCache.LastRecordName !== name)
			localStorage.setItem(LevelCache.LastRecordNameName, LevelCache.LastRecordName = name);
	}

	public static deleteLevelRecord(name: string): void {
		const record = LevelCache.getLevelRecord(name);

		if (record) {
			delete LevelCache.LevelRecords[name];
			localStorage.setItem(LevelCache.LevelRecordsName, JSON.stringify(LevelCache.LevelRecords));
		}
	}

	public static clearLastRecordName(): void {
		if (LevelCache.LastRecordName)
			localStorage.setItem(LevelCache.LastRecordNameName, LevelCache.LastRecordName = "");
	}

	public static formatLevelRecordTime(milliseconds: number): string {
		if (!milliseconds || milliseconds < 0)
			return "-";

		let centiseconds = (milliseconds / 10) | 0;
		if (centiseconds > 99999)
			centiseconds = 99999;

		return ((centiseconds / 100) | 0) + Strings.DecimalSeparator + format2(centiseconds % 100) + " s";
	}
}
