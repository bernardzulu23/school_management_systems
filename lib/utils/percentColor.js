export function percentTextClass(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 'text-gray-400'
  if (n < 40) return 'text-red-400'
  if (n < 70) return 'text-amber-400'
  return 'text-green-400'
}
