'use client'

import { Suspense } from 'react'
import OldSyllabusGenerateForm from './GenerateForm'

export default function OldSyllabusGeneratePage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm">Loading generator…</p>}>
      <OldSyllabusGenerateForm />
    </Suspense>
  )
}
