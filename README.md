# Tasquera

A calm, focused task manager built to help you organize your work without the noise.

## Features

- **Local-first**: All tasks, lists, and settings live on your device. No accounts, no cloud servers, and no tracking.
- **Views**: Inbox, Today, Upcoming, Calendar, Kanban Boards, and Completed.
- **Boards & Lists**: Flexible Kanban boards with drag-and-drop columns, or clean, distraction-free task lists.
- **Task Details**: Subtasks with progress tracking, rich notes, links, priorities, and due dates.
- **Reminders & Notifications**: Scheduled due-date alerts across desktop and mobile.
- **Quick Search**: Fast full-text search across task titles, notes, subtasks, and lists (`Ctrl/Cmd + K`).
- **Keyboard-first**: Streamlined shortcuts for rapid task entry, navigation, and reordering.
- **Backup & Portability**: Export and import your complete dataset as JSON anytime.
- **Multi-device Sync**: Peer-to-peer folder synchronization support (e.g. via Syncthing) with automatic conflict resolution.

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run test suite
npm run test

# Type-check and production build
npm run build
```

## Platform Support

- **Web / PWA**: Installable as a standalone Progressive Web App directly from your browser.
- **Android**: Built with Capacitor, supporting OS-level notifications and local background storage sync.

## Tech Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev) + [Tailwind CSS v4](https://tailwindcss.com)
- [Capacitor](https://capacitorjs.com)
- [Framer Motion](https://motion.dev)
- [Figtree](https://github.com/erikdkennedy/figtree) font

## Data & Privacy

All data is stored strictly on your local device — using your browser's local storage on the web or isolated app storage on Android. Your data is entirely yours; no external servers, analytics, or telemetry are used.

## License

[MIT](LICENSE) — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for bundled open-source licenses and attribution.

