export function percentTextClass(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 'kpi-zero'
  if (n < 40) return 'kpi-fail'
  if (n < 70) return 'kpi-warn'
  return 'kpi-pass'
}

export function percentColor(value) {
  return percentTextClass(value)
}
