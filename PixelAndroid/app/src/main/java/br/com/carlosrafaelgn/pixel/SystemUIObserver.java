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

package br.com.carlosrafaelgn.pixel;

import android.os.Handler;
import android.os.Message;
import android.view.View;

@SuppressWarnings({"WeakerAccess", "unused"})
public final class SystemUIObserver implements Handler.Callback, View.OnSystemUiVisibilityChangeListener {
	public static final int MSG_HIDE = 0x0400;
	public static final int MSG_SYSTEM_UI_CHANGED = 0x0401;

	private Handler handler;
	private View decor;
	private int version;
	private boolean isWindowFocused;

	public SystemUIObserver(View decor, boolean isWindowFocused) {
		this.handler = new Handler(this);
		this.decor = decor;
		this.isWindowFocused = isWindowFocused;

		try {
			decor.setOnSystemUiVisibilityChangeListener(this);
		} catch (Throwable th) {
			// Just ignore...
		}
	}

	@Override
	public void onSystemUiVisibilityChange(int visibility) {
		if (handler != null)
			handler.sendMessage(Message.obtain(handler, MSG_SYSTEM_UI_CHANGED, visibility & View.SYSTEM_UI_FLAG_HIDE_NAVIGATION, 0));
	}

	public void onWindowFocusChanged(boolean isWindowFocused) {
		if ((this.isWindowFocused = isWindowFocused))
			hideDelayed();
	}

	public void hide() {
		if (decor == null)
			return;
		try {
			decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
				View.SYSTEM_UI_FLAG_FULLSCREEN |
				View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
				View.SYSTEM_UI_FLAG_LOW_PROFILE |
				View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
				View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
				View.SYSTEM_UI_FLAG_IMMERSIVE);
		} catch (Throwable th) {
			// Just ignore...
		}
	}

	public void hideDelayed() {
		if (decor == null || handler == null)
			return;

		version++;
		handler.removeMessages(SystemUIObserver.MSG_HIDE);
		handler.sendMessageDelayed(Message.obtain(handler, SystemUIObserver.MSG_HIDE, version, 0), 4000);
	}

	public void show() {
		if (decor == null)
			return;
		try {
			decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
				View.SYSTEM_UI_FLAG_FULLSCREEN |
				View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
				//View.SYSTEM_UI_FLAG_LOW_PROFILE |
				View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
				//View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
				View.SYSTEM_UI_FLAG_IMMERSIVE);
		} catch (Throwable th) {
			// Just ignore...
		}
	}

	public void destroy() {
		version++;

		handler = null;

		if (decor != null) {
			try {
				decor.setOnSystemUiVisibilityChangeListener(null);
			} catch (Throwable th) {
				// Just ignore...
			}
			decor = null;
		}
	}

	@Override
	public boolean handleMessage(Message msg) {
		switch (msg.what) {
		case SystemUIObserver.MSG_HIDE:
			if (msg.arg1 != version || !isWindowFocused)
				break;
			hide();
			break;
		case SystemUIObserver.MSG_SYSTEM_UI_CHANGED:
			hideDelayed();
			break;
		}
		return true;
	}
}
