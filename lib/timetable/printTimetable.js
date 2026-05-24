/** Print only the timetable grid — hides dashboard chrome via body.print-timetable. */

export function printTimetable(selector = '.timetable-container') {
  if (typeof window === 'undefined') return

  const el = document.querySelector(selector)
  if (!el) {
    window.print()
    return
  }

  document.body.classList.add('print-timetable')
  const cleanup = () => {
    document.body.classList.remove('print-timetable')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}
