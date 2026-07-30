import { describe, it, expect, vi } from 'vitest'
import {
  recommendLessonPlanVisualKinds,
  buildLessonPlanVisualGuidanceBlock,
} from '@/lib/ai/lesson-plan-visual-guidance'
import {
  renderLessonPlanVisual,
  renderLessonPlanVisuals,
} from '@/lib/ai/chat/lesson-plan-visual-render'
import {
  generateLessonPlanWordDocFromStructured,
  generateLessonPlanWordDoc,
} from '@/lib/ai/lesson-plan-word-generator'

describe('lesson plan visual guidance', () => {
  it('recommends cartesian/line for coordinate maths topics', () => {
    const kinds = recommendLessonPlanVisualKinds('Mathematics', 'Cartesian plane and linear graphs')
    expect(kinds).toContain('cartesian')
    expect(kinds).toContain('line')
  })

  it('recommends bar/line for statistics topics', () => {
    const kinds = recommendLessonPlanVisualKinds('Mathematics', 'Bar charts and frequency tables')
    expect(kinds).toContain('bar')
  })

  it('omits visuals for non-visual language topics', () => {
    const kinds = recommendLessonPlanVisualKinds('English Language', 'Listening and Speaking')
    expect(kinds).toEqual([])
    expect(
      buildLessonPlanVisualGuidanceBlock('English Language', 'Listening and Speaking')
    ).toMatch(/Do NOT invent decorative graphs/i)
  })

  it('prompt block lists recommended types for physics graphs', () => {
    const block = buildLessonPlanVisualGuidanceBlock('Physics', 'Distance-time graphs')
    expect(block).toMatch(/line|cartesian/i)
    expect(block).toMatch(/visualAids/)
  })
})

describe('lesson plan visual renderer', () => {
  it('renders cartesian plane to PNG', async () => {
    const rendered = await renderLessonPlanVisual({
      type: 'cartesian',
      title: 'y = 2x',
      xAxis: { min: -4, max: 4, label: 'x', step: 1 },
      yAxis: { min: -8, max: 8, label: 'y', step: 2 },
      series: [
        {
          name: 'y=2x',
          points: [
            { x: -2, y: -4 },
            { x: 0, y: 0 },
            { x: 2, y: 4 },
          ],
        },
      ],
      showGrid: true,
    })
    expect(rendered).not.toBeNull()
    expect(rendered.kind).toBe('cartesian')
    expect(rendered.png.length).toBeGreaterThan(100)
    // PNG magic bytes
    expect(rendered.png[0]).toBe(0x89)
    expect(rendered.png[1]).toBe(0x50)
  })

  it('renders line and bar charts', async () => {
    const line = await renderLessonPlanVisual({
      type: 'line',
      title: 'Temperature',
      xAxis: { min: 0, max: 5, label: 'Hour' },
      yAxis: { min: 0, max: 40, label: '°C' },
      series: [
        {
          name: 'Lusaka',
          points: [
            { x: 0, y: 18 },
            { x: 2, y: 26 },
            { x: 4, y: 30 },
          ],
        },
      ],
    })
    const bar = await renderLessonPlanVisual({
      type: 'bar',
      title: 'Rainfall',
      yLabel: 'mm',
      items: [
        { label: 'Jan', value: 120 },
        { label: 'Feb', value: 90 },
        { label: 'Mar', value: 70 },
      ],
    })
    expect(line?.png.length).toBeGreaterThan(100)
    expect(bar?.png.length).toBeGreaterThan(100)
  })

  it('skips failed conceptual mermaid without throwing', async () => {
    vi.resetModules()
    vi.doMock('@/lib/ai/chat/mermaid-render', () => ({
      renderMermaidToPng: vi.fn().mockResolvedValue(null),
    }))
    const { renderLessonPlanVisuals: renderAll } =
      await import('@/lib/ai/chat/lesson-plan-visual-render')
    const { visuals, diagramFailed } = await renderAll({
      visualAids: [
        {
          type: 'conceptual',
          title: 'Water cycle',
          mermaid: 'flowchart TD\n A-->B',
        },
      ],
      mermaidDiagram: 'flowchart TD\n X-->Y',
    })
    expect(visuals).toEqual([])
    expect(diagramFailed).toBe(true)
  })

  it('renders multiple visuals and keeps successes when one fails', async () => {
    const { visuals } = await renderLessonPlanVisuals({
      visualAids: [
        {
          type: 'bar',
          title: 'Scores',
          items: [
            { label: 'A', value: 10 },
            { label: 'B', value: 20 },
          ],
        },
        {
          type: 'cartesian',
          title: 'Line',
          xAxis: { min: 0, max: 2 },
          yAxis: { min: 0, max: 4 },
          series: [
            {
              name: 's',
              points: [
                { x: 0, y: 0 },
                { x: 2, y: 4 },
              ],
            },
          ],
        },
      ],
    })
    expect(visuals.length).toBe(2)
  })
})

const richPlan = {
  title: 'Linear Graphs',
  subject: 'Mathematics',
  gradeOrForm: 'Form 2',
  duration: 40,
  topic: 'Straight line graphs',
  subTopic: 'Plotting y = mx + c',
  objectives: [
    {
      objective: 'Plot and interpret straight line graphs on the Cartesian plane',
      bloomsLevel: 'Applying',
      competency: 'Critical thinking',
    },
  ],
  priorKnowledge: 'Learners can substitute into linear expressions.',
  materialsRequired: ['Graph paper', 'Rulers', 'Chalkboard'],
  activities: [
    {
      phase: 'Introduction',
      durationMinutes: 5,
      activity: 'Review coordinates with a quick oral quiz on the chalkboard.',
      teacherAction: 'Ask learners to state coordinates of points',
      learnerAction: 'Respond and point to positions on a sketched plane',
      resources: ['Chalkboard'],
    },
    {
      phase: 'Development',
      durationMinutes: 25,
      activity: 'Demonstrate plotting y = 2x + 1 using a table of values, then learners plot.',
      teacherAction: 'Build a table of values and plot carefully',
      learnerAction: 'Complete a table and plot on graph paper',
      resources: ['Graph paper'],
      assessmentCheck: 'Correctly plot at least three points',
    },
    {
      phase: 'Conclusion',
      durationMinutes: 10,
      activity: 'Summarise gradient and intercept and set homework.',
      teacherAction: 'Recap m and c from the equation',
      learnerAction: 'Write the summary in books',
      resources: ['Exercise books'],
    },
  ],
  workedExamples: ['Plot y = 2x + 1 for x = -2,0,2'],
  differentiation: {
    support: 'Provide a partially completed table of values',
    challenge: 'Find the equation from two plotted points',
  },
  homework: 'Plot y = x − 1 on graph paper.',
  assessment: {
    method: 'Practical plotting',
    tool: 'Graph paper checklist',
    criteria: 'Accurate points and straight line',
  },
  crossCuttingThemes: ['STEM'],
  coreCompetencies: ['Critical thinking'],
  realWorldZambianContext: 'Bus fare tables that rise steadily with distance.',
}

describe('structured lesson plan DOCX', () => {
  it('produces a non-empty table-based docx for structured plans', async () => {
    const png = (
      await renderLessonPlanVisual({
        type: 'cartesian',
        title: 'y = 2x + 1',
        xAxis: { min: -3, max: 3 },
        yAxis: { min: -5, max: 8 },
        series: [
          {
            name: 'y=2x+1',
            points: [
              { x: -2, y: -3 },
              { x: 0, y: 1 },
              { x: 2, y: 5 },
            ],
          },
        ],
      })
    )?.png

    const buffer = await generateLessonPlanWordDocFromStructured({
      schoolName: 'Ndake Day Secondary',
      teacherName: 'Ms Phiri',
      date: '2026-07-31',
      structured: richPlan,
      approvalStatus: 'DRAFT',
      visualImages: png ? [{ title: 'Cartesian plane', caption: 'y = 2x + 1', png }] : [],
    })

    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(2000)
    // DOCX is a ZIP — starts with PK
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)
  })

  it('still exports legacy plain-text lesson plans', async () => {
    const buffer = await generateLessonPlanWordDoc({
      schoolName: 'Test School',
      teacherName: 'Teacher',
      date: '2026-07-31',
      subject: 'English Language',
      form: 'Form 2',
      topic: 'Listening',
      subTopic: 'Oral skills',
      duration: 40,
      lessonContent:
        'MINISTRY OF EDUCATION — LESSON PLAN\n\n1. OBJECTIVES\nLearners will listen attentively.',
      approvalStatus: 'DRAFT',
    })
    expect(buffer.length).toBeGreaterThan(500)
    expect(buffer[0]).toBe(0x50)
  })
})
