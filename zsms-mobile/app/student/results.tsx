import { useCallback, useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { loadStudentResults } from '@/api/results'
import { globalStyles } from '@/theme/styles'
import { ZsmsTheme } from '@/theme/colors'
import type { StudentResult } from '@/types'

function gradeColor(grade: string | null): string {
  const g = String(grade || '').toUpperCase()
  if (['A', 'A+', 'DISTINCTION', '1'].includes(g)) return ZsmsTheme.success
  if (['F', 'U', 'FAIL', '9'].includes(g)) return ZsmsTheme.danger
  return ZsmsTheme.warn
}

export default function ResultsScreen() {
  const [results, setResults] = useState<StudentResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchResults = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await loadStudentResults(1, 100)
      setResults(page.results)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchResults()
    }, [fetchResults])
  )

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>My Results</Text>
      <Text style={globalStyles.subtitle}>Your recorded subject results</Text>
      {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}
      <FlatList
        data={results}
        keyExtractor={(r) => r.id}
        refreshing={loading}
        onRefresh={fetchResults}
        ListEmptyComponent={
          loading ? null : <Text style={globalStyles.subtitle}>No results recorded yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={globalStyles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 16, color: ZsmsTheme.ink }}>
                  {item.subject}
                </Text>
                <Text style={{ color: ZsmsTheme.textSecondary, fontSize: 12 }}>
                  {[item.term, item.year].filter(Boolean).join(' • ') || item.subjectCode}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {item.score != null ? (
                  <Text style={{ fontWeight: '800', fontSize: 18, color: ZsmsTheme.ink }}>
                    {item.score}
                  </Text>
                ) : null}
                {item.grade ? (
                  <Text style={{ fontWeight: '800', color: gradeColor(item.grade) }}>
                    {item.grade}
                  </Text>
                ) : null}
              </View>
            </View>
            {item.comments ? (
              <Text style={{ color: ZsmsTheme.textSecondary, marginTop: 6, fontSize: 13 }}>
                {item.comments}
              </Text>
            ) : null}
          </View>
        )}
      />
    </View>
  )
}
