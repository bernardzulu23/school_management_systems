function buildAliases(name) {
  const raw = String(name || '').trim()
  if (!raw) return []

  const lower = raw.toLowerCase()
  const aliases = new Set([raw])

  if (lower === 'arts and design') aliases.add('Art and Design')
  if (lower === 'art and design') aliases.add('Arts and Design')

  if (lower === 'natural sciences') aliases.add('Natural Science')
  if (lower === 'natural science') aliases.add('Natural Sciences')

  if (lower.endsWith(' sciences')) aliases.add(raw.replace(/ sciences$/i, ' Science'))
  if (lower.endsWith(' science')) aliases.add(raw.replace(/ science$/i, ' Sciences'))

  return Array.from(aliases)
}

export async function resolveDepartmentScope({ prisma, schoolId, departmentId, departmentName }) {
  const ids = new Set([departmentId].filter(Boolean).map(String))
  const name = String(departmentName || '').trim()
  const aliases = buildAliases(name)

  if (aliases.length > 0) {
    const byName = await prisma.department.findMany({
      where: {
        schoolId,
        OR: aliases.map((a) => ({ name: { equals: String(a), mode: 'insensitive' } })),
      },
      select: { id: true, name: true },
      take: 2000,
    })
    byName.forEach((d) => ids.add(String(d.id)))
  }

  const effectiveName = aliases.length > 0 ? aliases[0] : name

  return {
    departmentIds: Array.from(ids),
    departmentName: effectiveName,
    departmentNameAliases: aliases,
  }
}
