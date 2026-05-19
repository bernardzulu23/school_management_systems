export const metadata = {
  title: 'Platform Admin',
}

export default function PlatformLayout({ children }) {
  return <div className="min-h-screen bg-paper text-ink">{children}</div>
}
