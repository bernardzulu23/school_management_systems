import { useState } from 'react'
import { ScrollView, Text, TextInput, View } from 'react-native'
import { generateEczPaper } from '@/api/eczPractice'
import { BrutalButton } from '@/components/BrutalButton'
import { globalStyles } from '@/theme/styles'
import { ZsmsTheme } from '@/theme/colors'
import type { EczPaper } from '@/types'

const LEVELS: Array<{ key: string; label: string }> = [
  { key: 'grade7', label: 'Grade 7' },
  { key: 'grade9', label: 'Grade 9' },
  { key: 'grade12', label: 'Grade 12' },
]

export default function EczPracticeScreen() {
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [examLevel, setExamLevel] = useState('grade9')
  const [paper, setPaper] = useState<EczPaper | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  async function generate() {
    if (!subject.trim() || !topic.trim()) {
      setError('Enter a subject and a topic')
      return
    }
    setLoading(true)
    setError(null)
    setPaper(null)
    setRevealed({})
    try {
      const result = await generateEczPaper({ subject, topic, examLevel, questionCount: 5 })
      setPaper(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate practice paper')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={globalStyles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={globalStyles.title}>ECZ Practice</Text>
      <Text style={globalStyles.subtitle}>Generate an ECZ-style practice paper</Text>

      <Text style={globalStyles.label}>Subject</Text>
      <TextInput
        style={globalStyles.input}
        value={subject}
        onChangeText={setSubject}
        placeholder="e.g. Mathematics"
        placeholderTextColor={ZsmsTheme.placeholder}
      />

      <Text style={globalStyles.label}>Topic</Text>
      <TextInput
        style={globalStyles.input}
        value={topic}
        onChangeText={setTopic}
        placeholder="e.g. Quadratic equations"
        placeholderTextColor={ZsmsTheme.placeholder}
      />

      <Text style={globalStyles.label}>Level</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {LEVELS.map((lvl) => (
          <BrutalButton
            key={lvl.key}
            title={lvl.label}
            variant={examLevel === lvl.key ? 'primary' : 'secondary'}
            onPress={() => setExamLevel(lvl.key)}
            style={{ flex: 1, paddingVertical: 8 }}
          />
        ))}
      </View>

      <BrutalButton
        title={loading ? 'Generating…' : 'Generate paper'}
        onPress={generate}
        loading={loading}
      />

      {error ? <Text style={[globalStyles.errorText, { marginTop: 12 }]}>{error}</Text> : null}

      {paper ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: ZsmsTheme.ink }}>
            {paper.examInfo.subject} — {paper.examInfo.level}
          </Text>
          <Text style={globalStyles.subtitle}>
            {paper.examInfo.topic} • {paper.examInfo.totalMarks} marks •{' '}
            {paper.examInfo.timeAllowed}
          </Text>
          {paper.questions.map((q, idx) => (
            <View key={q.id || String(idx)} style={globalStyles.card}>
              <Text style={{ fontWeight: '700', color: ZsmsTheme.ink }}>
                {idx + 1}. {q.question}{' '}
                <Text style={{ color: ZsmsTheme.textSecondary }}>({q.marks} marks)</Text>
              </Text>
              {q.options?.length ? (
                <View style={{ marginTop: 6 }}>
                  {q.options.map((opt, i) => (
                    <Text key={i} style={{ color: ZsmsTheme.ink, marginVertical: 2 }}>
                      {String.fromCharCode(65 + i)}. {opt}
                    </Text>
                  ))}
                </View>
              ) : null}
              <BrutalButton
                title={revealed[q.id] ? 'Hide answer' : 'Show answer'}
                variant="ghost"
                onPress={() => setRevealed((r) => ({ ...r, [q.id]: !r[q.id] }))}
                style={{ marginTop: 8, alignSelf: 'flex-start', paddingVertical: 6 }}
              />
              {revealed[q.id] ? (
                <View
                  style={{
                    marginTop: 6,
                    padding: 10,
                    backgroundColor: ZsmsTheme.successBg,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontWeight: '700', color: ZsmsTheme.success }}>
                    Answer: {q.answer}
                  </Text>
                  {q.explanation ? (
                    <Text style={{ color: ZsmsTheme.ink, marginTop: 4 }}>{q.explanation}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  )
}
