/**
 * Role-aware staff chat entry points (UI discoverability).
 * Teacher/HOD → generative; Headteacher/admin → retrieval-only analytics.
 */

export function resolveAiChatHref(role) {
  const r = String(role || '')
    .trim()
    .toLowerCase()
  if (r === 'hod') return '/dashboard/hod/chat'
  if (r === 'headteacher' || r === 'administrator' || r === 'admin') {
    return '/dashboard/headteacher/chat'
  }
  return '/dashboard/teacher/chat'
}

export function resolveAiChatLabel(role) {
  const r = String(role || '')
    .trim()
    .toLowerCase()
  if (r === 'headteacher' || r === 'administrator' || r === 'admin') {
    return {
      name: 'Analytics Assistant',
      description: 'Ask about enrollment, attendance, exams, and teacher coverage (retrieval-only)',
    }
  }
  return {
    name: 'AI Assistant',
    description: 'School-grounded chat for teaching help, lesson plans, and human support handoff',
  }
}
