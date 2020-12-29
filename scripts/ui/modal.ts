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

interface ModalButtonCallback {
	(id: string, button: HTMLButtonElement): void;
}

interface ModalButton {
	id?: string;
	defaultCancel?: boolean;
	defaultSubmit?: boolean;
	iconId: number;
	text: string;
	className?: string;
	onclick?: ModalButtonCallback;
}

interface ModalOptions {
	html: string | HTMLElement;
	title?: string;
	large?: boolean;
	okcancel?: boolean;
	okcancelsubmit?: boolean;
	buttons?: ModalButton[];
	onbuttonclick?: ModalButtonCallback;
	onresized?: () => void;
	onshowing?: () => void;
	onshown?: () => void;
	onhiding?: () => boolean;
	onhidden?: () => void;
	onok?: () => void;
	oncancel?: () => void;
}

class Modal {
	private static modal: Modal = null;

	public static get visible(): boolean {
		return !!Modal.modal;
	}

	public static get currentModalElement() : HTMLFormElement {
		return (Modal.modal ? Modal.modal.modalElement : null);
	}

	public static get currentModalHeaderElement() : HTMLDivElement {
		return (Modal.modal ? Modal.modal.modalHeaderElement : null);
	}

	public static get currentModalBodyElement() : HTMLDivElement {
		return (Modal.modal ? Modal.modal.modalBodyElement : null);
	}

	public static get currentModalFooterElement() : HTMLDivElement {
		return (Modal.modal ? Modal.modal.modalFooterElement : null);
	}

	public static show(options: ModalOptions): boolean {
		if (Modal.modal)
			return false;

		if (options.okcancel) {
			options.buttons = [
				{
					id: "cancel",
					defaultCancel: true,
					iconId: UISpriteSheet.Back,
					text: Strings.Cancel,
					onclick: (options.oncancel || Modal.hide),
				},
				{
					id: "ok",
					defaultSubmit: options.okcancelsubmit,
					iconId: UISpriteSheet.AcceptGreen,
					text: Strings.OK,
					className: "accept",
					onclick: (options.onok || Modal.hide),
				}
			];
		} else if (!options.buttons || !options.buttons.length) {
			options.buttons = [
				{
					id: "cancel",
					defaultCancel: true,
					iconId: UISpriteSheet.Back,
					text: Strings.Close,
					onclick: Modal.hide
				}
			];
		}

		Modal.modal = new Modal(options);

		return true;
	}

	public static hide(): void {
		if (Modal.modal)
			Modal.modal.hideInternal();
	}

	public static defaultCancelAction(): void {
		if (Modal.modal)
			Modal.modal.defaultCancelActionInternal();
	}

	public static windowResized(): void {
		if (Modal.modal)
			Modal.modal.resizeInternal();
	}

	private readonly options: ModalOptions;
	private readonly containerElement: HTMLDivElement;
	private readonly modalElement: HTMLFormElement;
	private readonly modalHeaderElement: HTMLDivElement;
	private readonly modalBodyElement: HTMLDivElement;
	private readonly modalFooterElement: HTMLDivElement;
	private readonly defaultCancelButton: HTMLButtonElement;
	private readonly defaultSubmitButton: HTMLButtonElement;

	private readonly boundDocumentKeyDown: any;

	private fading: boolean;

	private constructor(options: ModalOptions) {
		this.options = options;

		this.containerElement = document.createElement("div");
		this.containerElement.className = "base-element modal-container";

		this.modalElement = document.createElement("form");
		this.modalElement.className = "modal";
		this.modalElement.onsubmit = this.submit.bind(this);

		this.modalHeaderElement = document.createElement("div");
		this.modalHeaderElement.className = "modal-decoration";
		this.modalHeaderElement.innerHTML = options.title || Strings.Oops;

		this.modalBodyElement = document.createElement("div");
		this.modalBodyElement.className = "modal-body";
		if ((typeof options.html) === "string")
			this.modalBodyElement.innerHTML = options.html as string;
		else
			this.modalBodyElement.appendChild(options.html as HTMLElement);

		const buttons = this.modalBodyElement.getElementsByTagName("button");
		if (buttons && buttons.length) {
			for (let i = buttons.length - 1; i >= 0; i--) {
				const button = buttons[i];
				prepareButtonBlink(button, true, () => {
					if (this.fading)
						return false;

					if (this.options.onbuttonclick)
						this.options.onbuttonclick(button.id, button);

					return true;
				});
			}
		}

		const images = this.modalBodyElement.getElementsByTagName("span");
		if (images && images.length) {
			for (let i = images.length - 1; i >= 0; i--) {
				const image = images[i];
				if (image.getAttribute(UISpriteSheet.SheetId))
					UISpriteSheet.finishHTMLCreation(image);
			}
		}

		this.modalFooterElement = document.createElement("div");
		this.modalFooterElement.className = "modal-decoration";

		this.defaultCancelButton = null;
		this.defaultSubmitButton = null;

		for (let i = 0; i < options.buttons.length; i++) {
			const currentButton = options.buttons[i];

			const button = document.createElement("button");
			if (currentButton.defaultCancel)
				this.defaultCancelButton = button;
			if (currentButton.defaultSubmit)
				this.defaultSubmitButton = button;
			button.style.height = buttonHeightCss;
			button.style.borderWidth = borderWidthCss;
			if (currentButton.className)
				button.className = currentButton.className;
			if (i)
				button.style.float = "right";
			button.setAttribute("type", "button");
			UISpriteSheet.create(currentButton.iconId, button);
			button.appendChild(document.createTextNode(currentButton.text));
			prepareButtonBlink(button, true, () => {
				if (this.fading)
					return false;

				if (currentButton.onclick)
					currentButton.onclick(currentButton.id, button);

				if (this.options.onbuttonclick)
					this.options.onbuttonclick(currentButton.id, button);

				return true;
			});

			this.modalFooterElement.appendChild(button);
		}

		this.modalElement.appendChild(this.modalHeaderElement);
		this.modalElement.appendChild(this.modalBodyElement);
		this.modalElement.appendChild(this.modalFooterElement);
		this.containerElement.appendChild(this.modalElement);
		View.main.appendChild(this.containerElement);

		this.boundDocumentKeyDown = this.documentKeyDown.bind(this);
		document.addEventListener("keydown", this.boundDocumentKeyDown, true);

		this.fading = true;

		setTimeout(() => {
			if (options.onshowing)
				options.onshowing();

			this.resizeInternal();

			this.containerElement.classList.add("visible");

			setTimeout(() => {
				this.fading = false;

				View.pushHistoryStateIfNecessary();

				if (this.options.onshown)
					this.options.onshown();
			}, 520);
		}, 50);
	}

	private hideInternal(): void {
		if (Modal.modal !== this || this.fading)
			return;

		if (this.options.onhiding && this.options.onhiding() === false)
			return;

		document.removeEventListener("keydown", this.boundDocumentKeyDown, true);

		this.fading = true;
		this.containerElement.classList.remove("visible");

		setTimeout(() => {
			Modal.modal = null;

			View.popHistoryStateIfNecessary();

			if (this.options.onhidden)
				this.options.onhidden();

			View.main.removeChild(this.containerElement);

			for (let i = this.options.buttons.length - 1; i >= 0; i--)
				zeroObject(this.options.buttons[i]);
			zeroObject(this.options);
			zeroObject(this);
		}, 520);
	}

	private documentKeyDown(e: KeyboardEvent): void {
		if (e.key === "Escape" || e.keyCode === 27)
			this.defaultCancelActionInternal();
	}

	private defaultCancelActionInternal(): void {
		if (this.defaultCancelButton)
			this.defaultCancelButton.click();
	}

	private submit(e: Event): boolean {
		cancelEvent(e);

		if (this.defaultSubmitButton)
			this.defaultSubmitButton.click();

		return false;
	}

	private resizeInternal(): void {
		if (Modal.modal !== this)
			return;

		this.modalElement.style.fontSize = fontSizeCss;
		this.modalElement.style.maxWidth = css(this.options.large ? baseWidth : (baseWidth >> 1));
		this.modalElement.style.margin = (this.options.large ? "0" : (iconSizeCss + " auto"));

		this.modalHeaderElement.style.padding = buttonPaddingCss;
		this.modalBodyElement.style.padding = iconSizeCss + " " + buttonPaddingCss;
		this.modalBodyElement.style.lineHeight = iconSizeCss;
		this.modalFooterElement.style.padding = buttonPaddingCss;

		const elements = this.modalElement.querySelectorAll("[data-style]");
		if (elements && elements.length) {
			for (let i = elements.length - 1; i >= 0; i--) {
				const element = elements[i] as HTMLElement;
				const styles = element.getAttribute("data-style").split(";");
				for (let j = 0; j < styles.length; j++) {
					const style = styles[j];
					const c = style.indexOf(":");
					if (c >= 0)
						element.style[style.substr(0, c)] = css(parseInt(style.substr(c + 1)));
				}
			}
		}

		const inputs = this.modalElement.getElementsByTagName("input");
		if (inputs && inputs.length) {
			const paddingCss = css(2);
			for (let i = inputs.length - 1; i >= 0; i--) {
				const input = inputs[i];
				input.style.borderWidth = borderWidthCss;
				input.style.padding = paddingCss;
				input.style.marginTop = paddingCss;
			}
		}

		const buttons = this.modalElement.getElementsByTagName("button");
		if (buttons && buttons.length) {
			for (let i = buttons.length - 1; i >= 0; i--) {
				const button = buttons[i];
				button.style.height = buttonHeightCss;
				button.style.borderWidth = borderWidthCss;
				button.style.fontSize = fontSizeCss;
				button.style.lineHeight = iconSizeCss;
				button.style.paddingLeft = buttonPaddingCss;
				button.style.paddingRight = buttonPaddingCss;
			}
		}

		const images = this.modalElement.getElementsByTagName("span");
		if (images && images.length) {
			for (let i = images.length - 1; i >= 0; i--) {
				const image = images[i];
				if (image.getAttribute(UISpriteSheet.SheetId)) {
					UISpriteSheet.resize(image);
					if ((image.parentNode as HTMLElement).tagName === "BUTTON")
						image.style.marginRight = buttonMarginCss;
				}
			}
		}

		if (this.options.onresized)
			this.options.onresized();
	}
}
