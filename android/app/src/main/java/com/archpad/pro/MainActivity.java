package com.archpad.pro;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "ArchPadNative";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Programmatically verify bundled local assets exist inside APK
        verifyLocalAssets();

        // Apply native dark drafting workstation chrome matching #0a0a0f
        configureNativeWindow();

        // Optimize WebView rendering for hardware-accelerated CAD drafting
        configureDraftingWebView();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        applyShortcutIntent(intent);
    }

    @Override
    public void onStart() {
        super.onStart();
        applyShortcutIntent(getIntent());
    }

    private void verifyLocalAssets() {
        try (InputStream is = getAssets().open("public/index.html")) {
            if (is.available() > 0) {
                Log.i(TAG, "Verified bundled local drafting core assets.");
            }
        } catch (IOException e) {
            Log.e(TAG, "Local asset verification warning", e);
        }
    }

    private void configureNativeWindow() {
        try {
            Window window = getWindow();
            if (window != null) {
                int darkBg = Color.parseColor("#0a0a0f");
                window.setStatusBarColor(darkBg);
                window.setNavigationBarColor(darkBg);
            }
        } catch (Exception e) {
            Log.w(TAG, "Unable to apply system bar colors", e);
        }
    }

    private void configureDraftingWebView() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.setBackgroundColor(Color.parseColor("#0a0a0f"));
                WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                settings.setAllowFileAccess(true);
                settings.setSupportZoom(false);
                settings.setBuiltInZoomControls(false);
            }
        } catch (Exception e) {
            Log.w(TAG, "WebView configuration notice", e);
        }
    }

    private void applyShortcutIntent(Intent intent) {
        if (intent == null || getBridge() == null || getBridge().getWebView() == null) return;
        String tool = intent.getStringExtra("shortcut_tool");
        String action = intent.getStringExtra("shortcut_action");
        if ((tool != null && !tool.isEmpty()) || (action != null && !action.isEmpty())) {
            String safeTool = tool != null ? tool.replaceAll("[^a-z]", "") : "";
            String safeAction = action != null ? action.replaceAll("[^a-z]", "") : "";
            final String js = "window.__ARCHPAD_SHORTCUT__ = { tool: '" + safeTool + "', action: '" + safeAction + "' };"
                + "window.dispatchEvent(new CustomEvent('archpad-shortcut', { detail: window.__ARCHPAD_SHORTCUT__ }));";
            getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(js, null));
        }
    }
}
