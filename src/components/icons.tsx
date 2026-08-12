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

export function TrashIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M4.4 6.4h11.2M8.4 6.4V4.9c0-.5.4-.9.9-.9h1.4c.5 0 .9.4.9.9v1.5" />
      <path d="M6.4 6.4l.6 8.6c0 .6.5 1 1.1 1h3.8c.6 0 1.1-.4 1.1-1l.6-8.6M8.4 9.2v4.4M11.6 9.2v4.4" />
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
      <rect x="3.5" y="4.5" width="13" height="11" rx="2" />
      <path d="M3.5 9h4l1.2 1.8h2.6L12.5 9h4" />
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
      <rect x="3.5" y="4.5" width="13" height="12" rx="2" />
      <path d="M3.5 8.5h13M7 3v3M13 3v3" />
      <path d="M7.2 11.8h1.6M11.2 11.8h1.6M7.2 13.8h1.6M11.2 13.8h1.6" />
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
      <rect x="3.5" y="3.8" width="13" height="3.6" rx="1.1" />
      <path d="M5.2 7.4v7.3a1.4 1.4 0 0 0 1.4 1.4h6.8a1.4 1.4 0 0 0 1.4-1.4V7.4" />
      <path d="M8.6 11h2.8" />
    </svg>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...strokeProps} strokeWidth={1.7} {...props}>
      <path d="M3.5 5.75h13M3.5 10h13M3.5 14.25h13" />
      <g fill="currentColor" stroke="none">
        <circle cx="9.4" cy="5.75" r="1.55" />
        <circle cx="6.2" cy="10" r="1.55" />
        <circle cx="12.8" cy="14.25" r="1.55" />
      </g>
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
      <path d="M4.5 4.5h11M4.5 9.5h11M7.5 14.5h8M4.5 13.5v2" />
    </svg>
  )
}

export function LinkIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <path d="M8.5 11.5l3-3m-1.5-2.5l1.8-1.8a2.5 2.5 0 0 1 3.5 3.5l-1.8 1.8m-4.5 1.5l-1.8 1.8a2.5 2.5 0 0 1-3.5-3.5l1.8-1.8" />
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
      <path d="M10 6.5v3.8l2.5 1.5" />
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
      <path d="M4.5 5.5h11M4.5 9.5h11M4.5 13.5h7" />
    </svg>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...strokeProps} {...props}>
      <rect x="4.5" y="8.5" width="11" height="8" rx="1.5" />
      <path d="M7 8.5V6a3 3 0 0 1 6 0v2.5" />
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


