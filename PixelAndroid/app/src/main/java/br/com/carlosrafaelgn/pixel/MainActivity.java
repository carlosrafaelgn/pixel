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

import android.Manifest;
import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Message;
import android.text.InputType;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.view.Display;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends Activity implements SensorEventListener {

	// We cannot use the traditional way of loading content,
	// like making webView load file:///android_asset/index.html,
	// because wasm files must not be loaded from file://... or at
	// least WebView does not like it... :(
	private static final String FAKE_URL_PREFIX = "https://carlosrafaelgn.github.io/pixel/";
	private static final String FAKE_URL = FAKE_URL_PREFIX + "index.html";
	private static final byte[] FAVICON = {
		(byte)0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x08, 0x04, 0x00, 0x00, 0x00, (byte)0xb5, (byte)0xfa, 0x37,
		(byte)0xea, 0x00, 0x00, 0x00, 0x0e, 0x49, 0x44, 0x41, 0x54, 0x28, 0x53, 0x63, 0x60, 0x18, 0x05, (byte)0xa3,
		0x00, 0x01, 0x00, 0x02, 0x10, 0x00, 0x01, (byte)0x9a, 0x15, (byte)0xfa, (byte)0xa4, 0x00, 0x00, 0x00, 0x00, 0x49,
		0x45, 0x4e, 0x44, (byte)0xae, 0x42, 0x60, (byte)0x82
	};

	// Must be in sync with scripts/level/levelCache.ts
	private static final int DOWNLOAD_LEVEL_SUCCESS = 1;
	private static final int DOWNLOAD_LEVEL_ERROR = 0;
	private static final int DOWNLOAD_LEVEL_NO_PERMISSION = -1;
	private static final int DOWNLOAD_LEVEL_FILE_ALREADY_EXISTS = -2;

	private static final int FILE_CALLBACK_REQUEST_CODE = 0x0100;
	private static final int DOWNLOAD_REQUEST_CODE = 0x0101;

	// https://developer.android.com/guide/webapps/webview

	private final class LibWebViewJavaScriptInterface implements Runnable {
		private volatile boolean keepScreenOn;

		final boolean supported;
		final String browserLanguage;

		float x, y;

		LibWebViewJavaScriptInterface(boolean supported, String browserLanguage) {
			this.supported = supported;
			this.browserLanguage = browserLanguage;
		}

		public void run() {
			try {
				webView.setKeepScreenOn(keepScreenOn);
			} catch (Throwable th) {
				th.printStackTrace();
			}
		}

		@JavascriptInterface
		public boolean isSupported() {
			return supported;
		}

		@JavascriptInterface
		public String getBrowserLanguage() {
			return browserLanguage;
		}

		@JavascriptInterface
		public float getX() {
			return x;
		}

		@JavascriptInterface
		public float getY() {
			return y;
		}

		@JavascriptInterface
		public void setKeepScreenOn(boolean keepScreenOn) {
			this.keepScreenOn = keepScreenOn;
			handler.post(this);
		}

		@JavascriptInterface
		public int downloadLevel(String name, String json, String imageBase64) {
			// Unfortunately, DownloadManager does not support data URLs...

			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
				if (checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED ||
					checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
					requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE,Manifest.permission.WRITE_EXTERNAL_STORAGE}, DOWNLOAD_REQUEST_CODE);
					return DOWNLOAD_LEVEL_NO_PERMISSION;
				}
			}

			OutputStream outputStream = null;

			try {
				final File file = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), name);
				if (file.exists())
					return DOWNLOAD_LEVEL_FILE_ALREADY_EXISTS;

				outputStream = new FileOutputStream(file);
				outputStream.write((json != null) ? json.getBytes() : Base64.decode(imageBase64, Base64.DEFAULT));

				return DOWNLOAD_LEVEL_SUCCESS;
			} catch (Throwable th) {
				th.printStackTrace();
			} finally {
				if (outputStream != null) {
					try {
						outputStream.close();
					} catch (Throwable th) {
						// Just ignore...
					}
				}
			}

			return DOWNLOAD_LEVEL_ERROR;
		}

		@JavascriptInterface
		public void exit() {
			finish();
		}
	}

	private final class LibWebViewClient extends WebViewClient {
		private final AssetManager assets;

		LibWebViewClient(AssetManager assets) {
			this.assets = assets;
		}

		@Override
		public boolean shouldOverrideUrlLoading(WebView view, String url) {
			try {
				if (url.startsWith("http") && !url.startsWith(FAKE_URL_PREFIX)) {
					startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
					return true;
				}
			} catch (Throwable th) {
				// Just ignore...
			}
			return false;
		}

		@Override
		public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
			return shouldOverrideUrlLoading(null, request.getUrl().toString());
		}

		@Override
		@SuppressWarnings("deprecation")
		public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
			// This is requested way too many times!!!
			if (url.contains("favicon"))
				return new WebResourceResponse("image/png", "utf-8", new ByteArrayInputStream(FAVICON));

			if (url.startsWith(FAKE_URL_PREFIX)) {
				final String suffix = url.substring(FAKE_URL_PREFIX.length());

				InputStream inputStream = null;

				try {
					inputStream = assets.open(suffix);
				} catch (Throwable th) {
					th.printStackTrace();
				}

				if (inputStream == null)
					return null;

				final String mime = (url.endsWith(".png") ? "image/png" :
					(url.endsWith(".gif") ? "image/gif" :
						(url.endsWith(".woff2") ? "font/woff2" :
							(url.endsWith(".js") ? "text/javascript" :
								(url.endsWith(".html") ? "text/html" :
									(url.endsWith(".wasm") ? "application/wasm" :
										(url.endsWith(".ttf") ? "font/ttf" :
											((url.endsWith(".jpg") || url.endsWith(".jpeg")) ? "image/jpeg" : "application/octet-stream")
										)
									)
								)
							)
						)
					)
				);

				return new WebResourceResponse(mime, "utf-8", inputStream);
			}

			return super.shouldInterceptRequest(view, url);
		}

		@Override
		public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
			return shouldInterceptRequest(view, request.getUrl().toString());
		}
	}

	private final class LibWebChromeClient extends WebChromeClient {
		@Override
		public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
			return false;
		}

		@Override
		public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
			if (message == null || message.length() == 0)
				return false;
			final AlertDialog alertDialog = new AlertDialog.Builder(MainActivity.this)
				.setMessage(message)
				.setCancelable(true)
				.setPositiveButton(R.string.ok, null)
				.setTitle(R.string.app_name_short)
				.create();
			alertDialog.setCanceledOnTouchOutside(false);
			alertDialog.setOnDismissListener(new DialogInterface.OnDismissListener() {
				@Override
				public void onDismiss(DialogInterface dialog) {
					result.confirm();
				}
			});
			alertDialog.show();
			return true;
		}

		@Override
		public boolean onJsBeforeUnload(WebView view, String url, String message, final JsResult result) {
			final boolean[] ok = new boolean[1];
			final AlertDialog alertDialog = new AlertDialog.Builder(MainActivity.this)
				.setMessage(R.string.confirm_quit)
				.setCancelable(true)
				.setPositiveButton(R.string.ok, new DialogInterface.OnClickListener() {
					@Override
					public void onClick(DialogInterface dialog, int which) {
						ok[0] = true;
						result.confirm();
					}
				})
				.setNegativeButton(R.string.cancel, null)
				.setTitle(R.string.app_name_short)
				.create();
			alertDialog.setCanceledOnTouchOutside(false);
			alertDialog.setOnDismissListener(new DialogInterface.OnDismissListener() {
				@Override
				public void onDismiss(DialogInterface dialog) {
					if (!ok[0])
						result.cancel();
				}
			});
			alertDialog.show();
			return true;
		}

		@Override
		public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
			if (message == null || message.length() == 0)
				return false;
			final boolean[] ok = new boolean[1];
			final AlertDialog alertDialog = new AlertDialog.Builder(MainActivity.this)
				.setMessage(message)
				.setCancelable(true)
				.setPositiveButton(R.string.ok, new DialogInterface.OnClickListener() {
					@Override
					public void onClick(DialogInterface dialog, int which) {
						ok[0] = true;
						result.confirm();
					}
				})
				.setNegativeButton(R.string.cancel, null)
				.setTitle(R.string.app_name_short)
				.create();
			alertDialog.setCanceledOnTouchOutside(false);
			alertDialog.setOnDismissListener(new DialogInterface.OnDismissListener() {
				@Override
				public void onDismiss(DialogInterface dialog) {
					if (!ok[0])
						result.cancel();
				}
			});
			alertDialog.show();
			return true;
		}

		@Override
		public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, final JsPromptResult result) {
			LinearLayout linearLayout = new LinearLayout(MainActivity.this);
			linearLayout.setOrientation(LinearLayout.VERTICAL);

			final int padding = dpToPxI(16);
			linearLayout.setPadding(padding, padding, padding, padding);

			if (message != null && message.length() > 0) {
				final TextView lbl = new TextView(MainActivity.this);
				lbl.setText(message);
				final LinearLayout.LayoutParams layoutParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
				layoutParams.bottomMargin = padding >> 1;
				linearLayout.addView(lbl, layoutParams);
			}

			final EditText txt = new EditText(MainActivity.this);
			txt.setMaxLines(1);
			txt.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
			if (defaultValue != null && defaultValue.length() > 0)
				txt.setText(defaultValue);
			linearLayout.addView(txt, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

			final boolean[] ok = new boolean[1];
			final AlertDialog alertDialog = new AlertDialog.Builder(MainActivity.this)
				.setView(linearLayout)
				.setCancelable(true)
				.setPositiveButton(R.string.ok, new DialogInterface.OnClickListener() {
					@Override
					public void onClick(DialogInterface dialog, int which) {
						ok[0] = true;
						result.confirm(txt.getText().toString());
					}
				})
				.setNegativeButton(R.string.cancel, null)
				.setTitle(R.string.app_name_short)
				.create();
			alertDialog.setCanceledOnTouchOutside(false);
			alertDialog.setOnDismissListener(new DialogInterface.OnDismissListener() {
				@Override
				public void onDismiss(DialogInterface dialog) {
					if (!ok[0])
						result.cancel();
				}
			});
			alertDialog.setOnShowListener(new DialogInterface.OnShowListener() {
				@Override
				public void onShow(DialogInterface dialog) {
					txt.requestFocus();
					txt.selectAll();
				}
			});
			alertDialog.show();
			return true;
		}

		@Override
		public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
			if (filePathCallback == null)
				return false;

			if (fileChooserParams == null) {
				filePathCallback.onReceiveValue(null);
			} else {
				MainActivity.this.filePathCallback = filePathCallback;
				final String[] types = fileChooserParams.getAcceptTypes();
				final Intent intent = new Intent()
					.setType((types == null || types.length == 0 || types[0] == null) ? "*/*" : types[0])
					.setAction(Intent.ACTION_GET_CONTENT);
				Intent chooserIntent = null;
				try {
					chooserIntent = Intent.createChooser(intent, getText(R.string.select_file));
				} catch (Throwable th) {
					// Just ignore...
				}
				try {
					startActivityForResult(chooserIntent != null ? chooserIntent : intent, FILE_CALLBACK_REQUEST_CODE);
				} catch (Throwable th) {
					MainActivity.this.filePathCallback = null;
					filePathCallback.onReceiveValue(null);
				}
			}
			return true;
		}

		@Override
		public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
			System.out.println(consoleMessage.sourceId() + ": " + consoleMessage.lineNumber() + " - " + consoleMessage.message());
			return true;
		}

		@Override
		public void onGeolocationPermissionsHidePrompt() {
		}

		@Override
		public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
			callback.invoke(origin, true, true);
		}

		@Override
		@TargetApi(Build.VERSION_CODES.LOLLIPOP)
		public void onPermissionRequest(PermissionRequest request) {
			try {
				request.grant(request.getResources());
			} catch (Throwable th) {
				// Just ignore...
			}
		}

		@Override
		public void onPermissionRequestCanceled(PermissionRequest request) {
		}
	}

	private float density;

	private SensorManager sensorManager;
	private Sensor sensor;
	private SystemUIObserver systemUIObserver;
	private ValueCallback<Uri[]> filePathCallback;

	private Handler handler;
	private WebView webView;
	private LibWebViewJavaScriptInterface webViewJavaScriptInterface;

	@SuppressWarnings("SameParameterValue")
	private int dpToPxI(float dp) {
		return (int)((dp * density) + 0.5f);
	}

	private boolean prepareSensor() {
		boolean supported = false;
		try {
			sensorManager = (SensorManager)getSystemService(SENSOR_SERVICE);
			if (sensorManager != null) {
				sensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
				if (sensor != null) {
					sensorManager.registerListener(this, sensor, 50000);
					supported = true;
				}
			}
		} catch (Throwable th) {
			th.printStackTrace();
		}
		return supported;
	}

	private void cleanupSensor() {
		if (sensorManager != null) {
			sensorManager.unregisterListener(this);
			sensorManager = null;
		}

		sensor = null;
	}

	@Override
	@SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		handler = new Handler();

		final WindowManager windowManager = (WindowManager)getSystemService(Context.WINDOW_SERVICE);
		if (windowManager != null) {
			final Display display = windowManager.getDefaultDisplay();
			final DisplayMetrics displayMetrics = new DisplayMetrics();
			display.getMetrics(displayMetrics);
			density = displayMetrics.density;
		} else {
			density = 1.0f;
		}

		webView = new WebView(this);
		webView.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
		webView.setWebViewClient(new LibWebViewClient(getAssets()));
		webView.setWebChromeClient(new LibWebChromeClient());
		webView.addJavascriptInterface(webViewJavaScriptInterface = new LibWebViewJavaScriptInterface(prepareSensor(), getString(R.string.browser_language)), "androidWrapper");
		webView.setHorizontalScrollBarEnabled(false);
		final WebSettings settings = webView.getSettings();
		settings.setAllowContentAccess(true);
		settings.setAllowFileAccess(true);
		settings.setAllowFileAccessFromFileURLs(true);
		settings.setAllowUniversalAccessFromFileURLs(true);
		settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
		settings.setSupportMultipleWindows(false);
		settings.setSupportZoom(false);
		settings.setUseWideViewPort(true);
		settings.setLoadWithOverviewMode(true);
		settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.NORMAL);
		settings.setLoadWithOverviewMode(true);
		settings.setDisplayZoomControls(false);
		settings.setBuiltInZoomControls(false);
		settings.setMediaPlaybackRequiresUserGesture(false);
		settings.setJavaScriptEnabled(true);
		settings.setJavaScriptCanOpenWindowsAutomatically(false);
		settings.setLoadsImagesAutomatically(true);
		settings.setDomStorageEnabled(true);
		settings.setDatabaseEnabled(true);
		settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

		final Window window = getWindow();
		final int colorPrimary = getResources().getColor(R.color.colorPrimary);
		window.setNavigationBarColor(colorPrimary);
		window.setStatusBarColor(colorPrimary);
		webView.setBackgroundColor(colorPrimary);

		systemUIObserver = new SystemUIObserver(window.getDecorView(), true);

		setContentView(webView);

		webView.loadUrl(FAKE_URL);
	}

	@Override
	protected void onStart() {
		super.onStart();

		if (sensor == null)
			prepareSensor();

		if (systemUIObserver != null)
			systemUIObserver.hide();
	}

	@Override
	protected void onStop() {
		super.onStop();

		cleanupSensor();
	}

	@Override
	protected void onDestroy() {
		super.onDestroy();

		if (systemUIObserver != null) {
			systemUIObserver.destroy();
			systemUIObserver = null;
		}
	}

	@Override
	public void onBackPressed() {
		if (webView.canGoBack())
			webView.goBack();
		else
			super.onBackPressed();
	}

	@Override
	public void onWindowFocusChanged(boolean hasFocus) {
		if (systemUIObserver != null)
			systemUIObserver.onWindowFocusChanged(hasFocus);

		super.onWindowFocusChanged(hasFocus);
	}

	@Override
	protected void onActivityResult(int requestCode, int resultCode, Intent data) {
		super.onActivityResult(requestCode, resultCode, data);

		if (requestCode == FILE_CALLBACK_REQUEST_CODE) {
			final ValueCallback<Uri[]> filePathCallback = this.filePathCallback;
			this.filePathCallback = null;
			if (filePathCallback != null) {
				final Uri uri;
				filePathCallback.onReceiveValue((resultCode != RESULT_OK || data == null || (uri = data.getData()) == null) ? null : new Uri[] { uri });
			}
		}
	}

	@Override
	public void onSensorChanged(SensorEvent event) {
		if (webViewJavaScriptInterface != null) {
			webViewJavaScriptInterface.x = event.values[0];
			webViewJavaScriptInterface.y = event.values[1];
		}
	}

	@Override
	public void onAccuracyChanged(Sensor sensor, int accuracy) {
	}
}
