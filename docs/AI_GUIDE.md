# ZSMS AI Guide

All AI features use **Groq** (free tier) via the **Vercel AI SDK** (`ai` + `@ai-sdk/groq`), with automatic **multi-stage fallback** through `lib/ai/provider-fallback.ts`: **Groq → Gemini → OpenRouter → OpenAI → HuggingFace**. Quiz maker and other structured routes use Groq `generateObject` first, then the full chain with JSON parsing (`lib/ai/client.js`).

## Cost

| Item             | Cost                                                   |
| ---------------- | ------------------------------------------------------ |
| `ai` npm package | Free (MIT)                                             |
| `@ai-sdk/groq`   | Free (MIT)                                             |
| Groq API         | Free up to ~14,400 requests/day on free tier           |
| Default model    | `llama-3.3-70b-versatile` (override with `GROQ_MODEL`) |

Set `GROQ_API_KEY` (and optionally `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `HUGGINGFACE_API_KEY`) in `.env` / Vercel. Default Gemini model is `gemini-2.0-flash` (override with `GEMINI_MODEL`).

## Architecture

```
API route / lib feature
        ↓
lib/ai/client.js     ← streamAIText | generateAIText | generateAIObject
        ↓
@ai-sdk/groq         ← Groq API
        ↓
lib/ai/schemas.js    ← Zod validation (structured outputs)
```

Legacy code may still import `@/lib/ai/groq-client` — it delegates to `client.js`.

### Structured JSON (`generateAIObject`)

Free-tier Groq models such as `llama-3.3-70b-versatile` do **not** support API-level `json_schema`. The client sets:

- `mode: 'json'` (json_object)
- `providerOptions.groq.structuredOutputs: false`

Zod still validates the parsed object on our side. If you see a `json_schema` error in production, redeploy with the latest `lib/ai/client.js`.

## AI features

| Feature                  | Route / module                    | Mode                                                                           | Schema                   |
| ------------------------ | --------------------------------- | ------------------------------------------------------------------------------ | ------------------------ |
| Lesson planner (stream)  | `POST /api/ai/lesson-planner`     | Stream prose via `aiChain` (Groq → Gemini → OpenRouter → OpenAI → HuggingFace) | —                        |
| Professional lesson plan | `POST /api/lesson-plans/generate` | Structured (default)                                                           | `LessonPlanSchema`       |
| Ministry plain-text plan | Same route, `format=ministry`     | Text                                                                           | —                        |
| Quiz maker               | `POST /api/ai/quiz-maker`         | Structured                                                                     | `QuizSchema`             |
| ECZ practice             | `POST /api/ai/ecz-practice`       | Structured                                                                     | `ECZPracticePaperSchema` |
| Story weaver             | `POST /api/ai/story-weaver`       | Stream                                                                         | —                        |
| Report comments          | `POST /api/ai/report-comments`    | Stream                                                                         | —                        |
| Phonics / Zambia helpers | `lib/ai/zambia-features.js`       | Text                                                                           | —                        |
| Legacy aiml tools        | `lib/aiml/tools/*`                | Mixed                                                                          | Quiz / ECZ schemas       |

Structured lesson plans are stored on `LessonPlan.structuredContent` (JSON) plus plain `content` for display.

## Adding a new AI feature

1. **Define a Zod schema** in `lib/ai/schemas.js` (or extend an existing one).
2. **Build prompts** in a feature module (e.g. `lib/ai/my-feature.js`).
3. **Call the client:**

```javascript
import { generateAIObject } from '@/lib/ai/client'
import { MySchema } from '@/lib/ai/schemas'

const SYSTEM = 'You are a Zambian curriculum expert...'

export async function generateMyFeature(input) {
  const userPrompt = `Subject: ${input.subject}...`
  const { object, usage } = await generateAIObject(MySchema, SYSTEM, userPrompt, {
    maxTokens: 3000,
    temperature: 0.5,
  })
  return { data: object, tokensUsed: usage.outputTokens }
}
```

4. **Wire an API route** with auth, `requireFeature`, `checkAILimit`, and `trackAIUsage` (copy from `app/api/ai/quiz-maker/route.ts`).
5. **Log** via `prisma.aIRequest.create` for audit.

For **streaming prose** (long markdown/text):

```javascript
import { createGroqTextEventStream, GROQ_SSE_HEADERS } from '@/lib/ai/groq-client'

const stream = createGroqTextEventStream({ prompt, maxTokens: 4000 })
return new Response(stream, { headers: GROQ_SSE_HEADERS })
```

## Schema reference

| Schema                           | Purpose                                              |
| -------------------------------- | ---------------------------------------------------- |
| `LessonPlanSchema`               | CBC lesson plan (objectives, activities, assessment) |
| `RubricSchema` / `SBATaskSchema` | ECZ SBA rubrics and tasks                            |
| `ECZExamQuestionSchema`          | Secondary scenario-based exam items                  |
| `QuizSchema`                     | Formative quizzes                                    |
| `ECZPracticePaperSchema`         | Multi-level ECZ practice papers                      |
| `ReportCommentSchema`            | End-of-term report comments                          |

Full field definitions: `lib/ai/schemas.js`.

## Debugging failures

1. **Missing key** — `assertGroqConfigured()` → 500 "Service not configured". Check `GROQ_API_KEY`.
2. **Validation errors** — `generateAIObject` retries 3 times; then throws `AI generation failed: ...`. Check Sentry (`captureError`) and server logs (`AI:generateObject`).
3. **Rate limits** — Groq free tier daily cap; `checkAILimit` / plan gates on routes.
4. **502 invalid JSON** — Usually schema mismatch; relax Zod `.min()` or improve the system prompt.
5. **Stream stalls** — Client expects SSE `data: {"text":"..."}` and `data: [DONE]` (see `createGroqTextEventStream`).

## Do not install

- `@ai-sdk/openai`
- `@ai-sdk/anthropic`
- Other paid provider SDKs

`groq-sdk` remains in the project for now but new code should use `@/lib/ai/client`.

## Related docs

- `docs/TESTING.md` — mock `GROQ_API_KEY` in Vitest setup
- `docs/ENVIRONMENT.md` — env vars
- `docs/DEVELOPER_GUIDE.md` — API route template
