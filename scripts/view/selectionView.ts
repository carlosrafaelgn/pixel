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

class SelectionView extends View {
	private readonly baseElement: HTMLDivElement;
	private readonly fileInput: HTMLInputElement;
	private readonly toolbarTop: HTMLDivElement;
	private readonly scrollContainer: ScrollContainer;

	private readonly boundPlay: any;
	private readonly boundShowMenu: any;

	private readonly thumbnails: HTMLDivElement[];
	private readonly thumbnailImages: HTMLImageElement[];
	private readonly thumbnailRecords: HTMLDivElement[];
	private readonly anchors: HTMLAnchorElement[];

	private hr: HTMLHRElement | null;
	private lastPlayedThumbnail: HTMLDivElement | null;

	private static createLoadOptions(thumbnail: HTMLDivElement): LevelLoadOptions {
		const id = thumbnail.getAttribute("data-id");
		const name = thumbnail.getAttribute("data-name");
		return (name ? (id ? { levelId: parseInt(id), levelNameOverride: name } : { levelName: name }) : {});
	}

	public constructor() {
		super();

		this.baseElement = document.createElement("div");
		this.baseElement.className = "base-element";
		this.baseElement.innerHTML = `
		<div class="hidden-container"><input id="fileInput" type="file" accept="application/json" tabindex="-1" /></div>
		<div id="toolbarTop" class="toolbar toolbar-top"></div>
		`;
		this.initialElements.push(this.baseElement);

		this.fileInput = this.baseElement.querySelector("#fileInput") as HTMLInputElement;
		this.toolbarTop = this.baseElement.querySelector("#toolbarTop") as HTMLDivElement;
		this.scrollContainer = new ScrollContainer(this.baseElement);

		this.createButton(this.toolbarTop, UISpriteSheet.Back, this.back.bind(this)).style.float = "left";

		this.fileInput.onchange = this.openFile.bind(this);

		if (LevelCache.isSupported())
			this.createButton(this.toolbarTop, UISpriteSheet.Open, this.open.bind(this));

		if (!androidWrapper && !isPWA)
			this.buttonsWithMargin.push(this.createButton(this.toolbarTop, UISpriteSheet.Fullscreen, this.fullscreen.bind(this)));

		this.boundPlay = this.play.bind(this);
		this.boundShowMenu = this.showMenu.bind(this);

		this.thumbnails = [];
		this.thumbnailImages = [];
		this.thumbnailRecords = [];
		this.anchors = [];
		this.hr = null;
		this.lastPlayedThumbnail = null;
	}

	protected resize(): void {
		const thumbnails = this.thumbnails,
			thumbnailImages = this.thumbnailImages,
			thumbnailRecords = this.thumbnailRecords,
			anchors = this.anchors,
			width = cssNumber(thumbnailWidth),
			height = cssNumber(thumbnailHeight),
			iconSizeNumber = cssNumber(iconSize),
			anchorBorderWidthCss = borderWidthCss + " 0 0 " + borderWidthCss,
			marginCss = toolbarAvailableHeightCss + " 0 0 " + css(27),
			doubleBorderWidthCss = css(borderWidth << 1),
			paddingCss = doubleBorderWidthCss + " 0",
			paddingRecordCss = doubleBorderWidthCss + " 0 0";

		if (this.hr) {
			this.hr.style.marginTop = toolbarAvailableHeightCss;
			this.hr.style.borderTopWidth = borderWidthCss;
		}

		this.toolbarTop.style.height = toolbarAvailableHeightCss;
		this.toolbarTop.style.borderBottomWidth = borderWidthCss;

		for (let i = thumbnails.length - 1; i >= 0; i--) {
			thumbnails[i].style.width = thumbnailWidthCss;
			thumbnails[i].style.borderWidth = borderWidthCss;
			thumbnails[i].style.margin = marginCss;
			thumbnails[i].style.padding = paddingCss;
			thumbnails[i].style.lineHeight = iconSizeCss;
			thumbnailImages[i].width = width;
			thumbnailImages[i].height = height;
			thumbnailImages[i].style.margin = paddingRecordCss;
			thumbnailRecords[i].style.borderTopWidth = borderWidthCss;
			thumbnailRecords[i].style.padding = paddingRecordCss;
			anchors[i].style.borderWidth = anchorBorderWidthCss;
			anchors[i].style.padding = buttonPaddingCss;
			UISpriteSheet.resize(anchors[i].firstChild as HTMLSpanElement);
			const childNodes = thumbnailRecords[i].childNodes;
			(childNodes[0] as HTMLSpanElement).style.marginRight = buttonMarginCss;
			(childNodes[3] as HTMLSpanElement).style.marginRight = buttonMarginCss;
			UISpriteSheet.resize(childNodes[0] as HTMLSpanElement);
			UISpriteSheet.resize(childNodes[3] as HTMLSpanElement);
		}

		this.scrollContainer.containerElement.style.paddingBottom = toolbarAvailableHeightCss;
		this.scrollContainer.resize(toolbarTotalHeight, baseHeight - toolbarTotalHeight);

		super.resize();
	}

	private updateThumbnailRecord(levelIdOrName: string | null, thumbnailRecord: HTMLDivElement): void {
		if (!levelIdOrName || !thumbnailRecord)
			return;

		const record = LevelCache.getLevelRecord(levelIdOrName);

		while (thumbnailRecord.firstChild)
			thumbnailRecord.removeChild(thumbnailRecord.firstChild);

		UISpriteSheet.create(UISpriteSheet.Trophy, thumbnailRecord);
		thumbnailRecord.appendChild(document.createTextNode(record ? record.name : "-"));
		thumbnailRecord.appendChild(document.createElement("br"));
		UISpriteSheet.create(UISpriteSheet.Clock, thumbnailRecord);
		thumbnailRecord.appendChild(document.createTextNode(record ? record.fmt : "-"));
	}

	private createThumbnail(name: string, builtInLevel: boolean, image: string | null = null, id: number = -1): void {
		const thumbnail = document.createElement("div") as HTMLDivElement,
			thumbnailPreview = document.createElement("div") as HTMLDivElement,
			thumbnailTitle = document.createElement("div") as HTMLDivElement,
			thumbnailImage = document.createElement("img") as HTMLImageElement,
			thumbnailRecord = document.createElement("div") as HTMLDivElement,
			anchor = document.createElement("a") as HTMLAnchorElement,
			levelIdOrName = (builtInLevel ? id.toString() : name);

		thumbnail.className = "thumbnail";
		if (builtInLevel) {
			thumbnail.setAttribute("data-id", levelIdOrName);
			thumbnail.setAttribute("data-name", Strings.LevelSpace + (id + 1));
		} else {
			thumbnail.setAttribute("data-name", levelIdOrName);
		}
		prepareButtonBlink(thumbnail, false, this.boundPlay);

		thumbnailPreview.className = "thumbnail-preview";

		thumbnailTitle.className = "thumbnail-text";
		thumbnailTitle.textContent = name;
		thumbnailPreview.appendChild(thumbnailTitle);

		if (image) {
			thumbnailImage.src = image;
		} else {
			LevelCache.loadLevelInfo(name, false).then((levelInfo) => {
				if (levelInfo)
					thumbnailImage.src = levelInfo.thumbnailImage;
			}, (reason) => {
				console.log(reason);
			});
		}
		thumbnailPreview.appendChild(thumbnailImage);

		UISpriteSheet.create(UISpriteSheet.Menu, anchor);

		anchor.className = "menu";
		prepareButtonBlink(anchor, false, this.boundShowMenu);
		thumbnailPreview.appendChild(anchor);

		thumbnail.appendChild(thumbnailPreview);
		
		thumbnailRecord.className = "thumbnail-text thumbnail-record";
		this.updateThumbnailRecord(levelIdOrName, thumbnailRecord);
		thumbnail.appendChild(thumbnailRecord);

		this.thumbnails.push(thumbnail);
		this.thumbnailImages.push(thumbnailImage);
		this.thumbnailRecords.push(thumbnailRecord);
		this.anchors.push(anchor);

		if (!builtInLevel && !this.hr) {
			this.hr = document.createElement("hr") as HTMLHRElement;
			this.scrollContainer.containerElement.appendChild(this.hr);
		}

		this.scrollContainer.containerElement.appendChild(thumbnail);
	}

	protected async attach(): Promise<void> {
		if (!this.thumbnails.length) {
			if (!LevelCache.BuiltInLevelIds)
				await LevelCache.loadBuiltInLevels();

			const builtInLevelIds = LevelCache.BuiltInLevelIds;

			for (let i = 0; i < builtInLevelIds.length; i++)
				this.createThumbnail(Strings.LevelSpace + (i + 1), true, LevelCache.builtInLevelThumbnailPath(i), builtInLevelIds[i]);

			const names = await LevelCache.getLevelNames();
			for (let i = 0; i < names.length; i++)
				this.createThumbnail(names[i], false);
		} else if (this.lastPlayedThumbnail) {
			const thumbnailRecord = this.lastPlayedThumbnail.getElementsByClassName("thumbnail-record");

			if (thumbnailRecord && thumbnailRecord[0])
				this.updateThumbnailRecord(this.lastPlayedThumbnail.getAttribute("data-id") || this.lastPlayedThumbnail.getAttribute("data-name"), thumbnailRecord[0] as HTMLDivElement);

			this.lastPlayedThumbnail = null;
		}

		this.scrollContainer.attach();
	}

	protected async detach(): Promise<void> {
		this.scrollContainer.detach();
	}

	protected destroyInternal(partial: boolean): void {
	}

	private back(): boolean {
		return (this.fadeTo(() => new TitleView()) ? true : false);
	}

	private openFile(): void {
		if (Modal.visible || !this.fileInput.files || !this.fileInput.files[0])
			return;

		const name = this.fileInput.files[0].name.toLowerCase();
		if (!name.endsWith(".json")) {
			Modal.show({ html: Strings.InvalidLevel + UISpriteSheet.html(UISpriteSheet.Error) });
			return;
		}

		View.loading = true;

		const reader = new FileReader();
		reader.onload = () => {
			this.fileInput.value = "";

			if (!reader.result) {
				View.loading = false;
				Modal.show({ html: Strings.EmptyLevel + UISpriteSheet.html(UISpriteSheet.Error) });
				return;
			}

			let level: Level | null = null;

			try {
				level = Level.revive(reader.result);
			} catch (ex) {
				// Just ignore...
			}

			function errorHandler() {
				View.loading = false;
				Modal.show({ html: Strings.ErrorLoadingLevel + UISpriteSheet.html(UISpriteSheet.Error) });
			}

			if (!level) {
				errorHandler();
				return;
			}

			if (!LevelCache.isNameValid(level.name))
				level.name = Strings.Level;

			level.prepare().then(() => {
				LevelCache.getLevelNames().then((names) => {
					if (!level)
						return;

					let originalName = level.name;
					if (/.*\(\d+\)$/.test(originalName)) {
						originalName = originalName.substr(0, originalName.lastIndexOf("(")).trim();
						if (!originalName)
							originalName = Strings.Level;
					}

					let newLevelIndex = 0,
						newLevelName = level.name;

					for (;;) {
						let ok = true;

						for (let i = names.length - 1; i >= 0; i--) {
							if (names[i] === newLevelName) {
								ok = false;
								break;
							}
						}

						if (ok)
							break;

						newLevelIndex++;
						newLevelName = `${originalName} (${newLevelIndex})`;
					}

					level.name = newLevelName;

					LevelCache.saveLevel(level, false).then(() => {
						View.loading = false;

						this.createThumbnail(newLevelName, false);

						this.resize();

						Modal.show({ title: Strings.Success, html: Strings.LevelImported + UISpriteSheet.html(UISpriteSheet.Success) });
					}, errorHandler);
				}, errorHandler);
			}, errorHandler);
		};
		reader.onerror = () => {
			this.fileInput.value = "";
			View.loading = false;
			Modal.show({ html: Strings.ErrorReadingLevel + UISpriteSheet.html(UISpriteSheet.Error) });
		};
		reader.readAsText(this.fileInput.files[0]);
	}

	private open(): boolean {
		this.fileInput.click();

		return true;
	}

	private fullscreen(): boolean {
		FullscreenControl.toggleFullscreen();
		return true;
	}

	private getTargetThumbnail(target: HTMLElement): HTMLDivElement | null {
		while (target && target !== document.body) {
			if (target.className === "thumbnail")
				return target as HTMLDivElement;
			target = target.parentNode as HTMLElement;
		}

		return null;
	}

	private play(e: Event): boolean {
		const target = e.target as HTMLElement;

		if (target.tagName === "A" || (target.tagName === "IMG" && (target.parentNode as HTMLElement).tagName === "A"))
			return false;

		const thumbnail = this.getTargetThumbnail(target);
		if (thumbnail) {
			this.lastPlayedThumbnail = thumbnail;
			this.fadeTo(() => new GameView(SelectionView.createLoadOptions(thumbnail), false), true);
			return true;
		}

		return false;
	}

	private showMenu(e: Event): boolean {
		const anchor = e.target as HTMLAnchorElement,
			thumbnail = this.getTargetThumbnail(anchor);

		if (!thumbnail)
			return false;

		const builtInLevel = !!thumbnail.getAttribute("data-id");

		let deleting = false, downloading = false;

		return Modal.show({
			title: Strings.Menu,
			html: `<button type="button" id="edit" ${builtInLevel ? "" : `data-style="margin-bottom: ${buttonMargin}"`}>${UISpriteSheet.html(UISpriteSheet.Edit)}${Strings.Edit}</button>
				${builtInLevel ? "" : `<br/><button type="button" id="delete" class="danger">${UISpriteSheet.html(UISpriteSheet.ClearRed)}${Strings.Delete}</button>`}`,
			buttons: [
				{
					defaultCancel: true,
					iconId: UISpriteSheet.Back,
					text: Strings.Close,
					onclick: () => {
						Modal.hide();
					}
				},
				{
					iconId: UISpriteSheet.Download,
					text: Strings.Download,
					onclick: () => {
						downloading = true;
						Modal.hide();
					}
				}
			],
			onbuttonclick: (id) => {
				switch (id) {
					case "edit":
						Modal.hide();
						this.editLevel(thumbnail);
						break;
					case "delete":
						deleting = true;
						Modal.hide();
						break;
				}
			},
			onhidden: () => {
				if (deleting)
					this.deleteLevel(anchor, thumbnail);
				else if (downloading)
					this.downloadLevel(thumbnail);
			}
		});
	}

	private editLevel(thumbnail: HTMLDivElement): void {
		this.fadeTo(() => new EditorView(SelectionView.createLoadOptions(thumbnail)));
	}

	private deleteLevel(anchor: HTMLAnchorElement, thumbnail: HTMLDivElement): void {
		const name = thumbnail.getAttribute("data-name");
		if (!name)
			return;

		let ok = false, error = false;

		Modal.show({
			html: Strings.DeleteLevel + name + "?",
			buttons: [
				{
					defaultCancel: true,
					iconId: UISpriteSheet.Back,
					text: Strings.Cancel,
					onclick: Modal.hide
				},
				{
					iconId: UISpriteSheet.ClearRed,
					text: Strings.Delete,
					className: "danger",
					onclick: async () => {
						if (View.loading)
							return;

						try {
							await LevelCache.deleteLevel(name);

							const anchors = this.anchors;
							for (let i = anchors.length - 1; i >= 0; i--) {
								if (anchors[i] === anchor) {
									this.scrollContainer.containerElement.removeChild(thumbnail);
									this.thumbnails.splice(i, 1);
									this.thumbnailImages.splice(i, 1);
									this.thumbnailRecords.splice(i, 1);
									anchors.splice(i, 1);
									if (anchors.length === LevelCache.BuiltInLevelIds.length && this.hr) {
										this.scrollContainer.containerElement.removeChild(this.hr);
										this.hr = null;
									}
									this.scrollContainer.resize(toolbarTotalHeight, baseHeight - toolbarTotalHeight);
									break;
								}
							}

							ok = true;
						} catch (ex) {
							error = true;
						}

						Modal.hide();
					}
				}
			],
			onhidden: () => {
				if (error)
					Modal.show({ html: Strings.SomethingWentWrong + UISpriteSheet.html(UISpriteSheet.Error) });
				else if (ok)
					Modal.show({ title: Strings.Success, html: Strings.LevelDeleted + UISpriteSheet.html(UISpriteSheet.Success) });
			}
		});
	}

	private async downloadLevel(thumbnail: HTMLDivElement): Promise<void> {
		const id = thumbnail.getAttribute("data-id");
		const name = thumbnail.getAttribute("data-name");
		if (!name)
			return;

		switch (await LevelCache.downloadLevel(name, id ? parseInt(id) : -1)) {
			case LevelCache.DownloadLevelSuccess:
				Modal.show({ title: Strings.Success, html: Strings.LevelDownloaded + UISpriteSheet.html(UISpriteSheet.Success) });
				break;
			case LevelCache.DownloadLevelError:
				Modal.show({ html: Strings.SomethingWentWrong + UISpriteSheet.html(UISpriteSheet.Error) });
				break;
			case LevelCache.DownloadLevelNoPermission:
				Modal.show({ html: Strings.TryToDownloadAgain });
				break;
			case LevelCache.DownloadLevelFileAlreadyExists:
				Modal.show({ html: Strings.DownloadFailedFileExists + UISpriteSheet.html(UISpriteSheet.Error) });
				break;
		}
	}
}
