import { Suspense } from 'react'
import RegisterSchoolClient from './register-school-client'

export default function RegisterSchoolPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-royalPurple-page flex items-center justify-center p-4">
          <div className="bg-royalPurple-card rounded-2xl p-8 w-full max-w-lg border border-royalPurple-border/40">
            <h1 className="text-2xl font-bold text-royalPurple-text1 mb-2">Register Your School</h1>
            <p className="text-royalPurple-text2 mb-6">Loading…</p>
          </div>
        </div>
      }
    >
      <RegisterSchoolClient />
    </Suspense>
  )
}
