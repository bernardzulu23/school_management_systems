/**
 * Schedule work to run after the HTTP response is sent.
 * On Vercel, plain fire-and-forget promises are often frozen/killed when the
 * serverless invocation ends — so attendance SMS never reaches Africa's Talking.
 */
import { after } from 'next/server'

/**
 * @param {() => void | Promise<void>} task
 */
export function runAfterResponse(task) {
  const run = async () => {
    try {
      await task()
    } catch (err) {
      console.error('[runAfterResponse]', err?.message || err)
    }
  }

  try {
    after(run)
  } catch (err) {
    // Outside a request context (scripts/tests) — still run the work.
    console.warn('[runAfterResponse] after() unavailable, running inline', err?.message || err)
    void run()
  }
}
