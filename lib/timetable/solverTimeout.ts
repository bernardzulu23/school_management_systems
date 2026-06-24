/**
 * Tiered solver timeout with Vercel function duration cap.
 */
export function computeMaxExecutionMs(lessonCount: number, explicitMs?: number): number {
  const rawEnv =
    process.env.VERCEL_FUNCTION_TIMEOUT ||
    process.env.VERCEL_MAX_DURATION ||
    process.env.AWS_LAMBDA_FUNCTION_TIMEOUT ||
    ''
  const envSeconds = Number(rawEnv)
  const vercelCapMs =
    Number.isFinite(envSeconds) && envSeconds > 0
      ? Math.max(1000, Math.floor(envSeconds * 1000) - 500)
      : 60_000

  let tiered = 8000
  if (lessonCount > 200) tiered = 25_000
  else if (lessonCount > 100) tiered = 15_000
  else if (lessonCount > 50) tiered = 10_000

  if (explicitMs != null && Number.isFinite(Number(explicitMs))) {
    return Math.min(vercelCapMs, Math.max(1000, Number(explicitMs)))
  }
  return Math.min(vercelCapMs, tiered)
}
