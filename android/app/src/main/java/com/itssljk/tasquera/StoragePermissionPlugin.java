package com.itssljk.tasquera;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridges Android's "All files access" (MANAGE_EXTERNAL_STORAGE) permission to the web layer.
 *
 * The Capacitor Filesystem plugin maps Directory.Documents to a direct path under
 * /storage/emulated/0/Documents, which on Android 11+ (API 30+) is only writable when the
 * app holds MANAGE_EXTERNAL_STORAGE. That permission cannot be requested through the normal
 * runtime-permission dialog, so we expose a check plus a shortcut to the system settings screen.
 */
@CapacitorPlugin(name = "StoragePermission")
public class StoragePermissionPlugin extends Plugin {

    @PluginMethod
    public void check(PluginCall call) {
        JSObject result = new JSObject();
        result.put("sdkInt", Build.VERSION.SDK_INT);
        result.put("allFilesAccessGranted", hasAllFilesAccess());
        call.resolve(result);
    }

    @PluginMethod
    public void requestAllFilesAccess(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            // Below Android 11 the legacy WRITE_EXTERNAL_STORAGE runtime permission is used,
            // which is handled by the Capacitor Filesystem plugin from the web layer.
            call.resolve();
            return;
        }

        if (getActivity() == null) {
            call.reject("No activity available to open settings");
            return;
        }

        Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception directError) {
            // Some devices/vendors don't support the direct intent; fall back to app details.
            try {
                Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                fallback.setData(Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(fallback);
                call.resolve();
            } catch (Exception fallbackError) {
                call.reject("Unable to open storage permission settings", fallbackError);
            }
        }
    }

    private boolean hasAllFilesAccess() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return Environment.isExternalStorageManager();
        }
        return true;
    }
}
