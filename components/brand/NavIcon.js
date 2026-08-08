/**
 * ZSMS nav icon set — geometric stroke icons (currentColor) for shell chrome.
 * Brand cues: angular peaks / bold geometry inspired by zsms-mark.svg.
 * Use via <NavIcon name="overview" /> — keep Lucide for in-page UI.
 */
import { cn } from '@/lib/utils'

function Svg({ children, className, size = 16, title, ...props }) {
  const px = Number(size) || 16
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={cn('shrink-0', className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

/** Dashboard / overview — angular peak grid */
function OverviewIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 20V10l4-5 4 5 3-4 5 6v8" />
      <path d="M4 20h16" />
      <path d="M9 20v-5h4v5" />
    </Svg>
  )
}

/** People / school usage */
function UsersIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 20c.4-2 1.8-3.5 4.5-3.5.6 0 1.1.1 1.5.2" />
    </Svg>
  )
}

/** Schools — building with peak roof */
function SchoolsIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M9 20v-6h6v6" />
      <path d="M4 20h16" />
      <path d="M10 10h4" />
    </Svg>
  )
}

/** SMS / phone */
function SmsIcon(props) {
  return (
    <Svg {...props}>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M10 5h4" />
      <path d="M10 18h4" />
      <path d="M9 9h6v5H9z" />
    </Svg>
  )
}

/** Support / headset */
function SupportIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 13v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 13a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2z" />
      <path d="M20 13a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2z" />
      <path d="M15 19h-2a2 2 0 0 1-2-2v-1" />
    </Svg>
  )
}

/** Map pin — provinces / streams */
function MapIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  )
}

/** Billing / card */
function BillingIcon(props) {
  return (
    <Svg {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </Svg>
  )
}

/** Health / pulse */
function HealthIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </Svg>
  )
}

/** Audit / clipboard */
function AuditIcon(props) {
  return (
    <Svg {...props}>
      <path d="M9 4h6a2 2 0 0 1 2 2v14H7V6a2 2 0 0 1 2-2z" />
      <path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
      <path d="M10 11h4" />
      <path d="M10 15h4" />
    </Svg>
  )
}

/** Security / shield alert */
function SecurityIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </Svg>
  )
}

/** Profile / user */
function ProfileIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </Svg>
  )
}

/** Settings — gear */
function SettingsIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </Svg>
  )
}

/** Offline & sync — download arrow into tray */
function OfflineIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3v11" />
      <path d="M8 10l4 4 4-4" />
      <path d="M4 18h16" />
      <path d="M6 21h12" />
    </Svg>
  )
}

/** Notifications — bell */
function NotificationsIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 2 5 2 5H4s2-1 2-5" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </Svg>
  )
}

/** Attendance — check mark on person */
function AttendanceIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 2.5-5 6-5 1.2 0 2.3.3 3.2.8" />
      <path d="M14 14l3 3 5-5" />
    </Svg>
  )
}

/** Results — angular bar chart (brand peaks) */
function ResultsIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 20V10" />
      <path d="M10 20V6" />
      <path d="M16 20v-8" />
      <path d="M20 20V12" />
      <path d="M3 20h18" />
    </Svg>
  )
}

/** Reports — document */
function ReportsIcon(props) {
  return (
    <Svg {...props}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </Svg>
  )
}

/** Privacy — shield */
function PrivacyIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  )
}

/** Feedback — speech bubble */
function FeedbackIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
      <path d="M8 10h8" />
      <path d="M8 13h5" />
    </Svg>
  )
}

/** Megaphone / announcements */
function MegaphoneIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3 11v2" />
      <path d="M5 9v6" />
      <path d="M7 8l12-4v16L7 16H5V8h2z" />
      <path d="M19 8v8" />
    </Svg>
  )
}

/** Layers / clusters */
function LayersIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </Svg>
  )
}

/** Briefcase / careers */
function BriefcaseIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </Svg>
  )
}

/** Heart / re-entry care */
function HeartIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
    </Svg>
  )
}

/** Calendar / meetings */
function CalendarIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M8 14h3" />
      <path d="M14 14h2" />
    </Svg>
  )
}

/** Classes — graduation / cohort peak */
function ClassesIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M5 12v4c0 1.5 3 3 7 3s7-1.5 7-3v-4" />
      <path d="M21 8v6" />
    </Svg>
  )
}

/** Subjects / book */
function SubjectsIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4V5z" />
      <path d="M20 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8V5z" />
    </Svg>
  )
}

/** Eye / monitoring */
function EyeIcon(props) {
  return (
    <Svg {...props}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </Svg>
  )
}

/** Teaching studio — bolt / spark */
function StudioIcon(props) {
  return (
    <Svg {...props}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </Svg>
  )
}

/** AI / sparkles */
function AiIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="M5.6 5.6l2.1 2.1" />
      <path d="M16.3 16.3l2.1 2.1" />
      <path d="M18.4 5.6l-2.1 2.1" />
      <path d="M7.7 16.3l-2.1 2.1" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

/** Upload / materials */
function UploadIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 16V5" />
      <path d="M8 9l4-4 4 4" />
      <path d="M4 18h16" />
      <path d="M6 21h12" />
    </Svg>
  )
}

/** Games / controller */
function GamesIcon(props) {
  return (
    <Svg {...props}>
      <rect x="2" y="8" width="20" height="10" rx="3" />
      <path d="M7 13h2" />
      <path d="M8 12v2" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="18" cy="14" r="1" />
    </Svg>
  )
}

/** Target / exam scenarios */
function TargetIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </Svg>
  )
}

/** Rocket / innovation */
function RocketIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 15l-2 6 6-2" />
      <path d="M14 4l6 6-8 4-4 4-2-2 4-4 4-8z" />
      <path d="M14 4l2 2" />
    </Svg>
  )
}

/** Trophy / extracurricular */
function TrophyIcon(props) {
  return (
    <Svg {...props}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4a2 2 0 0 0 2 4h1" />
      <path d="M17 6h3a2 2 0 0 1-2 4h-1" />
    </Svg>
  )
}

/** Clock / sessions */
function ClockIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  )
}

/** File check / mock exam */
function FileCheckIcon(props) {
  return (
    <Svg {...props}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5" />
      <path d="M9 14l2 2 4-4" />
    </Svg>
  )
}

/** Compass / help */
function CompassIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5l-2 5-5 2 2-5 5-2z" />
    </Svg>
  )
}

/** Code / playground */
function CodeIcon(props) {
  return (
    <Svg {...props}>
      <path d="M8 8l-4 4 4 4" />
      <path d="M16 8l4 4-4 4" />
      <path d="M13 6l-2 12" />
    </Svg>
  )
}

/** Budget / dollar */
function BudgetIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v12" />
      <path d="M15 9.5c0-1.5-1.3-2.5-3-2.5s-3 1-3 2.5 1.3 2 3 2.5 3 1 3 2.5-1.3 2.5-3 2.5-3-1-3-2.5" />
    </Svg>
  )
}

/** Package / stock */
function PackageIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M12 12l8-4.5" />
      <path d="M12 12v9" />
      <path d="M12 12L4 7.5" />
    </Svg>
  )
}

/** Register / user plus */
function RegisterIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </Svg>
  )
}

/** Alert / conflicts */
function AlertIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </Svg>
  )
}

/** Bus / transport */
function BusIcon(props) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="16" height="12" rx="2" />
      <path d="M4 12h16" />
      <path d="M7 16v2" />
      <path d="M17 16v2" />
      <path d="M8 8h3" />
      <path d="M13 8h3" />
      <circle cx="8" cy="18" r="1.5" />
      <circle cx="16" cy="18" r="1.5" />
    </Svg>
  )
}

/** Hostel / building home */
function HostelIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 20V10l8-6 8 6v10" />
      <path d="M10 20v-6h4v6" />
      <path d="M4 20h16" />
    </Svg>
  )
}

/** Logout */
function LogoutIcon(props) {
  return (
    <Svg {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Svg>
  )
}

export const NAV_ICONS = {
  overview: OverviewIcon,
  users: UsersIcon,
  schools: SchoolsIcon,
  sms: SmsIcon,
  support: SupportIcon,
  map: MapIcon,
  streams: MapIcon,
  billing: BillingIcon,
  health: HealthIcon,
  audit: AuditIcon,
  security: SecurityIcon,
  profile: ProfileIcon,
  settings: SettingsIcon,
  offline: OfflineIcon,
  notifications: NotificationsIcon,
  attendance: AttendanceIcon,
  results: ResultsIcon,
  reports: ReportsIcon,
  privacy: PrivacyIcon,
  feedback: FeedbackIcon,
  megaphone: MegaphoneIcon,
  layers: LayersIcon,
  briefcase: BriefcaseIcon,
  heart: HeartIcon,
  calendar: CalendarIcon,
  classes: ClassesIcon,
  subjects: SubjectsIcon,
  eye: EyeIcon,
  studio: StudioIcon,
  ai: AiIcon,
  upload: UploadIcon,
  games: GamesIcon,
  target: TargetIcon,
  rocket: RocketIcon,
  trophy: TrophyIcon,
  clock: ClockIcon,
  filecheck: FileCheckIcon,
  compass: CompassIcon,
  code: CodeIcon,
  budget: BudgetIcon,
  package: PackageIcon,
  register: RegisterIcon,
  alert: AlertIcon,
  bus: BusIcon,
  hostel: HostelIcon,
  logout: LogoutIcon,
}

/**
 * Renders a brand nav icon by string key, or a legacy Lucide component.
 * @param {{ icon: string | import('react').ComponentType<any>, size?: number, className?: string, title?: string }} props
 */
export function NavIcon({ icon, name, size = 16, className, title, ...props }) {
  const key = name || (typeof icon === 'string' ? icon : null)
  if (key) {
    const Icon = NAV_ICONS[key] || NAV_ICONS.overview
    return <Icon size={size} className={className} title={title} {...props} />
  }
  if (typeof icon === 'function' || (icon && typeof icon === 'object')) {
    const Lucide = icon
    return <Lucide className={className} size={size} aria-hidden="true" {...props} />
  }
  const Fallback = NAV_ICONS.overview
  return <Fallback size={size} className={className} title={title} {...props} />
}
