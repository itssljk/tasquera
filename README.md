# Tasquera

A calm, focused task manager built to help you organize your work without the noise.

## Features

- **Local-first**: All tasks, lists, and settings live in your browser's `localStorage`. No accounts, no servers, no tracking.
- **Views**: Inbox, Today, Upcoming, Calendar, Kanban Boards, Completed, and Archive.
- **Boards and lists**: Kanban boards with drag-and-drop columns, or clean task lists.
- **Task details**: Subtasks with progress tracking, notes, links, image attachments, priorities, and due dates.
- **Keyboard shortcuts**: Quick-add with `/`, save with `Enter`, undo with `Ctrl/Cmd+Z`, and drag to reorder.
- **Backup and restore**: Export or import your data as JSON anytime in Settings.

## Getting Started

```bash
npm install
npm run dev        # start the dev server
npm run build      # type-check + production build to dist/
npm run typecheck  # TypeScript check
```

Requires Node 20+ and npm.

## Tech Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev) + [Tailwind CSS v4](https://tailwindcss.com)
- [Framer Motion](https://motion.dev)
- [Figtree](https://github.com/erikdkennedy/figtree) & [Instrument Serif](https://github.com/Instrument/instrument-serif) (both SIL OFL 1.1)

## Data & Privacy

All data is stored locally in your browser (`localStorage` key `tasquera.state.v2`). Clearing browser storage removes your data, so export a backup from Settings first. Image attachments are stored as base64 data URLs, so uploading many large images can use up browser storage quota.

## License

MIT: see [LICENSE](LICENSE). Bundled third-party software and fonts are attributed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

