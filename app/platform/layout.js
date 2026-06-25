export const metadata = {
  title: 'Platform Admin',
}

/** Platform console — session-scoped, not statically prerendered. */
export const dynamic = 'force-dynamic'

export default function PlatformLayout({ children }) {
  return <div className="min-h-screen bg-paper text-ink">{children}</div>
}
