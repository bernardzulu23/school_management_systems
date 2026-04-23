async function testConnection() {
  try {
    const { existsSync, readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')

    const loadEnvFile = (filename: string) => {
      const fullPath = resolve(process.cwd(), filename)
      if (!existsSync(fullPath)) return
      const raw = readFileSync(fullPath, 'utf-8')
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        let val = trimmed.slice(eq + 1).trim()
        if (!key) continue
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1)
        }
        if (process.env[key] === undefined) process.env[key] = val
      }
    }

    loadEnvFile('.env.local')
    loadEnvFile('.env')

    const { default: OpenAI } = await import('openai')
    const apiKey = String(process.env.AIML_API_KEY || '').trim()
    const baseRaw = String(process.env.AIML_API_BASE || '')
      .trim()
      .replace(/\/+$/, '')
    const baseURL = baseRaw ? (baseRaw.endsWith('/v1') ? baseRaw : `${baseRaw}/v1`) : ''
    if (!apiKey) throw new Error('Missing AIML_API_KEY (set it in your shell or .env.local)')
    if (!baseURL) throw new Error('Missing AIML_API_BASE (set it in your shell or .env.local)')

    const client = new OpenAI({
      apiKey,
      baseURL,
    })

    const model = String(process.env.AIML_CHAT_MODEL || '').trim() || 'claude-sonnet-4-6'

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: "Say 'Connection successful'" }],
    })
    console.log('✅ Connection successful:', response.choices[0]?.message?.content)
  } catch (error) {
    const err: any = error
    if (err?.status === 404) {
      try {
        const { default: OpenAI } = await import('openai')
        const apiKey = String(process.env.AIML_API_KEY || '').trim()
        const baseRaw = String(process.env.AIML_API_BASE || '')
          .trim()
          .replace(/\/+$/, '')
        const baseURL = baseRaw ? (baseRaw.endsWith('/v1') ? baseRaw : `${baseRaw}/v1`) : ''
        const client = new OpenAI({ apiKey, baseURL })

        const models = await client.models.list()
        const ids =
          (models as any)?.data?.map((m: any) => String(m?.id || '')).filter(Boolean) || []
        const claude = ids.filter((id: string) => /claude/i.test(id)).slice(0, 15)
        const gpt = ids.filter((id: string) => /gpt|openai\//i.test(id)).slice(0, 15)
        console.error('❌ Connection failed: model not found.')
        if (claude.length) console.error('Claude-like models:', claude.join(', '))
        if (gpt.length) console.error('OpenAI-like models:', gpt.join(', '))
        console.error('Set AIML_CHAT_MODEL to one of the above model IDs and re-run this script.')
        return
      } catch {}
    }

    console.error('❌ Connection failed:', error)
  }
}

testConnection()
