import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const strokeProps: IconProps = {
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="8.5" fill="var(--color-pine-600)" />
      <path
        d="M8.2 14.6l3.6 3.6 7.8-8.2"
        fill="none"
        stroke="#FBF9F5"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3.8 8.4l3 3 5.4-5.6" />
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M10 4.2v11.6M4.2 10h11.6" />
    </svg>
  )
}

export function MinusIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M4.2 10h11.6" />
    </svg>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M3.5 5.5h13" />
      <path d="M5.5 5.5l.7 10.2a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4l.7-10.2" />
      <path d="M7.5 5.5V3.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
      <path d="M8.2 9v5.5M11.8 9v5.5" />
    </svg>
  )
}

export function ChevronIcon(props: IconProps) {
  return (
    <svg {...strokeProps} strokeWidth={2} {...props}>
      <path d="M8 6.8l4.4 3.2-4.4 3.2" />
    </svg>
  )
}

export function SidebarIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <rect x="3" y="3.5" width="14" height="13" rx="2" />
      <path d="M7.5 3.5v13" />
    </svg>
  )
}


export function EllipsisIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="4.5" cy="10" r="1.15" />
      <circle cx="10" cy="10" r="1.15" />
      <circle cx="15.5" cy="10" r="1.15" />
    </svg>
  )
}

export function EllipsisVerticalIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="10" cy="4.5" r="1.15" />
      <circle cx="10" cy="10" r="1.15" />
      <circle cx="10" cy="15.5" r="1.15" />
    </svg>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M13.5 4.5l2 2M4 16l3.5-.5L15.8 7.2a1.4 1.4 0 0 0 0-2l-1-1a1.4 1.4 0 0 0-2 0L4.5 12.5 4 16z" />
    </svg>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />
    </svg>
  )
}

export function InboxIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M4.5 4.5h11l2.5 5.5v5.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 15.5V10z" />
      <path d="M2 10h4.5l1.5 2.5h4L13.5 10H18" />
    </svg>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <circle cx="10" cy="10" r="3.3" />
      <path d="M10 2.8v1.7M10 15.5v1.7M2.8 10h1.7M15.5 10h1.7M5 5l1.2 1.2M13.8 13.8L15 15M15 5l-1.2 1.2M6.2 13.8L5 15" />
    </svg>
  )
}

export function UpcomingIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <rect x="3.5" y="4.5" width="13" height="12" rx="2" />
      <path d="M3.5 8.5h13M7 3v3M13 3v3" />
      <path d="M10 14.6v-3.8M8.4 12.6l1.6-1.6 1.6 1.6" />
    </svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <rect x="3.5" y="4" width="13" height="13" rx="2" />
      <path d="M3.5 8.5h13M7 2.5v3M13 2.5v3" />
      <path d="M7.5 12h.01M10 12h.01M12.5 12h.01M7.5 14.5h.01M10 14.5h.01" />
    </svg>
  )
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <circle cx="10" cy="10" r="6.7" />
      <path d="m7.1 10.2 2 2 3.9-4.1" />
    </svg>
  )
}

export function ArchiveIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <rect x="3" y="3.5" width="14" height="4" rx="1" />
      <path d="M4.5 7.5v7.5a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V7.5" />
      <path d="M8.5 11.5h3" />
    </svg>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function FlagIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M4.5 16.5v-12c1.5 0 2.5.8 4 .8s2.5-.8 4-.8 2.5.8 3.5.8v7.5c-1 0-2-.8-3.5-.8s-2.5.8-4 .8-2.5-.8-4-.8" />
    </svg>
  )
}

export function SubtaskIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M4 5h12M4 9.5h12M4 9.5v3.5a1.5 1.5 0 0 0 1.5 1.5h10.5" />
    </svg>
  )
}

export function LinkIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M8.5 11.5a4 4 0 0 0 5.66.4l2.34-2.34a4 4 0 0 0-5.66-5.66l-1.34 1.34" />
      <path d="M11.5 8.5a4 4 0 0 0-5.66-.4L3.5 10.44a4 4 0 0 0 5.66 5.66l1.34-1.34" />
    </svg>
  )
}

export function ImageIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <rect x="3.5" y="4.5" width="13" height="11" rx="2" />
      <circle cx="7.5" cy="8.5" r="1.2" />
      <path d="M16.5 12.5l-3.5-3.5-5.5 5.5" />
    </svg>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 6.5V10l2.5 1.5" />
    </svg>
  )
}

export function RepeatIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="m14 2.5 3.5 3-3.5 3" />
      <path d="M3 9.5V8a2.5 2.5 0 0 1 2.5-2.5h11.5" />
      <path d="m6 17.5-3.5-3 3.5-3" />
      <path d="M17 10.5V12a2.5 2.5 0 0 1-2.5 2.5H3" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  )
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M12.5 4.5h4v4M10 10l6.5-6.5M14.5 10.5v4a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 4.5 14.5v-7A1.5 1.5 0 0 1 6 6h4" />
    </svg>
  )
}

export function PaperclipIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M14.5 7.5l-6 6a2.5 2.5 0 0 1-3.5-3.5l6.5-6.5a4 4 0 0 1 5.7 5.7l-6.5 6.5a5.5 5.5 0 0 1-7.8-7.8l6-6" />
    </svg>
  )
}

export function NotesIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M4.5 3.5h7l4 4V16a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4.5 16V3.5z" />
      <path d="M11.5 3.5V7.5h4" />
      <path d="M7 11.5h6M7 14.5h4" />
    </svg>
  )
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M10 3s5.5 1.5 5.5 5.5c0 4.2-3.7 7-5.5 8-1.8-1-5.5-3.8-5.5-8C4.5 4.5 10 3 10 3z" />
      <path d="m7.5 9.5 1.8 1.8 3.5-3.5" />
    </svg>
  )
}

export function GripVerticalIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="7" cy="6" r="1.3" />
      <circle cx="13" cy="6" r="1.3" />
      <circle cx="7" cy="10" r="1.3" />
      <circle cx="13" cy="10" r="1.3" />
      <circle cx="7" cy="14" r="1.3" />
      <circle cx="13" cy="14" r="1.3" />
    </svg>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M10 3.5v9M6.5 9l3.5 3.5L13.5 9M4 16.5h12" />
    </svg>
  )
}

export function ShareIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M10 13V3.5M6.5 7L10 3.5 13.5 7M4 11v4.5a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V11" />
    </svg>
  )
}

export function PlusSquareIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <rect x="3.5" y="3.5" width="13" height="13" rx="2.5" />
      <path d="M10 7v6M7 10h6" />
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.5 13.5L17 17" />
    </svg>
  )
}

export function FolderSyncIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h3.2l1.6 1.8H15a1.5 1.5 0 0 1 1.5 1.5v6.2a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M12.5 10a2.2 2.2 0 1 0 1 2.2" strokeWidth={1.5} />
      <path d="M14.5 10h-2v2" strokeWidth={1.5} />
    </svg>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 9.2v4.3M10 6.5h.01" />
    </svg>
  )
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M10 3.2a4.3 4.3 0 0 0-4.3 4.3c0 3.2-1 4.3-1.6 5h11.8c-.6-.7-1.6-1.8-1.6-5A4.3 4.3 0 0 0 10 3.2z" />
      <path d="M8.4 15.5a1.8 1.8 0 0 0 3.2 0" />
    </svg>
  )
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <polygon points="10 2.8 12.4 7.6 17.6 8.4 13.8 12.1 14.7 17.2 10 14.8 5.3 17.2 6.2 12.1 2.4 8.4 7.6 7.6 10 2.8" />
    </svg>
  )
}

export function StarFilledIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <polygon points="10 2.8 12.4 7.6 17.6 8.4 13.8 12.1 14.7 17.2 10 14.8 5.3 17.2 6.2 12.1 2.4 8.4 7.6 7.6 10 2.8" />
    </svg>
  )
}

export function KanbanIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <rect x="3" y="4" width="3.2" height="12" rx="1" />
      <rect x="8.4" y="4" width="3.2" height="7.5" rx="1" />
      <rect x="13.8" y="4" width="3.2" height="10" rx="1" />
    </svg>
  )
}

export function ListIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M7 6h9.5M7 10h9.5M7 14h9.5M3.5 6h.01M3.5 10h.01M3.5 14h.01" strokeWidth={2} />
    </svg>
  )
}

export function VolumeIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <polygon points="9 4 5 7.5 2 7.5 2 12.5 5 12.5 9 16 9 4" />
      <path d="M12.5 7.5a3.5 3.5 0 0 1 0 5" />
      <path d="M15.5 5a7 7 0 0 1 0 10" />
    </svg>
  )
}

export function LayoutIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <rect x="3" y="3.5" width="14" height="13" rx="2" />
      <path d="M3 8.5h14M8.5 8.5v8" />
    </svg>
  )
}

export function PromoteIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M5 15L15 5M7 5h8v8" />
    </svg>
  )
}


