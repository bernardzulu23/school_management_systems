import { useEffect, useState } from 'react'
import { FlatList, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { searchSchools, validateSubdomain } from '@/api/schools'
import { BrutalButton } from '@/components/BrutalButton'
import { setSchoolContext, getSubdomain } from '@/storage/secure'
import { globalStyles } from '@/theme/styles'
import type { SchoolSummary } from '@/types'

export default function SchoolSelectScreen() {
  const [subdomain, setSubdomain] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SchoolSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onValidate() {
    setError(null)
    setLoading(true)
    try {
      const school = await validateSubdomain(subdomain)
      await setSchoolContext(school.subdomain, school.name, school.logoUrl ?? null)
      router.push({ pathname: '/(auth)/login', params: { subdomain: school.subdomain } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'School not found')
    } finally {
      setLoading(false)
    }
  }

  async function onSearch() {
    if (query.trim().length < 2) return
    setLoading(true)
    try {
      setResults(await searchSchools(query))
    } finally {
      setLoading(false)
    }
  }

  async function pickSchool(school: SchoolSummary) {
    setSubdomain(school.subdomain)
    await setSchoolContext(school.subdomain, school.name, school.logoUrl ?? null)
    router.push({ pathname: '/(auth)/login', params: { subdomain: school.subdomain } })
  }

  useEffect(() => {
    getSubdomain().then((s) => {
      if (s) setSubdomain(s)
    })
  }, [])

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Your school</Text>
      <Text style={globalStyles.subtitle}>Enter the subdomain from your school portal URL.</Text>
      <Text style={globalStyles.label}>Subdomain</Text>
      <TextInput
        style={globalStyles.input}
        placeholder="e.g. stmaryschristian"
        autoCapitalize="none"
        value={subdomain}
        onChangeText={setSubdomain}
      />
      {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}
      <BrutalButton title="Continue" onPress={onValidate} loading={loading} />

      <Text style={[globalStyles.label, { marginTop: 24 }]}>Or search by name</Text>
      <TextInput
        style={globalStyles.input}
        placeholder="School name"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={onSearch}
      />
      <BrutalButton title="Search" variant="secondary" onPress={onSearch} loading={loading} />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        style={{ marginTop: 12 }}
        renderItem={({ item }) => (
          <BrutalButton
            title={item.name}
            variant="ghost"
            onPress={() => pickSchool(item)}
            style={{ marginBottom: 8 }}
          />
        )}
      />
    </View>
  )
}
