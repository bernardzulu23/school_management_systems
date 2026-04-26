function normalizeTerm(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (lower === 'all terms') return ''
  const match = raw.match(/term\s*([1-3])/i)
  if (match?.[1]) return `Term ${Number(match[1])}`
  return raw
}

function termKey(value) {
  const norm = normalizeTerm(value)
  const lower = norm.toLowerCase()
  if (lower.includes('1')) return 'term1'
  if (lower.includes('2')) return 'term2'
  if (lower.includes('3')) return 'term3'
  return 'term0'
}

function avg(values) {
  if (!values.length) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

export async function getTeacherPerformance({ prisma, schoolId, teacherUserId, term, year }) {
  const termNorm = normalizeTerm(term)
  const yearNum = year ? Number(year) : null

  const results = await prisma.result.findMany({
    where: {
      schoolId,
      enteredByUserId: teacherUserId,
      ...(termNorm ? { term: termNorm } : {}),
      ...(yearNum ? { year: yearNum } : {}),
    },
    include: {
      student: { select: { id: true, class: true, classId: true } },
      subject: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 200000,
  })

  const studentIds = new Set()
  const scores = []

  const bySubjectTerm = new Map()
  const byClassTerm = new Map()

  for (const r of results) {
    if (r?.studentId) studentIds.add(String(r.studentId))
    const score = Number(r.score || 0)
    scores.push(score)

    const tKey = termKey(r.term)
    const academicYear = r.year
    const subjectName = r.subject?.name || 'Unknown'
    const subjectId = r.subjectId
    const className = r.student?.class || 'Unknown'
    const classId = r.student?.classId || null

    const subjectTermKey = `${subjectId}::${tKey}::${academicYear}`
    if (!bySubjectTerm.has(subjectTermKey)) {
      bySubjectTerm.set(subjectTermKey, {
        subjectId,
        subject_name: subjectName,
        term: tKey,
        academic_year: academicYear,
        scores: [],
        studentIds: new Set(),
      })
    }
    const st = bySubjectTerm.get(subjectTermKey)
    st.scores.push(score)
    st.studentIds.add(String(r.studentId))

    const classTermKey = `${String(classId || className)}::${tKey}::${academicYear}`
    if (!byClassTerm.has(classTermKey)) {
      byClassTerm.set(classTermKey, {
        classId: classId ? String(classId) : null,
        class_name: className,
        term: tKey,
        academic_year: academicYear,
        scores: [],
        studentIds: new Set(),
      })
    }
    const ct = byClassTerm.get(classTermKey)
    ct.scores.push(score)
    ct.studentIds.add(String(r.studentId))
  }

  const student_performance = []
  for (const v of bySubjectTerm.values()) {
    student_performance.push({
      subject_id: v.subjectId,
      subject_name: v.subject_name,
      term: v.term,
      academic_year: v.academic_year,
      overall_score: Number(avg(v.scores).toFixed(2)),
      midterm_score: 0,
      endterm_score: 0,
      students_assessed: v.studentIds.size,
    })
  }

  const class_performance = []
  for (const v of byClassTerm.values()) {
    class_performance.push({
      classId: v.classId,
      class_name: v.class_name,
      term: v.term,
      academic_year: v.academic_year,
      overall_score: Number(avg(v.scores).toFixed(2)),
      students_assessed: v.studentIds.size,
    })
  }

  const summariesMap = new Map()
  for (const sp of student_performance) {
    const k = `${sp.term}::${sp.academic_year}`
    if (!summariesMap.has(k)) {
      summariesMap.set(k, { term: sp.term, academic_year: sp.academic_year, scores: [] })
    }
    summariesMap.get(k).scores.push(Number(sp.overall_score || 0))
  }

  const summaries = Array.from(summariesMap.values()).map((s) => ({
    term: s.term,
    academic_year: s.academic_year,
    average_student_performance: Number(avg(s.scores).toFixed(2)),
    average_observation_score: 0,
    overall_rating: 0,
  }))

  const overall_metrics = {
    total_observations: 0,
    average_observation_score: 0,
    performance_trend: 'stable',
    total_students_taught: studentIds.size,
    average_student_performance: Number(avg(scores).toFixed(2)),
    total_results_entered: results.length,
  }

  return { summaries, observations: [], student_performance, class_performance, overall_metrics }
}
