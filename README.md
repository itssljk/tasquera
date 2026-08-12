# Tasquera

A calm, focused to-do app — tasks, without the noise.

Tasquera is a local-first, keyboard-friendly task manager built to rival
Google Tasks while staying out of your way: Inbox, Today, Upcoming, a
calendar, kanban boards, lists, subtasks, priorities, deadlines, and notes —
in a quiet warm-dark interface that never shouts.

## Highlights

- **100% local-first.** Every task, list, and setting lives in your browser's
  `localStorage`. No accounts, no servers, no tracking.
- **Smart views** — Inbox, Today, Upcoming, Calendar, Completed, Archive.
- **Boards & lists** — kanban boards with drag-and-drop columns, or simple lists.
- **Rich tasks** — subtasks with progress, notes, links, image attachments,
  priorities, due dates, and deadlines.
- **Fast by default** — `/` focuses quick-add, `Enter` adds, `Ctrl/Cmd+Z`
  undoes, drag to reorder.
- **Backup & restore** — export/import your data as JSON from Settings.

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm run build      # type-check + production build to dist/
npm run typecheck  # TypeScript only
```

Requires Node 20+ and npm.

## Tech stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev) + [Tailwind CSS v4](https://tailwindcss.com)
- [Framer Motion](https://motion.dev) for motion
- [Figtree](https://github.com/erikdkennedy/figtree) & [Instrument Serif](https://github.com/Instrument/instrument-serif) (both SIL OFL 1.1)

## Design

The visual direction is documented in [`DESIGN.md`](DESIGN.md). The
anti-slop design guidelines the project follows live in
[`DESIGN-GUIDE.md`](DESIGN-GUIDE.md).

## Data & privacy

All data is stored locally in your browser via `localStorage` under the key
`tasquera.state.v2` (legacy `tasquera.tasks.v1` data is migrated on first
load). Clearing browser storage removes your data — export a backup from
Settings first. Note that image attachments are stored as base64 data URLs, so
large image libraries can exceed the browser's storage quota.

## License

MIT — see [`LICENSE`](LICENSE). Bundled third-party software and fonts are
attributed in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
