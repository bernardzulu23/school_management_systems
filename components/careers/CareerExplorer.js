'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Briefcase, ChevronLeft, Layers, Megaphone, GraduationCap, Building2 } from 'lucide-react'
import SkeletonLoader from '@/components/SkeletonLoader'
import { RESOURCE_TYPES } from '@/lib/guidance/constants'

function CareerSection({ title, children }) {
  if (!children) return null
  return (
    <div className="border-t border-royalPurple-border pt-4 first:border-t-0 first:pt-0">
      <h4 className="text-sm font-semibold text-royalPurple-accentTx mb-2">{title}</h4>
      <div className="text-sm text-royalPurple-text2 whitespace-pre-wrap">{children}</div>
    </div>
  )
}

function resourceTypeLabel(type) {
  return RESOURCE_TYPES.find((t) => t.value === type)?.label || type
}

export function CareerExplorer({ embedded = false }) {
  const [clusters, setClusters] = useState([])
  const [board, setBoard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedClusterId, setSelectedClusterId] = useState(null)
  const [selectedCareerId, setSelectedCareerId] = useState(null)
  const [tab, setTab] = useState('pathways') // pathways | board

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError('')
        const [clusterRes, boardRes] = await Promise.all([
          fetch('/api/career-clusters?include=careers', { credentials: 'include' }),
          fetch('/api/guidance/resources', { credentials: 'include' }),
        ])
        const clusterJson = await clusterRes.json().catch(() => ({}))
        const boardJson = await boardRes.json().catch(() => ({}))
        if (!clusterRes.ok) throw new Error(clusterJson.error || 'Could not load career guidance')
        if (!cancelled) {
          const list = (clusterJson.data || []).filter((c) => c.active !== false)
          setClusters(list)
          if (list.length > 0) setSelectedClusterId(list[0].id)
          setBoard(
            Array.isArray(boardJson.data) ? boardJson.data.filter((r) => r.active !== false) : []
          )
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedCluster = clusters.find((c) => c.id === selectedClusterId)
  const careers = (selectedCluster?.careers || []).filter((c) => c.active !== false)
  const selectedCareer = careers.find((c) => c.id === selectedCareerId)

  const wrapperClass = embedded ? 'space-y-4' : 'space-y-6'

  if (loading) {
    return (
      <div className={wrapperClass}>
        <SkeletonLoader variant="rectangular" height="200px" className="rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-royalPurple-dangerTx">
          Something went wrong. Please try again later.
        </CardContent>
      </Card>
    )
  }

  if (selectedCareer) {
    return (
      <div className={wrapperClass}>
        <Button variant="outline" size="sm" onClick={() => setSelectedCareerId(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to {selectedCluster?.name}
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{selectedCareer.title}</CardTitle>
            {selectedCareer.summary && (
              <p className="text-royalPurple-text2 text-sm">{selectedCareer.summary}</p>
            )}
            <p className="text-xs text-royalPurple-text3">{selectedCluster?.name}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <CareerSection title="What this job involves">{selectedCareer.overview}</CareerSection>
            <CareerSection title="Subjects to concentrate on">
              {selectedCareer.subjectsToFocus}
            </CareerSection>
            <CareerSection title="Courses & qualifications">
              {selectedCareer.recommendedCourses}
            </CareerSection>
            <CareerSection title="Universities & training institutions">
              {selectedCareer.collegesInstitutions}
            </CareerSection>
            <CareerSection title="Salary expectations">
              {selectedCareer.salaryExpectations}
            </CareerSection>
            <CareerSection title="Entry requirements">
              {selectedCareer.qualifications}
            </CareerSection>
            <CareerSection title="Career progression">
              {selectedCareer.careerProgression}
            </CareerSection>
            <CareerSection title="More information">{selectedCareer.additionalNotes}</CareerSection>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={wrapperClass}>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={tab === 'pathways' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('pathways')}
        >
          <GraduationCap className="h-4 w-4 mr-1" />
          Career pathways
        </Button>
        <Button
          variant={tab === 'board' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('board')}
        >
          <Megaphone className="h-4 w-4 mr-1" />
          Guidance board
          {board.length > 0 ? ` (${board.length})` : ''}
        </Button>
      </div>

      {tab === 'board' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              From your guidance teacher
            </CardTitle>
            <p className="text-sm text-royalPurple-text2">
              Subjects to focus on, universities and programmes, bursaries, and career events.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {board.length === 0 ? (
              <p className="text-sm text-royalPurple-text3 py-6 text-center">
                No guidance posts yet. Check back after your guidance teacher publishes tips and
                university information.
              </p>
            ) : (
              board.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-royalPurple-border p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium rounded-full bg-royalPurple-card2 px-2 py-0.5 text-royalPurple-accentTx">
                      {resourceTypeLabel(item.type)}
                    </span>
                    {item.deadline ? (
                      <span className="text-xs text-royalPurple-text3">
                        Deadline {new Date(item.deadline).toLocaleDateString()}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-semibold text-royalPurple-text1">{item.title}</h3>
                  <p className="text-sm text-royalPurple-text2 whitespace-pre-wrap">{item.body}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : clusters.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-royalPurple-text2">
            <Briefcase className="h-12 w-12 mx-auto mb-3 text-royalPurple-text3" />
            <p className="font-medium text-royalPurple-text1">Career pathways coming soon</p>
            <p className="text-sm mt-2">
              Your school has not published career clusters yet. Open the Guidance board tab for
              tips from your guidance teacher.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {clusters.map((cluster) => (
              <Button
                key={cluster.id}
                variant={selectedClusterId === cluster.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedClusterId(cluster.id)
                  setSelectedCareerId(null)
                }}
              >
                <Layers className="h-4 w-4 mr-1" />
                {cluster.name}
              </Button>
            ))}
          </div>

          {selectedCluster && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedCluster.name}</CardTitle>
                <p className="text-sm text-royalPurple-text2 whitespace-pre-wrap">
                  {selectedCluster.description}
                </p>
              </CardHeader>
              <CardContent>
                {careers.length === 0 ? (
                  <p className="text-sm text-royalPurple-text3 py-4 text-center">
                    No careers listed in this cluster yet.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {careers.map((career) => (
                      <button
                        key={career.id}
                        type="button"
                        onClick={() => setSelectedCareerId(career.id)}
                        className="text-left p-4 rounded-lg border border-royalPurple-border hover:border-royalPurple-border2 hover:bg-royalPurple-card2/50 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <Briefcase className="h-5 w-5 text-royalPurple-accentTx shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-royalPurple-text1">
                              {career.title}
                            </div>
                            {career.summary && (
                              <p className="text-sm text-royalPurple-text2 mt-1 line-clamp-2">
                                {career.summary}
                              </p>
                            )}
                            <span className="text-xs text-royalPurple-accentTx mt-2 inline-block">
                              View subjects &amp; universities →
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
