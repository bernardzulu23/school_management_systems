'use client'

/**
 * Displays school material chunks used to ground an AI response.
 * @param {{ references?: Array<{
 *   ref?: number
 *   chunkId?: string
 *   materialId?: string
 *   materialTitle?: string
 *   subject?: string
 *   chunkIndex?: number
 *   similarity?: number
 *   excerpt?: string
 * }> | null, className?: string }} props
 */
export function RagReferencesPanel({ references, className = '' }) {
  const refs = Array.isArray(references) ? references : []
  if (!refs.length) return null

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <div className="text-sm font-semibold text-royalPurple-text1">Source References (RAG)</div>
      <p className="text-xs text-royalPurple-text3">
        Excerpts from your school&apos;s uploaded materials used to ground this output. Cite as [Ref
        N] in the lesson plan or assessment.
      </p>
      <div className="space-y-2">
        {refs.map((ref) => (
          <div
            key={ref.chunkId || `${ref.materialId}-${ref.ref}`}
            className="rounded-lg border border-royalPurple-border/70 bg-royalPurple-card/40 p-3"
          >
            <div className="text-xs text-royalPurple-text2">
              [Ref {ref.ref}] {ref.materialTitle || 'Material'}
              {ref.subject ? ` • ${ref.subject}` : ''}
              {typeof ref.chunkIndex === 'number' ? ` • chunk ${ref.chunkIndex}` : ''}
              {typeof ref.similarity === 'number'
                ? ` • similarity ${Math.round(ref.similarity * 100)}%`
                : ''}
            </div>
            {ref.excerpt ? (
              <div className="mt-1 text-xs text-royalPurple-text3">{ref.excerpt}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
