import { Pricing } from '@/components/sections/Pricing'
import Link from 'next/link'

export const metadata = {
  title: 'Pricing | ZSMS',
  description: 'Zambia School Management System plans — Trial, Basic, Standard, and Premium.',
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-4 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="font-bold text-gray-900">
          ZSMS
        </Link>
        <div className="flex gap-3 text-sm">
          <Link href="/login" className="text-gray-700 hover:underline">
            Log in
          </Link>
          <Link
            href="/onboarding"
            className="rounded-lg bg-gray-900 text-white px-3 py-1.5 font-semibold hover:opacity-90"
          >
            Start free trial
          </Link>
        </div>
      </header>
      <Pricing />
    </main>
  )
}
