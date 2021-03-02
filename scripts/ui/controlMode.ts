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

class ControlMode {
	private static readonly ControlModeName = "pixel-control-mode";

	public static readonly ImagesByMode = [
		UISpriteSheet.Hand,
		UISpriteSheet.DeviceH,
		UISpriteSheet.DeviceV,
		UISpriteSheet.DeviceHI,
		UISpriteSheet.DeviceVI
	];

	// Must be in sync with lib/shared.h
	public static readonly Pointer = 0;
	public static readonly AccelerometerH = 1;
	public static readonly AccelerometerV = 2;
	public static readonly AccelerometerHI = 3;
	public static readonly AccelerometerVI = 4;

	private static _mode = ControlMode.Pointer;
	private static _accelerationSupported = false;
	private static skipAndroid = false;
	private static invertXY = false;
	private static invertSign = false;

	public static accelerationX = 0;
	public static accelerationY = 0;

	public static get mode(): number {
		return ControlMode._mode;
	}

	public static get accelerationSupported(): boolean {
		return ControlMode._accelerationSupported;
	}

	public static get modeImage(): number {
		return ControlMode.ImagesByMode[ControlMode._mode];
	}

	public static toggleMode(): void {
		let mode = ControlMode._mode + 1;
		if (mode > ControlMode.AccelerometerVI || !ControlMode._accelerationSupported)
			mode = ControlMode.Pointer;
		ControlMode._mode = mode;
		localStorage.setItem(ControlMode.ControlModeName, mode.toString());
		ControlMode.prepare();
	}

	public static init(): void {
		ControlMode._accelerationSupported = ((androidWrapper && androidWrapper.isSupported()) || ("DeviceMotionEvent" in window));
		if (!ControlMode._accelerationSupported) {
			ControlMode._mode = ControlMode.Pointer;
		} else {
			const mode = parseInt(localStorage.getItem(ControlMode.ControlModeName) as any);
			ControlMode._mode = ((isNaN(mode) || mode < ControlMode.Pointer || mode > ControlMode.AccelerometerVI) ? ControlMode.Pointer : mode);
		}
		ControlMode.prepare();
	}

	private static prepare(): void {
		// https://developers.google.com/web/fundamentals/native-hardware/device-orientation/
		// https://developer.mozilla.org/en-US/docs/Web/API/Accelerometer
		// https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent
		// https://developer.mozilla.org/en-US/docs/Web/API/Window/devicemotion_event
		// https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent
		// https://developer.mozilla.org/en-US/docs/Web/API/Window/deviceorientation_event

		window.removeEventListener("devicemotion", ControlMode.deviceMotion);
		ControlMode.invertXY = (ControlMode._mode === ControlMode.AccelerometerV || ControlMode._mode === ControlMode.AccelerometerVI);
		ControlMode.invertSign = (ControlMode._mode === ControlMode.AccelerometerHI || ControlMode._mode === ControlMode.AccelerometerVI);
		if (ControlMode._mode !== ControlMode.Pointer)
			window.addEventListener("devicemotion", ControlMode.deviceMotion);
	}

	public static processAndroidAcceleration(): void {
		// Process only every other frame
		if (ControlMode.skipAndroid) {
			ControlMode.skipAndroid = false;
			return;
		}
		ControlMode.skipAndroid = true;

		let x: number, y: number;
		if (ControlMode.invertXY) {
			x = androidWrapper.getY();
			y = androidWrapper.getX();
		} else {
			x = -androidWrapper.getX();
			y = androidWrapper.getY();
		}
		if (ControlMode.invertSign) {
			x = -x;
			y = -y;
		}
		if (x > -0.3 && x < 0.3)
			x = 0;
		if (y > -0.3 && y < 0.3)
			y = 0;

		// Add a simple low-pass filter to smooth the actual movement
		ControlMode.accelerationX = (0.8 * ControlMode.accelerationX) + (0.2 * x);
		ControlMode.accelerationY = (0.8 * ControlMode.accelerationY) + (0.2 * y);
	}

	private static deviceMotion(e: DeviceMotionEvent): void {
		const acc = e.accelerationIncludingGravity as any;

		let x: number, y: number;
		if (ControlMode.invertXY) {
			x = acc.y;
			y = acc.x;
		} else {
			x = -acc.x;
			y = acc.y;
		}
		if (ControlMode.invertSign) {
			x = -x;
			y = -y;
		}
		if (x > -0.3 && x < 0.3)
			x = 0;
		if (y > -0.3 && y < 0.3)
			y = 0;

		// Add a simple low-pass filter to smooth the actual movement
		ControlMode.accelerationX = (0.8 * ControlMode.accelerationX) + (0.2 * x);
		ControlMode.accelerationY = (0.8 * ControlMode.accelerationY) + (0.2 * y);
	}
}
