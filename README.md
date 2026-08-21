# Tasquera

A calm, focused task manager built to help you organize your work without the noise.

## Features

- **Local-first**: All tasks, lists, and settings live in your browser's `localStorage`. No accounts, no servers, no tracking.
- **Views**: Inbox, Today, Upcoming, Calendar, Kanban Boards, and Completed.
- **Boards and lists**: Kanban boards with drag-and-drop columns, or clean task lists.
- **Task details**: Subtasks with progress tracking, notes, links, priorities, and due dates.
- **Reminders**: Due-date notifications. On Android they arrive as real OS notifications even when the app is closed; in the browser/PWA they appear while Tasquera is open (browsers can't schedule background notifications without a push server). Enable them in Settings → Notifications.
- **Search**: Full-text search across task titles, notes, subtasks, links, and lists (`Ctrl/Cmd+K`).
- **Keyboard shortcuts**: Quick-add with `/`, save with `Enter`, undo with `Ctrl/Cmd+Z`, and drag to reorder.
- **Backup and restore**: Export or import your data as JSON anytime in Settings.
- **Local folder sync**: Bind a Syncthing folder and Tasquera writes a `tasquera-sync.json` file it keeps in sync across devices, including deletions.

## Getting Started

```bash
npm install
npm run dev        # start the dev server
npm run build      # type-check + production build to dist/
npm run typecheck  # TypeScript check
```

Requires Node 20+ and npm.

## Android App

Tasquera ships as an Android app built with [Capacitor](https://capacitorjs.com).

```bash
npm run build:apk   # builds web assets, syncs Capacitor, compiles a signed release APK
```

The generated APK lands at `android/app/build/outputs/apk/release/app-release.apk`, signed with your release keystore. On
Android, task data lives in the app's private storage, and the optional folder
sync writes to `Documents/Tsqsync/tasquera-sync.json`.

#### Syncthing between laptop and phone

Both ends bind the same Syncthing folder, and Tasquera keeps a single
`tasquera-sync.json` in each. The folder **root must contain the file** on both
devices, so pick the folder (not a parent of it) on each side:

1. **Laptop (PWA in Chrome or Edge):** Settings → *Syncthing & Local Sync* →
   *Select Folder*, and create/pick a folder such as `~/Tsqsync`. Tasquera
   writes `tasquera-sync.json` at its root.
2. **Laptop Syncthing:** add a folder (e.g. ID `tsqsync`) pointing at that
   folder, type *Send & Receive*. Note your device ID (Actions → Show ID).
3. **Phone (Android app):** Settings → *Device Storage & Sync* → *Enable Sync*
   and grant **All files access** when prompted. This writes
   `Documents/Tsqsync/tasquera-sync.json`.
4. **Phone Syncthing:** add your laptop as a device (paste its device ID), then
   add a folder with the **same folder ID** (`tsqsync`) pointing at
   `/storage/emulated/0/Documents/Tsqsync`, type *Send & Receive*. Syncthing on
   Android also needs **All files access** to reach that path.
5. Keep both devices on the same Wi-Fi; Syncthing discovers peers on the LAN
   automatically and both apps re-scan every few seconds.

Notes: on Android 11+ both Tasquera and Syncthing need *All files access*;
whichever side is offline misses writes until it reconnects, and if both edit
while disconnected Syncthing drops a `.sync-conflict-*.json` copy. Tasquera
automatically detects those copies, merges the edits from every device into the
main state, deletes the duplicates, and shows a short note in Settings when it
resolves one.

### Release signing

Release builds are signed with the keystore at `android/tasquera-release.keystore`
(credentials in `android/keystore.properties`). Both files are gitignored; never
commit them. To create the keystore on a fresh machine:

```bash
keytool -genkeypair -v -keystore android/tasquera-release.keystore \
  -alias tasquera -keyalg RSA -keysize 2048 -validity 10000
```

Then write `android/keystore.properties`:

```
storeFile=tasquera-release.keystore
storePassword=YOUR_PASSWORD
keyAlias=tasquera
keyPassword=YOUR_PASSWORD
```

**Back up both files.** Losing the keystore means existing installs can never be
updated with the same signature, and `build:apk` will fail with instructions if
they are missing.

### Self-updates

The Android app checks GitHub Releases for a newer version and can download and install it in place, so sideloaded installs stay current without the Play Store.

- On launch (at most once a day) and from Settings → Updates, the app fetches `update.json` from the latest release, compares `versionCode`, and prompts when a newer build exists.
- The APK is downloaded with its SHA-256 verified against the manifest, then handed to the system installer. Android always asks you to confirm the final install.
- Tapping **Later** records that version so it isn't re-prompted automatically; you can still install it from Settings → Updates.

To ship an update:

1. Bump `version` in `package.json` (e.g. `1.0.0`). `build:apk` derives the Android `versionName` and `versionCode` from it.
2. Run `npm run build:apk`. It emits `android/app/build/outputs/apk/release/app-release.apk` **and** `update.json`.
3. Create a GitHub Release tagged `v1.0.0` and attach **both** files, keeping the exact filenames `app-release.apk` and `update.json`.
4. Installed apps pick it up on their next update check.

Notes:

- The update APK must be signed with the **same keystore** as the installed build, or Android will refuse the install.
- On Android 8+ the user must allow "Install unknown apps" for Tasquera the first time; the app links to that setting.
- `update.json` is served from `releases/latest/download/update.json`. The URL is configurable via `AppUpdate.updateUrl` in `capacitor.config.ts` if you'd rather self-host.

## Tech Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev) + [Tailwind CSS v4](https://tailwindcss.com)
- [Framer Motion](https://motion.dev)
- [Figtree](https://github.com/erikdkennedy/figtree) (SIL OFL 1.1)

## Data & Privacy
 
All data is stored locally on your device: in your browser's `localStorage` (key `tasquera.state.v2`) on the web, or in the app's private storage on Android. Clearing browser storage or uninstalling the app removes your data, so export a backup from Settings first. No accounts, no servers, no tracking.

## License

MIT: see [LICENSE](LICENSE). Bundled third-party software and fonts are attributed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
