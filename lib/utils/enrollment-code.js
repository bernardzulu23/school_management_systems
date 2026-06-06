const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateEnrollmentCode(length = 6) {
  return Array.from({ length }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}

/**
 * Create school with unique enrollmentCode; retries on P2002 collision.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {(code: string) => object} buildData - receives enrollmentCode, returns create data
 */
export async function createSchoolWithEnrollmentCode(prisma, buildData, maxAttempts = 3) {
  let lastError
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const enrollmentCode = generateEnrollmentCode()
    try {
      return await prisma.school.create({
        data: buildData(enrollmentCode),
      })
    } catch (e) {
      lastError = e
      if (String(e?.code) !== 'P2002' || attempt === maxAttempts - 1) throw e
    }
  }
  throw lastError
}
