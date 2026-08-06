'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HodFileUpload } from '@/components/hod/HodFileUpload'
import { FolderOpen, Loader2 } from 'lucide-react'

/**
 * Document cabinet for HOD File Management modules that are not meeting/correspondence rows.
 * Uses departmentId (or "school") as the stable entityId for polymorphic HodFile rows.
 *
 * @param {{
 *   entityType: 'exam_analysis' | 'monitoring'
 *   title?: string
 *   description?: string
 *   defaultLabel?: string
 * }} props
 */
export function HodDocumentCabinet({
  entityType,
  title = 'Documents',
  description = 'Upload and download department files for this section.',
  defaultLabel = 'attachment',
}) {
  const [entityId, setEntityId] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadScope() {
      setLoading(true)
      setError(null)
      try {
        // Resolve cabinet id from a lightweight scope probe via existing list with expected id.
        // Prefer department from /api/hod/meetings empty list scope — use dedicated endpoint if needed.
        const res = await fetch('/api/hod/cabinet-scope', { credentials: 'include' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Failed to resolve department scope')
        if (!cancelled) setEntityId(json.data?.cabinetEntityId || 'school')
      } catch (e) {
        if (!cancelled) {
          setError(e.message)
          setEntityId('school')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadScope()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderOpen className="h-4 w-4" />
          {title}
        </CardTitle>
        <p className="text-sm font-normal text-[var(--color-muted)]">{description}</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing uploads…
          </div>
        ) : (
          <>
            {error ? <p className="mb-2 text-xs text-[var(--warn-color)]">{error}</p> : null}
            <HodFileUpload
              entityType={entityType}
              entityId={entityId}
              defaultLabel={defaultLabel}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
