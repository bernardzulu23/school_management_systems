import { useState } from 'react'
import { Alert, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { submitScore } from '@/api/assessments'
import { BrutalButton } from '@/components/BrutalButton'
import { useOfflineQueue } from '@/store/offlineQueue'
import { computeRubricScoreLocal } from '@/utils/ecz'
import { currentAcademicYear } from '@/utils/date'
import { globalStyles } from '@/theme/styles'
import { ApiError } from '@/api/client'

export default function StudentScoreScreen() {
  const { studentId, studentName, assessmentId, formLevel, taskNumber } = useLocalSearchParams<{
    studentId: string
    studentName: string
    assessmentId: string
    formLevel: string
    taskNumber: string
  }>()
  const [score, setScore] = useState('')
  const [excellent, setExcellent] = useState('0')
  const [good, setGood] = useState('0')
  const [fair, setFair] = useState('0')
  const [poor, setPoor] = useState('0')
  const [useRubric, setUseRubric] = useState(false)
  const [loading, setLoading] = useState(false)
  const enqueueScore = useOfflineQueue((s) => s.enqueueScore)

  const rubricPreview = computeRubricScoreLocal({
    excellentCount: Number(excellent),
    goodCount: Number(good),
    fairCount: Number(fair),
    needsImprovementCount: Number(poor),
  })

  async function onSubmit() {
    setLoading(true)
    const payload = {
      assessmentId,
      studentId,
      formLevel: Number(formLevel),
      academicYear: currentAcademicYear(),
      taskNumber: Number(taskNumber) as 1 | 2 | 3 | 4,
      ...(useRubric
        ? {
            excellentCount: Number(excellent),
            goodCount: Number(good),
            fairCount: Number(fair),
            needsImprovementCount: Number(poor),
            score: rubricPreview.calculatedScore,
          }
        : { score: Number(score) }),
    }
    try {
      await submitScore(payload)
      Alert.alert('Saved', 'Score recorded.')
      router.back()
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        await enqueueScore(payload)
      } else {
        await enqueueScore(payload)
        Alert.alert('Queued', 'Score saved offline and will sync later.')
        router.back()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>{studentName}</Text>
      <Text style={globalStyles.subtitle}>Task {taskNumber}</Text>
      <BrutalButton
        title={useRubric ? 'Use numeric score' : 'Use rubric counters'}
        variant="secondary"
        onPress={() => setUseRubric(!useRubric)}
      />
      {useRubric ? (
        <>
          <Text style={globalStyles.label}>Excellent</Text>
          <TextInput
            style={globalStyles.input}
            keyboardType="number-pad"
            value={excellent}
            onChangeText={setExcellent}
          />
          <Text style={globalStyles.label}>Good</Text>
          <TextInput
            style={globalStyles.input}
            keyboardType="number-pad"
            value={good}
            onChangeText={setGood}
          />
          <Text style={globalStyles.label}>Fair</Text>
          <TextInput
            style={globalStyles.input}
            keyboardType="number-pad"
            value={fair}
            onChangeText={setFair}
          />
          <Text style={globalStyles.label}>Needs improvement</Text>
          <TextInput
            style={globalStyles.input}
            keyboardType="number-pad"
            value={poor}
            onChangeText={setPoor}
          />
          <Text style={globalStyles.subtitle}>
            Calculated: {rubricPreview.calculatedScore} / 20
          </Text>
        </>
      ) : (
        <>
          <Text style={globalStyles.label}>Score (0–20)</Text>
          <TextInput
            style={globalStyles.input}
            keyboardType="number-pad"
            value={score}
            onChangeText={setScore}
          />
        </>
      )}
      <BrutalButton title="Submit score" onPress={onSubmit} loading={loading} />
    </View>
  )
}
