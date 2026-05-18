'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react'
import { ECZ_GUIDELINES_SUBJECT_COUNT } from '@/lib/ecz/ecz-subjects-data'

export function EczGuidelinesCatalog({ subjects = [], loading = false }) {
  const [openId, setOpenId] = useState('')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return subjects
    return subjects.filter(
      (s) =>
        String(s.name || '')
          .toLowerCase()
          .includes(q) ||
        String(s.code || '')
          .toLowerCase()
          .includes(q)
    )
  }, [subjects, query])

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading ECZ guidelines…</p>
  }

  if (subjects.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">ECZ Assessment Guidelines not loaded yet</p>
        <p className="mt-1 text-amber-800">
          Click <strong>Sync ECZ subjects</strong> above to load all {ECZ_GUIDELINES_SUBJECT_COUNT}{' '}
          subjects with constructs and elements of construct from the official guidelines.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-royalPurple-text1 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            ECZ Assessment Guidelines
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {subjects.length} of {ECZ_GUIDELINES_SUBJECT_COUNT} guideline subjects synced — expand
            each subject to view the construct and elements.
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search subjects…"
          className="h-9 w-full sm:w-56 rounded-lg border border-royalPurple-border bg-royalPurple-deep px-3 text-sm text-royalPurple-text1"
        />
      </div>

      <ul className="divide-y rounded-xl border border-royalPurple-border/50 overflow-hidden">
        {filtered.map((subject) => {
          const id = String(subject.id)
          const isOpen = openId === id
          const elements = Array.isArray(subject.constructElements) ? subject.constructElements : []
          return (
            <li key={id} className="bg-royalPurple-card/40">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? '' : id)}
                className="w-full flex items-start gap-2 px-4 py-3 text-left hover:bg-royalPurple-card/60 transition-colors"
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                )}
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-royalPurple-text1">{subject.name}</span>
                  {subject.code ? (
                    <span className="ml-2 text-xs text-muted-foreground">({subject.code})</span>
                  ) : null}
                  {!isOpen && subject.construct ? (
                    <span className="block text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {subject.construct}
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {elements.length} element{elements.length === 1 ? '' : 's'}
                </span>
              </button>
              {isOpen ? (
                <div className="px-4 pb-4 pl-10 space-y-3">
                  {subject.construct ? (
                    <div className="rounded-lg bg-royalPurple-deep/60 border border-royalPurple-border/40 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-1">
                        Construct
                      </p>
                      <p className="text-sm text-royalPurple-text2 leading-relaxed">
                        {subject.construct}
                      </p>
                    </div>
                  ) : null}
                  {elements.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2">
                        Elements of construct
                      </p>
                      <ol className="space-y-2 list-none">
                        {elements.map((el) => (
                          <li
                            key={el.id || el.elementNumber}
                            className="text-sm text-royalPurple-text2 flex gap-2"
                          >
                            <span className="font-semibold text-royalPurple-text1 shrink-0">
                              {el.elementNumber}.
                            </span>
                            <span>{el.statement}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700">
                      No construct elements — run sync again.
                    </p>
                  )}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
