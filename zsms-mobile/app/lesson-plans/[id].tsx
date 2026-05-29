import { useCallback, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useLessonPlanCache } from '@/store/lessonPlanCache'
import { globalStyles } from '@/theme/styles'
import { ZsmsTheme } from '@/theme/colors'
import type { LessonPlanDetail } from '@/types'

export default function LessonPlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const getDetail = useLessonPlanCache((s) => s.getDetail)
  const [plan, setPlan] = useState<LessonPlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      let active = true
      ;(async () => {
        if (!id) return
        setLoading(true)
        setError(null)
        try {
          const detail = await getDetail(String(id))
          if (active) setPlan(detail)
        } catch (e) {
          if (active) setError(e instanceof Error ? e.message : 'Unable to load lesson plan')
        } finally {
          if (active) setLoading(false)
        }
      })()
      return () => {
        active = false
      }
    }, [id, getDetail])
  )

  return (
    <ScrollView style={globalStyles.screen} contentContainerStyle={{ padding: 16 }}>
      {loading ? <Text style={globalStyles.subtitle}>Loading…</Text> : null}
      {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}
      {plan ? (
        <>
          <Text style={globalStyles.title}>{plan.topic}</Text>
          <Text style={globalStyles.subtitle}>
            {plan.subject} • {plan.grade}
            {plan.term ? ` • ${plan.term}` : ''}
          </Text>
          <View style={globalStyles.card}>
            <Text style={{ color: ZsmsTheme.ink, lineHeight: 20 }}>{plan.content}</Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  )
}
