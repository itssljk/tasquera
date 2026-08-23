package com.itssljk.tasquera;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Self-update support for the sideloaded APK (no Play Store).
 *
 * The web layer requests the {@code update.json} manifest from GitHub
 * Releases via this plugin (to bypass WebView CORS), compares its
 * {@code versionCode} against the installed build, and drives this plugin
 * to download the new APK (verifying its SHA-256), then hand off to the system
 * package installer. Android still requires the user to confirm the install;
 * fully silent self-updates are not allowed.
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private static final String DEFAULT_UPDATE_URL = "https://github.com/itssljk/tasquera/releases/latest/download/update.json";
    private static final String PROGRESS_EVENT = "updateProgress";

    /** Installed app version, read from the package manager. */
    @PluginMethod
    public void getInfo(PluginCall call) {
        try {
            PackageInfo info = getContext().getPackageManager()
                    .getPackageInfo(getContext().getPackageName(), 0);
            JSObject result = new JSObject();
            result.put("versionName", info.versionName);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                result.put("versionCode", info.getLongVersionCode());
            } else {
                result.put("versionCode", info.versionCode);
            }
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to read installed app version", e);
        }
    }

    /** Returns the configured update manifest URL. */
    @PluginMethod
    public void getUpdateUrl(PluginCall call) {
        String url = getConfig().getString("updateUrl", DEFAULT_UPDATE_URL);
        JSObject result = new JSObject();
        result.put("url", url);
        call.resolve(result);
    }

    /**
     * Fetches the update manifest JSON via native HTTP, avoiding WebView CORS restrictions.
     */
    @PluginMethod
    public void fetchManifest(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            url = getConfig().getString("updateUrl", DEFAULT_UPDATE_URL);
        }
        final String targetUrl = url;

        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                conn = openConnectionWithRedirects(targetUrl, "application/json");
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) {
                    call.reject("Update check failed (HTTP " + code + ")");
                    return;
                }

                InputStream in = conn.getInputStream();
                BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();
                in.close();

                JSONObject json = new JSONObject(sb.toString());
                JSObject result = JSObject.fromJSONObject(json);
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Update check failed: " + e.getMessage(), e);
            } finally {
                if (conn != null) conn.disconnect();
            }
        }, "tasquera-update-manifest").start();
    }

    /** Whether "install unknown apps" is allowed for this package (API 26+). */
    @PluginMethod
    public void checkInstallPermission(PluginCall call) {
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            result.put("granted", getContext().getPackageManager().canRequestPackageInstalls());
        } else {
            result.put("granted", true);
        }
        call.resolve(result);
    }

    /** Opens the system "install unknown apps" settings screen for this package. */
    @PluginMethod
    public void openInstallPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.resolve();
            return;
        }
        if (getActivity() == null) {
            call.reject("No activity available to open install settings");
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception directError) {
            try {
                Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                fallback.setData(Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(fallback);
                call.resolve();
            } catch (Exception fallbackError) {
                call.reject("Unable to open install permission settings", fallbackError);
            }
        }
    }

    /**
     * Streams the APK to the app cache, optionally verifying its SHA-256, and
     * reports progress through the {@code updateProgress} event. Resolves with
     * the absolute path of the downloaded file.
     */
    @PluginMethod
    public void download(final PluginCall call) {
        final String url = call.getString("url");
        final String sha256 = call.getString("sha256", null);
        if (url == null || url.isEmpty()) {
            call.reject("A download url is required");
            return;
        }
        call.setKeepAlive(true);

        new Thread(() -> {
            try {
                File apk = downloadToCache(url, sha256);
                JSObject result = new JSObject();
                result.put("path", apk.getAbsolutePath());
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Download failed: " + e.getMessage(), e);
            }
        }, "tasquera-update-download").start();
    }

    /** Hands the downloaded APK to the system installer via the FileProvider. */
    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("An apk path is required");
            return;
        }
        File apk = new File(path);
        if (!apk.exists()) {
            call.reject("APK file no longer exists");
            return;
        }
        if (getActivity() == null) {
            call.reject("No activity available to install");
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apk
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Unable to launch the installer", e);
        }
    }

    private HttpURLConnection openConnectionWithRedirects(String initialUrl, String acceptHeader) throws IOException {
        String currentUrl = initialUrl;
        int redirects = 0;
        final int MAX_REDIRECTS = 7;

        while (redirects < MAX_REDIRECTS) {
            URL url = new URL(currentUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(20000);
            conn.setReadTimeout(60000);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "Tasquera-Android");
            if (acceptHeader != null && !acceptHeader.isEmpty()) {
                conn.setRequestProperty("Accept", acceptHeader);
            }
            conn.connect();

            int code = conn.getResponseCode();
            if (code == HttpURLConnection.HTTP_MOVED_PERM ||
                code == HttpURLConnection.HTTP_MOVED_TEMP ||
                code == HttpURLConnection.HTTP_SEE_OTHER ||
                code == 307 || code == 308) {

                String location = conn.getHeaderField("Location");
                conn.disconnect();
                if (location == null || location.isEmpty()) {
                    throw new IOException("Redirect status " + code + " without Location header");
                }
                URL base = new URL(currentUrl);
                URL target = new URL(base, location);
                currentUrl = target.toExternalForm();
                redirects++;
                continue;
            }

            return conn;
        }

        throw new IOException("Too many redirects attempting to connect to " + initialUrl);
    }

    private File downloadToCache(String url, String expectedSha256) throws Exception {
        File dir = new File(getContext().getCacheDir(), "updates");
        if (!dir.exists() && !dir.mkdirs()) {
            throw new IOException("Could not create update directory");
        }
        File out = new File(dir, "app-release.apk");
        if (out.exists() && !out.delete()) {
            throw new IOException("Could not remove previous download");
        }

        HttpURLConnection conn = null;
        try {
            conn = openConnectionWithRedirects(url, "application/octet-stream");

            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) {
                throw new IOException("Server responded with HTTP " + code);
            }

            long total = conn.getContentLengthLong();
            InputStream in = conn.getInputStream();
            FileOutputStream fos = new FileOutputStream(out);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] buffer = new byte[64 * 1024];
            long received = 0;
            long lastEmit = 0;
            int read;
            while ((read = in.read(buffer)) != -1) {
                fos.write(buffer, 0, read);
                digest.update(buffer, 0, read);
                received += read;
                long now = System.currentTimeMillis();
                if (now - lastEmit >= 200) {
                    lastEmit = now;
                    emitProgress(received, total);
                }
            }
            fos.flush();
            fos.close();
            in.close();

            String actual = bytesToHex(digest.digest());
            if (expectedSha256 != null && !expectedSha256.isEmpty()) {
                String normalized = expectedSha256.toLowerCase().replaceAll("[^0-9a-f]", "");
                if (!actual.equalsIgnoreCase(normalized)) {
                    out.delete();
                    throw new IOException("Downloaded APK failed its SHA-256 checksum check");
                }
            }

            emitProgress(total > 0 ? total : received, total);
            return out;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private void emitProgress(long received, long total) {
        final JSObject data = new JSObject();
        data.put("received", received);
        data.put("total", total);
        if (total > 0) {
            data.put("percent", Math.min(100.0, (double) received / (double) total * 100.0));
        }
        new Handler(Looper.getMainLooper()).post(() -> notifyListeners(PROGRESS_EVENT, data));
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            int v = b & 0xff;
            sb.append(Character.forDigit(v >> 4, 16)).append(Character.forDigit(v & 0xf, 16));
        }
        return sb.toString();
    }
}
