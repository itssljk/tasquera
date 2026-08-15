# Tasquera

A calm, focused task manager built to help you organize your work without the noise.

## Features

- **Local-first**: All tasks, lists, and settings live in your browser's `localStorage`. No accounts, no servers, no tracking.
- **Views**: Inbox, Today, Upcoming, Calendar, Kanban Boards, Completed, and Archive.
- **Boards and lists**: Kanban boards with drag-and-drop columns, or clean task lists.
- **Task details**: Subtasks with progress tracking, notes, links, image attachments, priorities, and due dates.
- **Search**: Full-text search across task titles, notes, subtasks, links, and lists (`Ctrl/Cmd+K`).
- **Keyboard shortcuts**: Quick-add with `/`, save with `Enter`, undo with `Ctrl/Cmd+Z`, and drag to reorder.
- **Backup and restore**: Export or import your data as JSON anytime in Settings.
- **Local folder sync**: Bind a Syncthing folder and Tasquera writes a `tasquera-sync.json` file it keeps in sync across devices — including deletions.

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
sync writes to `Documents/Tsqsync/tasquera-sync.json` (app-created files only;
point your Syncthing Android app at that folder). Note: on Android the sync file
lives in the app's scoped storage, which Syncthing may not be able to read
directly depending on its own file-access settings.

### Release signing

Release builds are signed with the keystore at `android/tasquera-release.keystore`
(credentials in `android/keystore.properties`). Both files are gitignored — never
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

## Tech Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev) + [Tailwind CSS v4](https://tailwindcss.com)
- [Framer Motion](https://motion.dev)
- [Figtree](https://github.com/erikdkennedy/figtree) & [Instrument Serif](https://github.com/Instrument/instrument-serif) (both SIL OFL 1.1)

## Data & Privacy

All data is stored locally on your device — in your browser's `localStorage` (key `tasquera.state.v2`) on the web, or in the app's private storage on Android. Clearing browser storage or uninstalling the app removes your data, so export a backup from Settings first. Image attachments are stored in IndexedDB (referenced by id from your tasks) so they don't count against the localStorage quota, and they're included in backups and in the sync folder's JSON file. No accounts, no servers, no tracking.

## License

MIT: see [LICENSE](LICENSE). Bundled third-party software and fonts are attributed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

